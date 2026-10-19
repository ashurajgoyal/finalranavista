import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Plus, X } from 'lucide-react';
import { CATEGORIES, CERTIFICATIONS, COMPANY_TYPES, COMPLIANCE_AUDITS, COUNTRIES, TURNOVER_CURRENCIES } from '../lib/format';
import GeoSelect from './GeoSelect';
import { Alert, Button, Field, Input, Select, Textarea, cx } from './ui';

export const blankSupplier = (seed = {}) => ({
  companyName: '', contactName: '', contactNumber: '', email: '', companyType: '', establishedYear: '', gst: '', website: '',
  country: 'India', state: '', city: '', postalCode: '', address: '', factoryAddress: '', sameFactory: false,
  turnover: { amount: '', currency: 'INR' }, employees: '', factoryUnits: '', productionCapacity: '', containerSize: '40ft',
  productCategoriesCount: '', skuCount: '', categories: [], description: '',
  exportingSince: '', exportMarkets: [], certifications: [], compliance: { status: '', audits: [], details: '' },
  ...seed,
});

/** Turn a saved application back into form state. */
export const fromApplication = (a) => blankSupplier({
  ...a, establishedYear: a.establishedYear ?? '', employees: a.employees ?? '', factoryUnits: a.factoryUnits ?? '', productionCapacity: a.productionCapacity ?? '',
  productCategoriesCount: a.productCategoriesCount ?? '', skuCount: a.skuCount ?? '', exportingSince: a.exportingSince ?? '',
  turnover: { amount: a.turnover?.amount ?? '', currency: a.turnover?.currency || 'INR' }, compliance: { status: '', audits: [], details: '', ...(a.compliance || {}) },
  sameFactory: !!a.address && a.address === a.factoryAddress,
});

const YEAR = new Date().getFullYear();

/** Searchable multi-select shown as chips. allowCustom lets users add their own value. */
function ChipPicker({ options, value, onChange, placeholder, allowCustom = false, max = 80 }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => options.filter((o) => !value.includes(o) && o.toLowerCase().includes(q.toLowerCase())).slice(0, 40), [options, value, q]);
  const add = (o) => { if (o && !value.includes(o) && value.length < max) onChange([...value, o]); setQ(''); };
  return (
    <div className="rounded-lg border border-line bg-white p-2 focus-within:border-forest focus-within:ring-4 focus-within:ring-forest/10">
      <div className="flex flex-wrap gap-1.5">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-forest px-2.5 py-1 text-xs text-white">{v}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`Remove ${v}`}><X className="h-3 w-3" /></button>
          </span>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={value.length ? 'Add more…' : placeholder}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (list[0]) add(list[0]); else if (allowCustom && q.trim()) add(q.trim()); } }}
          className="min-w-[140px] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-slate" />
      </div>
      {(q || !value.length) && (list.length > 0 || (allowCustom && q.trim())) && (
        <div className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto border-t border-mist pt-2">
          {list.map((o) => <button key={o} type="button" onClick={() => add(o)} className="rounded-full border border-line px-2.5 py-1 text-xs text-ink transition hover:border-gold">{o}</button>)}
          {allowCustom && q.trim() && !options.some((o) => o.toLowerCase() === q.trim().toLowerCase()) && (
            <button type="button" onClick={() => add(q.trim())} className="inline-flex items-center gap-1 rounded-full border border-dashed border-gold px-2.5 py-1 text-xs text-gold-dark"><Plus className="h-3 w-3" />Add “{q.trim()}”</button>
          )}
        </div>
      )}
    </div>
  );
}

const STEPS = [
  { key: 'company', title: 'Company', fields: [['companyName', 'Company name'], ['contactName', 'Contact person'], ['contactNumber', 'Contact number'], ['email', 'Email'], ['companyType', 'Company type'], ['establishedYear', 'Established year'], ['gst', 'GST / tax number']] },
  { key: 'location', title: 'Location', fields: [['country', 'Country'], ['state', 'State'], ['city', 'City'], ['address', 'Address'], ['factoryAddress', 'Factory address']] },
  { key: 'capacity', title: 'Factory & capacity', fields: [['turnover.amount', 'Company turnover'], ['employees', 'No. of employees'], ['factoryUnits', 'No. of factory units'], ['productionCapacity', 'Production capacity'], ['productCategoriesCount', 'Number of product categories'], ['skuCount', 'Number of SKUs']] },
  { key: 'export', title: 'Export & compliance', fields: [['exportingSince', 'Exporting since'], ['exportMarkets', 'Export markets'], ['certifications', 'Certification'], ['compliance.status', 'Factory compliance']] },
];
const get = (o, p) => p.split('.').reduce((v, k) => v?.[k], o);

/**
 * Supplier registration form (all business fields required) as a 4-step wizard.
 * `accountStep` (optional node) is shown as an extra first step — used on the sign-up page.
 */
export default function SupplierForm({ value, onChange, onSubmit, busy, error, submitLabel = 'Submit registration', accountStep, validateAccount }) {
  const steps = accountStep ? [{ key: 'account', title: 'Account', fields: [] }, ...STEPS] : STEPS;
  const [i, setI] = useState(0);
  const [stepErr, setStepErr] = useState('');
  const v = value;
  const set = (k) => (e) => onChange({ ...v, [k]: e.target.value });
  const setDeep = (k, sub) => (e) => onChange({ ...v, [k]: { ...v[k], [sub]: e.target.value } });

  const check = (idx) => {
    const st = steps[idx];
    if (st.key === 'account') return validateAccount?.() || '';
    const vv = { ...v, factoryAddress: v.sameFactory ? v.address : v.factoryAddress };
    const missing = st.fields.filter(([k]) => { const x = get(vv, k); return Array.isArray(x) ? !x.length : x === '' || x == null; }).map(([, l]) => l);
    if (missing.length) return `Please fill in: ${missing.join(', ')}.`;
    if (st.key === 'company' && (Number(v.establishedYear) < 1800 || Number(v.establishedYear) > YEAR)) return 'Company established year looks wrong.';
    if (st.key === 'export' && (Number(v.exportingSince) < 1800 || Number(v.exportingSince) > YEAR)) return '“Exporting since” year looks wrong.';
    if (st.key === 'export' && v.compliance.status === 'certified' && !v.compliance.audits.length) return 'Select which compliance audits / certificates your factory holds.';
    return '';
  };
  const go = (to) => {
    if (to > i) { const e = check(i); if (e) { setStepErr(e); return; } }
    setStepErr(''); setI(to); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const submit = (e) => {
    e.preventDefault();
    if (i < steps.length - 1) return go(i + 1);
    for (let s = 0; s < steps.length; s += 1) { const err = check(s); if (err) { setI(s); setStepErr(err); return; } }
    setStepErr('');
    onSubmit({ ...v, factoryAddress: v.sameFactory ? v.address : v.factoryAddress });
  };
  const key = steps[i].key;

  return (
    <form onSubmit={submit} noValidate>
      <ol className="mb-6 flex items-center gap-1.5">
        {steps.map((s, n) => (
          <li key={s.key} className="flex flex-1 items-center gap-1.5">
            <button type="button" onClick={() => (n < i ? go(n) : n === i + 1 ? go(n) : null)} className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ring-2 transition', n < i ? 'bg-forest text-white ring-forest' : n === i ? 'bg-gold text-white ring-gold' : 'bg-white text-ink-medium ring-line')} aria-label={s.title}>
              {n < i ? <Check className="h-4 w-4" /> : n + 1}
            </button>
            <span className={cx('hidden text-xs sm:block', n === i ? 'font-medium text-forest' : 'text-ink-medium')}>{s.title}</span>
            {n < steps.length - 1 && <span className={cx('h-px flex-1', n < i ? 'bg-forest' : 'bg-line')} />}
          </li>
        ))}
      </ol>
      {(stepErr || error) && <Alert type="error" className="mb-4">{stepErr || error}</Alert>}
      <p className="mb-4 text-xs text-ink-medium">All fields are required unless marked optional.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {key === 'account' && accountStep}

        {key === 'company' && (
          <>
            <Field label="Company name" className="sm:col-span-2"><Input value={v.companyName} onChange={set('companyName')} autoComplete="organization" /></Field>
            <Field label="Contact person name"><Input value={v.contactName} onChange={set('contactName')} autoComplete="name" /></Field>
            <Field label="Contact number"><Input type="tel" value={v.contactNumber} onChange={set('contactNumber')} placeholder="+91 98xxx xxxxx" autoComplete="tel" /></Field>
            <Field label="Email address"><Input type="email" value={v.email} onChange={set('email')} autoComplete="email" /></Field>
            <Field label="Company type"><Select value={v.companyType} onChange={set('companyType')} options={COMPANY_TYPES} placeholder="Proprietorship / Partnership…" /></Field>
            <Field label="Company established in (year)"><Input type="number" min="1800" max={YEAR} value={v.establishedYear} onChange={set('establishedYear')} placeholder="e.g. 2008" /></Field>
            <Field label={v.country === 'India' ? 'GST number (GSTIN)' : 'GST / tax registration number'} hint={v.country === 'India' ? '15 characters, e.g. 08ABCDE1234F1Z5' : 'VAT / tax ID / business registration number'}>
              <Input value={v.gst} onChange={(e) => onChange({ ...v, gst: e.target.value.toUpperCase() })} maxLength={30} />
            </Field>
            <Field label="Website (optional)" className="sm:col-span-2"><Input value={v.website} onChange={set('website')} placeholder="https://" /></Field>
          </>
        )}

        {key === 'location' && (
          <>
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
              <GeoSelect value={{ country: v.country, state: v.state, city: v.city }} onChange={(g) => onChange({ ...v, ...g })} />
            </div>
            <Field label="Address (office)" className="sm:col-span-2"><Textarea rows={2} value={v.address} onChange={set('address')} autoComplete="street-address" /></Field>
            <Field label="PIN / postal code (optional)"><Input value={v.postalCode} onChange={set('postalCode')} maxLength={12} autoComplete="postal-code" /></Field>
            <label className="flex items-center gap-2 self-end pb-3 text-sm text-ink-medium"><input type="checkbox" className="accent-forest" checked={v.sameFactory} onChange={(e) => onChange({ ...v, sameFactory: e.target.checked, factoryAddress: e.target.checked ? v.address : v.factoryAddress })} /> Factory is at the same address</label>
            {!v.sameFactory && <Field label="Factory address" className="sm:col-span-2"><Textarea rows={2} value={v.factoryAddress} onChange={set('factoryAddress')} /></Field>}
          </>
        )}

        {key === 'capacity' && (
          <>
            <Field label="Company turnover (last financial year)" className="sm:col-span-2">
              <div className="flex gap-2">
                <Select value={v.turnover.currency} onChange={setDeep('turnover', 'currency')} options={TURNOVER_CURRENCIES} className="w-28" />
                <Input type="number" min="0" value={v.turnover.amount} onChange={setDeep('turnover', 'amount')} placeholder="Annual turnover" />
              </div>
            </Field>
            <Field label="No. of employees"><Input type="number" min="1" value={v.employees} onChange={set('employees')} /></Field>
            <Field label="No. of factory units"><Input type="number" min="1" value={v.factoryUnits} onChange={set('factoryUnits')} /></Field>
            <Field label="Production capacity (containers per month)" className="sm:col-span-2">
              <div className="flex gap-2">
                <Input type="number" min="0.1" step="0.1" value={v.productionCapacity} onChange={set('productionCapacity')} placeholder="e.g. 6" />
                <Select value={v.containerSize} onChange={set('containerSize')} options={[{ value: '20ft', label: '× 20 ft' }, { value: '40ft', label: '× 40 ft' }, { value: '40ft_hc', label: '× 40 ft HC' }]} className="w-36" />
              </div>
            </Field>
            <Field label="Number of product categories"><Input type="number" min="1" value={v.productCategoriesCount} onChange={set('productCategoriesCount')} /></Field>
            <Field label="Number of SKU's"><Input type="number" min="1" value={v.skuCount} onChange={set('skuCount')} /></Field>
            <div className="sm:col-span-2">
              <span className="label">Ranavista categories you manufacture</span>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c} type="button" onClick={() => onChange({ ...v, categories: v.categories.includes(c) ? v.categories.filter((x) => x !== c) : [...v.categories, c] })}
                    className={cx('rounded-full border px-3 py-1.5 text-xs transition', v.categories.includes(c) ? 'border-forest bg-forest text-white' : 'border-line bg-white text-ink hover:border-gold')}>{c}</button>
                ))}
              </div>
            </div>
            <Field label="About your company (optional)" className="sm:col-span-2"><Textarea rows={3} value={v.description} onChange={set('description')} placeholder="Products, materials, key buyers, machinery…" /></Field>
          </>
        )}

        {key === 'export' && (
          <>
            <Field label="Exporting since (year)"><Input type="number" min="1800" max={YEAR} value={v.exportingSince} onChange={set('exportingSince')} placeholder="e.g. 2012" /></Field>
            <div />
            <div className="sm:col-span-2"><span className="label">Export markets</span><ChipPicker options={COUNTRIES} value={v.exportMarkets} onChange={(x) => onChange({ ...v, exportMarkets: x })} placeholder="Type a country, e.g. United States" /></div>
            <div className="sm:col-span-2"><span className="label">Certifications</span><ChipPicker options={CERTIFICATIONS} value={v.certifications} onChange={(x) => onChange({ ...v, certifications: x })} placeholder="ISO 9001, OEKO-TEX, IEC… (type to add your own)" allowCustom /></div>
            <div className="sm:col-span-2">
              <span className="label">Factory compliance checked / certified</span>
              <div className="grid gap-2 sm:grid-cols-4">
                {[['certified', 'Certified'], ['checked', 'Checked, not certified'], ['in_progress', 'In progress'], ['no', 'No']].map(([val, l]) => (
                  <button key={val} type="button" onClick={() => onChange({ ...v, compliance: { ...v.compliance, status: val } })} className={cx('rounded-lg border px-3 py-2 text-sm transition', v.compliance.status === val ? 'border-forest bg-forest text-white' : 'border-line bg-white hover:border-gold')}>{l}</button>
                ))}
              </div>
            </div>
            {['certified', 'checked', 'in_progress'].includes(v.compliance.status) && (
              <div className="sm:col-span-2"><span className="label">Audits / certificates {v.compliance.status !== 'certified' && '(optional)'}</span><ChipPicker options={COMPLIANCE_AUDITS} value={v.compliance.audits} onChange={(x) => onChange({ ...v, compliance: { ...v.compliance, audits: x } })} placeholder="BSCI, SMETA…" allowCustom /></div>
            )}
            <Field label="Compliance details (optional)" className="sm:col-span-2"><Textarea rows={2} value={v.compliance.details} onChange={setDeep('compliance', 'details')} placeholder="Audit dates, auditor, scores…" /></Field>
          </>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-mist pt-5">
        {i > 0 ? <Button type="button" variant="ghost" onClick={() => go(i - 1)}><ArrowLeft className="h-4 w-4" /> Back</Button> : <span />}
        <Button loading={busy} size="lg">{i < steps.length - 1 ? <>Continue <ArrowRight className="h-4 w-4" /></> : submitLabel}</Button>
      </div>
    </form>
  );
}
