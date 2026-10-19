import { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Filter, RefreshCw, Table2 } from 'lucide-react';
import api, { download, errMsg } from '../lib/api';
import useFetch from '../lib/useFetch';
import { CATEGORIES, COUNTRIES_SHORT, inr, num, usd } from '../lib/format';
import { Alert, Button, Card, Empty, Field, Input, PageHeader, PageLoader, Select, cx } from '../components/ui';

const PRESETS = [
  ['today', 'Today'], ['yesterday', 'Yesterday'], ['this_week', 'This week'], ['last_week', 'Last week'], ['last_7', 'Last 7 days'],
  ['this_month', 'This month'], ['last_month', 'Last month'], ['last_30', 'Last 30 days'], ['this_quarter', 'This quarter'], ['last_quarter', 'Last quarter'],
  ['this_year', 'This year'], ['all', 'All time'], ['custom', 'Custom dates'],
];
const LABEL = (s) => String(s).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const LIAISON = ['Sourcing', 'Procurement', 'Inspection Services', 'Shipping Services', 'Graphic Designing', 'Product Photography', 'Digital Marketing', 'Product Designing', 'Content Creation', 'White Labelling'];

function cell(v, type) {
  if (v == null || v === '') return <span className="text-ink-medium">—</span>;
  if (type === 'date') return new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  if (type === 'money_usd') return usd(v);
  if (type === 'money_inr') return inr(v);
  if (type === 'number') return num(v, 2);
  return String(v);
}

export default function Reports() {
  const { data: meta, loading } = useFetch('/admin/reports/meta');
  const [type, setType] = useState('');
  const [f, setF] = useState({ preset: 'this_month', from: '', to: '', status: '', country: '', category: '', plan: '', service: '', fulfillment: '', q: '', groupBy: 'none' });
  const [cols, setCols] = useState([]);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const def = useMemo(() => meta?.find((m) => m.key === type), [meta, type]);
  const { data: plans } = useFetch('/admin/plans');

  useEffect(() => { if (meta?.length && !type) setType(meta[0].key); }, [meta, type]);
  useEffect(() => { if (def) { setCols(def.columns.map((c) => c.key)); setPreview(null); setF((x) => ({ ...x, status: '', country: '', category: '', plan: '', service: '', fulfillment: '' })); } }, [def]);

  const params = () => {
    const p = { preset: f.preset, columns: cols.join(',') };
    if (f.preset === 'custom') { if (f.from) p.from = f.from; if (f.to) p.to = f.to; }
    ['status', 'country', 'category', 'plan', 'service', 'fulfillment', 'q'].forEach((k) => { if (f[k]) p[k] = f[k]; });
    if (f.groupBy !== 'none') p.groupBy = f.groupBy;
    return p;
  };
  const run = async () => {
    setBusy('preview'); setErr('');
    try { const { data } = await api.get(`/admin/reports/${type}`, { params: { ...params(), format: 'json', limit: 100 } }); setPreview(data); } catch (x) { setErr(errMsg(x)); } finally { setBusy(''); }
  };
  const exportAs = async (format) => {
    if (f.preset === 'custom' && !f.from && !f.to) return setErr('Choose a from and/or to date for a custom range.');
    setBusy(format); setErr('');
    try { await download(`/admin/reports/${type}?${new URLSearchParams({ ...params(), format })}`, `ranavista-${type}-${new Date().toISOString().slice(0, 10)}.${format}`); }
    catch (x) { setErr(x?.response?.data instanceof Blob ? JSON.parse(await x.response.data.text()).message : errMsg(x)); } finally { setBusy(''); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggleCol = (k) => setCols((c) => (c.includes(k) ? c.filter((x) => x !== k) : def.columns.map((x) => x.key).filter((x) => x === k || c.includes(x))));

  if (loading) return <PageLoader />;
  if (!meta?.length) return <Alert type="warning">Your admin role has no reports available.</Alert>;
  const flt = def?.filters || {};
  const planOpts = (plans || []).filter((p) => (type === 'buyers' ? p.audience === 'buyer' : p.audience === 'seller')).map((p) => ({ value: p.key, label: p.name }));

  return (
    <>
      <PageHeader title="Reports" subtitle="Filter any section by date and details, preview it, then export to Excel or PDF. Money columns include both USD and INR." />
      {err && <Alert type="error" className="mb-4">{err}</Alert>}
      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <Card className="card-pad h-fit space-y-4 xl:sticky xl:top-20">
          <Field label="Report"><Select value={type} onChange={(e) => setType(e.target.value)} options={meta.map((m) => ({ value: m.key, label: m.label }))} /></Field>
          <div>
            <span className="label">Time period</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(([v, l]) => <button key={v} type="button" onClick={() => setF({ ...f, preset: v })} className={cx('rounded-full border px-3 py-1 text-xs transition', f.preset === v ? 'border-forest bg-forest text-white' : 'border-line bg-white hover:border-gold')}>{l}</button>)}
            </div>
          </div>
          {f.preset === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="From"><Input type="date" value={f.from} onChange={set('from')} /></Field>
              <Field label="To"><Input type="date" value={f.to} onChange={set('to')} /></Field>
            </div>
          )}
          <Field label="Summary by period"><Select value={f.groupBy} onChange={set('groupBy')} options={[{ value: 'none', label: 'No summary' }, { value: 'week', label: 'Weekly summary' }, { value: 'month', label: 'Monthly summary' }]} /></Field>
          <p className="flex items-center gap-1.5 border-t border-mist pt-3 text-xs font-medium uppercase tracking-wider text-ink-medium"><Filter className="h-3.5 w-3.5" /> Filters</p>
          {Array.isArray(flt.status) && <Field label="Status"><Select value={f.status} onChange={set('status')} options={flt.status.map((s) => ({ value: s, label: LABEL(s) }))} placeholder="Any" /></Field>}
          {Array.isArray(flt.fulfillment) && <Field label="Fulfilment"><Select value={f.fulfillment} onChange={set('fulfillment')} options={flt.fulfillment.map((s) => ({ value: s, label: LABEL(s) }))} placeholder="Any" /></Field>}
          {flt.country && <Field label="Country"><Input value={f.country} onChange={set('country')} list="report-countries" placeholder="Any country" /><datalist id="report-countries">{COUNTRIES_SHORT.map((c) => <option key={c} value={c} />)}</datalist></Field>}
          {flt.category && <Field label="Category"><Select value={f.category} onChange={set('category')} options={CATEGORIES} placeholder="Any" /></Field>}
          {flt.plan && <Field label="Plan"><Select value={f.plan} onChange={set('plan')} options={[...(type === 'buyers' ? [{ value: 'free', label: 'Free / no plan' }] : []), ...planOpts]} placeholder="Any" /></Field>}
          {flt.service && <Field label="Service"><Select value={f.service} onChange={set('service')} options={LIAISON} placeholder="Any" /></Field>}
          <Field label="Search"><Input value={f.q} onChange={set('q')} placeholder="Name, number, company…" /></Field>
          <div className="grid gap-2 border-t border-mist pt-4">
            <Button variant="outline" onClick={run} loading={busy === 'preview'}><RefreshCw className="h-4 w-4" /> Preview</Button>
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => exportAs('xlsx')} loading={busy === 'xlsx'} title="Excel"><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
              <Button variant="gold" onClick={() => exportAs('pdf')} loading={busy === 'pdf'} title="PDF"><FileText className="h-4 w-4" /> PDF</Button>
              <Button variant="ghost" onClick={() => exportAs('csv')} loading={busy === 'csv'} title="CSV"><Download className="h-4 w-4" /> CSV</Button>
            </div>
          </div>
        </Card>

        <div className="min-w-0 space-y-6">
          {def && (
            <Card className="card-pad">
              <div className="mb-2 flex items-center justify-between"><p className="label mb-0">Columns ({cols.length}/{def.columns.length})</p>
                <div className="flex gap-3 text-xs"><button className="text-forest underline" onClick={() => setCols(def.columns.map((c) => c.key))}>All</button><button className="text-forest underline" onClick={() => setCols([def.columns[0].key])}>None</button></div></div>
              <div className="flex flex-wrap gap-1.5">
                {def.columns.map((c) => <button key={c.key} type="button" onClick={() => toggleCol(c.key)} className={cx('rounded-lg border px-2.5 py-1 text-xs transition', cols.includes(c.key) ? 'border-forest/30 bg-forest/10 text-forest' : 'border-line bg-white text-ink-medium line-through')}>{c.label}</button>)}
              </div>
              <p className="mt-2 text-xs text-ink-medium">PDF fits up to 12 columns; Excel and CSV include every selected column.</p>
            </Card>
          )}
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mist px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg text-forest"><Table2 className="h-4 w-4 text-gold" /> {preview ? preview.label : 'Preview'}</h2>
              {preview && <p className="text-sm text-ink-medium">{preview.total.toLocaleString()} records · {preview.range.label}{preview.filtersApplied.length > 0 && ` · ${preview.filtersApplied.join(', ')}`}</p>}
            </div>
            {!preview ? <Empty icon={Table2} title="Choose filters and press Preview" text="You can also export straight away — the file uses the same filters." /> : !preview.rows.length ? <Empty icon={Table2} title="No records match" text="Try a wider time period or fewer filters." /> : (
              <>
                <div className="max-h-[60vh] overflow-auto">
                  <table className="table">
                    <thead className="sticky top-0 z-10"><tr>{preview.columns.map((c) => <th key={c.key} className={cx('whitespace-nowrap', (c.type.startsWith('money') || c.type === 'number') && 'text-right')}>{c.label}</th>)}</tr></thead>
                    <tbody>{preview.rows.map((r, i) => <tr key={i}>{preview.columns.map((c) => <td key={c.key} className={cx('max-w-[280px] truncate', (c.type.startsWith('money') || c.type === 'number') && 'text-right tabular-nums')}>{cell(r[c.key], c.type)}</td>)}</tr>)}</tbody>
                  </table>
                </div>
                {preview.total > preview.rows.length && <p className="border-t border-mist px-6 py-3 text-xs text-ink-medium">Showing the first {preview.rows.length} of {preview.total.toLocaleString()} rows — export for the full list.</p>}
              </>
            )}
          </Card>
          {preview?.summary?.rows?.length > 0 && (
            <Card className="overflow-hidden">
              <div className="border-b border-mist px-6 py-4"><h2 className="text-lg text-forest">{preview.summary.groupBy === 'month' ? 'Monthly' : 'Weekly'} summary</h2></div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr>{preview.summary.columns.map((c) => <th key={c.key} className={cx(c.key !== 'period' && 'text-right')}>{c.label}</th>)}</tr></thead>
                  <tbody>{preview.summary.rows.map((r) => <tr key={r.period}>{preview.summary.columns.map((c) => <td key={c.key} className={cx(c.key !== 'period' && 'text-right tabular-nums')}>{cell(r[c.key], c.type)}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
