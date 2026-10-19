import { FxHistory, FxRate } from '../models/Fx.js';
import env from '../config/env.js';

/*
 * Live currency rates for the admin panel (USD ↔ INR everywhere, plus the "Currency rates" page).
 *
 *  - Free providers, no API key:  open.er-api.com  →  fallback api.frankfurter.app (ECB)
 *  - Cached in MongoDB and in memory; refreshed every 3 hours by the job scheduler and on demand.
 *  - If every provider is down we keep serving the last cached rates (marked "stale"),
 *    and if nothing was ever fetched we fall back to INR_PER_USD from .env.
 *
 * All rates are "units per 1 USD".
 */

export const TRACKED = [
  { code: 'USD', name: 'US Dollar', country: 'United States', flag: '🇺🇸', symbol: '$' },
  { code: 'INR', name: 'Indian Rupee', country: 'India', flag: '🇮🇳', symbol: '₹' },
  { code: 'EUR', name: 'Euro', country: 'Europe (Eurozone)', flag: '🇪🇺', symbol: '€' },
  { code: 'GBP', name: 'British Pound', country: 'United Kingdom', flag: '🇬🇧', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', country: 'Canada', flag: '🇨🇦', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', country: 'Australia', flag: '🇦🇺', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', country: 'Japan', flag: '🇯🇵', symbol: '¥' },
  { code: 'AED', name: 'UAE Dirham', country: 'United Arab Emirates', flag: '🇦🇪', symbol: 'د.إ' },
];
// Extra currencies kept for conversions (sourcing requests can be priced in these)
const EXTRA = ['CNY', 'VND', 'IDR', 'MYR', 'THB', 'KHR', 'LAK', 'ZAR', 'BRL', 'OMR', 'KRW', 'TRY', 'SGD', 'CHF', 'SAR'];
export const CODES = [...TRACKED.map((c) => c.code), ...EXTRA];

// Rough last-resort values, used only if no provider has EVER answered (first boot offline).
const FALLBACK = { USD: 1, INR: env.inrPerUsd, EUR: 0.92, GBP: 0.78, CAD: 1.37, AUD: 1.52, JPY: 150, AED: 3.6725, CNY: 7.2, VND: 25400, IDR: 16000, MYR: 4.5, THB: 35, KHR: 4050, LAK: 21500, ZAR: 18, BRL: 5.5, OMR: 0.385, KRW: 1380, TRY: 34, SGD: 1.34, CHF: 0.88, SAR: 3.75 };

const STALE_MS = 6 * 3600 * 1000;
let cache = null; // { rates, source, fetchedAt, providerUpdatedAt }
let inflight = null;

const pick = (all) => Object.fromEntries(CODES.filter((c) => Number(all?.[c]) > 0).map((c) => [c, Number(all[c])]));

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

const PROVIDERS = [
  {
    name: 'open.er-api.com',
    async load() {
      const j = await getJson('https://open.er-api.com/v6/latest/USD');
      if (j.result !== 'success' || !j.rates) throw new Error('open.er-api.com: bad response');
      return { rates: pick(j.rates), providerUpdatedAt: j.time_last_update_unix ? new Date(j.time_last_update_unix * 1000) : new Date() };
    },
  },
  {
    name: 'frankfurter.app',
    async load() {
      const j = await getJson('https://api.frankfurter.app/latest?from=USD');
      if (!j.rates) throw new Error('frankfurter.app: bad response');
      const rates = pick({ ...j.rates, USD: 1 });
      // ECB doesn't publish AED/OMR/SAR — they are pegged to USD
      rates.AED ||= 3.6725; rates.OMR ||= 0.3845; rates.SAR ||= 3.75;
      return { rates, providerUpdatedAt: j.date ? new Date(`${j.date}T16:00:00Z`) : new Date() };
    },
  },
];

function fromDoc(doc) {
  if (!doc) return null;
  const rates = Object.fromEntries(doc.rates instanceof Map ? doc.rates : Object.entries(doc.rates || {}));
  return { rates, source: doc.source, fetchedAt: doc.fetchedAt, providerUpdatedAt: doc.providerUpdatedAt, lastError: doc.lastError, lastErrorAt: doc.lastErrorAt };
}

/** Fetch from providers now. Never throws — returns the (possibly unchanged) cached rates. */
export async function refreshRates() {
  if (inflight) return inflight;
  inflight = (async () => {
    const errors = [];
    for (const p of PROVIDERS) {
      try {
        const { rates, providerUpdatedAt } = await p.load();
        if (!rates.INR) throw new Error(`${p.name}: INR missing`);
        rates.USD = 1;
        const now = new Date();
        const doc = await FxRate.findOneAndUpdate(
          { _id: 'latest' },
          { rates, source: p.name, providerUpdatedAt, fetchedAt: now, $unset: { lastError: 1, lastErrorAt: 1 } },
          { upsert: true, new: true }
        );
        await FxHistory.updateOne({ day: now.toISOString().slice(0, 10) }, { rates }, { upsert: true });
        cache = fromDoc(doc);
        return cache;
      } catch (e) {
        errors.push(e.message);
      }
    }
    const msg = errors.join(' | ');
    console.warn('⚠  Currency refresh failed:', msg);
    await FxRate.updateOne({ _id: 'latest' }, { lastError: msg.slice(0, 500), lastErrorAt: new Date() }, { upsert: true }).catch(() => {});
    if (!cache) cache = fromDoc(await FxRate.findById('latest').lean());
    return cache;
  })().finally(() => { inflight = null; });
  return inflight;
}

/** Load cache from DB on boot, then refresh if old. */
export async function initRates() {
  cache = fromDoc(await FxRate.findById('latest').lean());
  if (!cache?.fetchedAt || Date.now() - new Date(cache.fetchedAt).getTime() > STALE_MS / 2) await refreshRates();
}

/** Current rates (always returns something usable). */
export function currentRates() {
  const ok = cache?.rates?.INR > 0;
  const rates = { ...FALLBACK, ...(ok ? cache.rates : {}) };
  const fetchedAt = ok ? cache.fetchedAt : null;
  return {
    base: 'USD',
    rates,
    source: ok ? cache.source : 'fallback (.env INR_PER_USD)',
    fetchedAt,
    providerUpdatedAt: ok ? cache.providerUpdatedAt : null,
    stale: !fetchedAt || Date.now() - new Date(fetchedAt).getTime() > STALE_MS,
    lastError: cache?.lastError,
    lastErrorAt: cache?.lastErrorAt,
  };
}

/** INR per 1 USD right now. */
export const inrPerUsd = () => currentRates().rates.INR;

/** Convert between any two tracked currencies. */
export function convert(amount, from = 'USD', to = 'INR', rates = currentRates().rates) {
  const a = Number(amount || 0);
  if (from === to) return a;
  const f = rates[from] || 1;
  const t = rates[to] || 1;
  return (a / f) * t;
}
export const toUsd = (amount, currency = 'USD') => convert(amount, currency, 'USD');

/** Daily history for the admin trend table. */
export async function rateHistory(days = 30) {
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const list = await FxHistory.find({ day: { $gte: since } }).sort('day').lean();
  return list.map((h) => ({ day: h.day, rates: Object.fromEntries(Object.entries(h.rates || {})) }));
}
