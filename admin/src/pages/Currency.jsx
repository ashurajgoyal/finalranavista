import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowRightLeft, ArrowUpRight, RefreshCw } from 'lucide-react';
import api, { errMsg } from '../lib/api';
import { useFx } from '../lib/currency';
import { dateTime, timeAgo } from '../lib/format';
import { Alert, Button, Card, Field, Input, PageHeader, PageLoader, Select, cx } from '../components/ui';

const nf = (n, d = 4) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const inrFmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Change({ now, then }) {
  if (!then || !now) return <span className="text-ink-medium">—</span>;
  // rates are "per USD": a rising number means that currency got weaker vs USD
  const pct = ((now - then) / then) * 100;
  const up = pct > 0;
  if (Math.abs(pct) < 0.005) return <span className="text-ink-medium">0.00%</span>;
  return (
    <span className={cx('inline-flex items-center gap-0.5 font-medium', up ? 'text-danger' : 'text-[#1e7b34]')} title={up ? 'Weaker against USD' : 'Stronger against USD'}>
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(pct).toFixed(2)}%
    </span>
  );
}

function Spark({ values }) {
  if (values.length < 2) return <span className="text-xs text-ink-medium">collecting…</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${max === min ? 50 : 100 - ((v - min) / (max - min)) * 100}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-8 w-28" aria-hidden>
      <polyline points={pts} fill="none" stroke="#0D3B32" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function Currency() {
  const { data, setData } = useFx();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [conv, setConv] = useState({ amount: '1000', from: 'USD', to: 'INR' });

  const history = useMemo(() => data?.history || [], [data]);
  const ago = (days) => {
    if (!history.length) return null;
    const target = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    const h = [...history].reverse().find((x) => x.day <= target);
    return h?.rates;
  };

  if (!data) return <PageLoader />;
  const r = data.rates;
  const y1 = ago(1);
  const d7 = ago(7);
  const d30 = ago(30) || history[0]?.rates;
  const codes = Object.keys(r).sort();
  const result = (Number(conv.amount || 0) / (r[conv.from] || 1)) * (r[conv.to] || 1);

  const refresh = async () => {
    setBusy(true); setErr('');
    try { const { data: d } = await api.post('/admin/fx/refresh'); setData(d); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Currency rates" subtitle="Live exchange rates used across Manage — every amount is shown in USD and INR."
        actions={<Button variant="outline" onClick={refresh} loading={busy}><RefreshCw className="h-4 w-4" /> Refresh now</Button>} />
      {err && <Alert type="error" className="mb-4">{err}</Alert>}
      {data.stale && <Alert type="warning" className="mb-4">Rates could not be refreshed recently{data.lastError ? ` (${data.lastError})` : ''}. Showing the last saved rates{data.fetchedAt ? ` from ${dateTime(data.fetchedAt)}` : ' (fallback from .env)'}.</Alert>}

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="bg-hero card-pad text-white">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-light">US Dollar → Indian Rupee</p>
          <p className="mt-2 font-serif text-5xl">₹{inrFmt(r.INR)}</p>
          <p className="mt-1 text-sm text-white/70">for $1 · ₹1 = ${nf(1 / r.INR, 5)}</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-white/80">
            <span>24h <Change now={r.INR} then={y1?.INR} /></span>
            <span>7 days <Change now={r.INR} then={d7?.INR} /></span>
            <span>30 days <Change now={r.INR} then={d30?.INR} /></span>
          </div>
          <p className="mt-4 text-xs text-white/50">Source: {data.source} · fetched {data.fetchedAt ? timeAgo(data.fetchedAt) : 'never'}{data.providerUpdatedAt ? ` · provider updated ${dateTime(data.providerUpdatedAt)}` : ''}</p>
        </Card>
        <Card className="card-pad">
          <h2 className="flex items-center gap-2 text-lg text-forest"><ArrowRightLeft className="h-4 w-4 text-gold" /> Converter</h2>
          <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
            <Field label="Amount"><Input type="number" min="0" value={conv.amount} onChange={(e) => setConv({ ...conv, amount: e.target.value })} /></Field>
            <Field label="From"><Select value={conv.from} onChange={(e) => setConv({ ...conv, from: e.target.value })} options={codes} /></Field>
          </div>
          <div className="mt-3 flex items-end gap-3">
            <button type="button" onClick={() => setConv({ ...conv, from: conv.to, to: conv.from })} className="mb-1 rounded-lg p-2 text-ink-medium ring-1 ring-line hover:bg-cream" aria-label="Swap"><ArrowRightLeft className="h-4 w-4" /></button>
            <Field label="To" className="flex-1"><Select value={conv.to} onChange={(e) => setConv({ ...conv, to: e.target.value })} options={codes} /></Field>
          </div>
          <p className="mt-4 rounded-lg bg-cream px-4 py-3 font-serif text-2xl text-forest">
            {Number(result).toLocaleString(conv.to === 'INR' ? 'en-IN' : 'en-US', { maximumFractionDigits: ['JPY', 'VND', 'IDR', 'KRW', 'KHR', 'LAK'].includes(conv.to) ? 0 : 2 })} <span className="text-base text-ink-medium">{conv.to}</span>
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mist px-6 py-4">
          <h2 className="text-lg text-forest">Country currencies</h2>
          <span className="text-xs text-ink-medium">Refreshed automatically every few hours</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Country / region</th><th>Currency</th><th className="text-right">1 unit in INR</th><th className="text-right">1 unit in USD</th><th className="text-right">1 USD =</th><th className="text-right">24h</th><th className="text-right">7d</th><th>30-day trend (vs INR)</th></tr></thead>
            <tbody>
              {data.tracked.map((c) => {
                const perUsd = r[c.code];
                const inINR = r.INR / perUsd;
                const crossThen = (h) => (h?.[c.code] && h?.INR ? h.INR / h[c.code] : null);
                const trend = history.map((h) => (h.rates[c.code] && h.rates.INR ? h.rates.INR / h.rates[c.code] : null)).filter(Boolean);
                return (
                  <tr key={c.code}>
                    <td><span className="mr-2 text-xl" aria-hidden>{c.flag}</span><span className="font-medium">{c.country}</span></td>
                    <td>{c.name} <span className="text-xs text-ink-medium">({c.code})</span></td>
                    <td className="text-right font-serif text-lg">{c.code === 'INR' ? '₹1.00' : `₹${inrFmt(inINR)}`}</td>
                    <td className="text-right">${nf(1 / perUsd, c.code === 'JPY' ? 6 : 4)}</td>
                    <td className="text-right text-ink-medium">{nf(perUsd, c.code === 'JPY' ? 2 : 4)} {c.code}</td>
                    {/* change of the currency's INR value — rising = stronger vs INR */}
                    <td className="text-right">{c.code === 'INR' ? '—' : <Change now={1 / inINR} then={crossThen(y1) ? 1 / crossThen(y1) : null} />}</td>
                    <td className="text-right">{c.code === 'INR' ? '—' : <Change now={1 / inINR} then={crossThen(d7) ? 1 / crossThen(d7) : null} />}</td>
                    <td>{c.code === 'INR' ? '—' : <Spark values={trend} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-mist px-6 py-3 text-xs text-ink-medium">Green = the currency got stronger against the rupee, red = weaker. History builds up one snapshot per day from the first time the server runs.</p>
      </Card>
    </>
  );
}
