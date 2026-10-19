import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRightLeft, CalendarDays, Mail, PackageSearch, Phone, Plus, Search, Send, Trash2, Upload } from 'lucide-react';
import api, { errMsg, fileUrl, uploadFiles } from '../lib/api';
import useFetch from '../lib/useFetch';
import { useAuth } from '../lib/auth';
import { CATEGORIES, date, dateTime, num, timeAgo } from '../lib/format';
import Money from '../components/Money';
import { Alert, Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, PageLoader, Select, Tabs, Textarea, cx } from '../components/ui';

export const SRC_STATUS = {
  new: ['gold', 'New'], in_review: ['blue', 'In review'], sourcing: ['sage', 'Sourcing'], quoted: ['green', 'Quoted'],
  accepted: ['success', 'Accepted'], converted: ['success', 'Converted to RFQ'], closed: ['gray', 'Closed'], cancelled: ['gray', 'Cancelled'],
};
export const SrcBadge = ({ s }) => <Badge color={SRC_STATUS[s]?.[0]}>{SRC_STATUS[s]?.[1] || s}</Badge>;
const PRIORITY = { high: 'red', normal: 'gray', low: 'blue' };
const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'AED', 'CNY', 'VND', 'JPY', 'AUD', 'CAD'];
const daysLeft = (d) => Math.ceil((new Date(d).getTime() - Date.now()) / 864e5);

/** Target price in its own currency + USD/INR when it is one of those. */
function Price({ value, currency }) {
  if (currency === 'USD' || currency === 'INR') return <Money value={value} currency={currency} stack />;
  return <span>{currency} {Number(value || 0).toLocaleString('en-US')}</span>;
}

/* ============================== LIST ============================== */
export function SourcingList() {
  const [sp, setSp] = useSearchParams();
  const status = sp.get('status') ?? 'open';
  const [q, setQ] = useState(sp.get('q') || '');
  const { data, loading } = useFetch(`/admin/sourcing?${new URLSearchParams({ status, ...(sp.get('q') && { q: sp.get('q') }), ...(sp.get('assigned') && { assigned: sp.get('assigned') }) })}`);
  const c = data?.counts || {};
  const open = ['new', 'in_review', 'sourcing', 'quoted'].reduce((s, k) => s + (c[k] || 0), 0);
  return (
    <>
      <PageHeader title="Sourcing projects" subtitle="Requests from buyers who couldn’t find their product — photo, specifications, target price, quantity and date." />
      <Tabs value={status} onChange={(v) => setSp(v ? { status: v } : { status: '' })} tabs={[
        { value: 'open', label: 'Open', count: open },
        ...Object.entries(SRC_STATUS).map(([v, [, l]]) => ({ value: v, label: l, count: c[v] || 0 })),
        { value: '', label: 'All' },
      ]} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form onSubmit={(e) => { e.preventDefault(); const n = new URLSearchParams(sp); q ? n.set('q', q) : n.delete('q'); setSp(n); }} className="relative w-full max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-ink-medium" /><Input className="pl-9" placeholder="Reference, product, client…" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <label className="flex items-center gap-2 text-sm text-ink-medium"><input type="checkbox" className="accent-forest" checked={sp.get('assigned') === 'me'} onChange={(e) => { const n = new URLSearchParams(sp); e.target.checked ? n.set('assigned', 'me') : n.delete('assigned'); setSp(n); }} /> Only mine</label>
      </div>
      {loading ? <PageLoader /> : !data?.list?.length ? <Card><Empty icon={PackageSearch} title="No sourcing projects here" text="When a buyer submits the website’s sourcing form, it appears here as a project." /></Card> : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {data.list.map((s) => {
            const left = daysLeft(s.requiredBy);
            return (
              <Link key={s._id} to={`/sourcing/${s._id}`} className="card flex gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
                <img src={fileUrl(s.images?.[0]?.url)} alt="" className="h-24 w-24 shrink-0 rounded-xl bg-cream object-cover ring-1 ring-beige" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2"><p className="truncate font-medium text-forest">{s.title}</p><SrcBadge s={s.status} /></div>
                  <p className="text-xs text-ink-medium">{s.number} · {s.contact?.company || s.contact?.name}{s.category && ` · ${s.category}`}</p>
                  <p className="mt-2 text-sm">{num(s.quantity)} {s.unit} · target {s.currency} {Number(s.targetPrice).toLocaleString('en-US')}{s.priceBasis === 'unit' ? '/unit' : ' total'}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className={cx('flex items-center gap-1', left < 7 && !['converted', 'closed', 'cancelled'].includes(s.status) ? 'text-danger' : 'text-ink-medium')}><CalendarDays className="h-3.5 w-3.5" />Needed by {date(s.requiredBy)}{left >= 0 && left < 30 && ` (${left}d)`}</span>
                    {s.priority !== 'normal' && <Badge color={PRIORITY[s.priority]}>{s.priority}</Badge>}
                    {s.assignedTo?.name && <span className="text-ink-medium">· {s.assignedTo.name}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ============================== DETAIL ============================== */
export function SourcingDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const { data, setData, loading, error } = useFetch(`/admin/sourcing/${id}`);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [note, setNote] = useState('');
  const [img, setImg] = useState(0);
  if (loading && !data) return <PageLoader />;
  if (error) return <Alert type="error">{error}</Alert>;
  const s = data.request;
  const edit = can('sourcingEdit');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const run = async (fn, ok) => {
    setBusy(true); setMsg(null);
    try { const { data: d } = await fn(); setData({ ...data, request: d }); setModal(null); setForm({}); if (ok) setMsg({ type: 'success', t: ok }); }
    catch (x) { setMsg({ type: 'error', t: errMsg(x) }); } finally { setBusy(false); }
  };
  const patch = (body, ok) => run(() => api.patch(`/admin/sourcing/${id}`, body), ok);
  const post = (path, body, ok) => run(() => api.post(`/admin/sourcing/${id}/${path}`, body), ok);
  const specs = Object.entries(s.specs || {}).filter(([, v]) => v);
  const totalTarget = s.priceBasis === 'unit' ? s.targetPrice * s.quantity : s.targetPrice;

  return (
    <>
      <PageHeader back={<Link to="/sourcing" className="mb-2 inline-flex items-center gap-1 text-sm text-ink-medium hover:text-forest"><ArrowLeft className="h-4 w-4" /> Sourcing projects</Link>}
        title={s.title} subtitle={<span className="flex flex-wrap items-center gap-2">{s.number} · received {dateTime(s.createdAt)} <SrcBadge s={s.status} />{s.rfq && <Link to={`/rfqs/${s.rfq._id}`} className="text-forest underline">RFQ {s.rfq.number}</Link>}</span>}
        actions={edit && <>
          {!s.rfq && <Button variant="outline" onClick={() => setModal('convert')}><ArrowRightLeft className="h-4 w-4" /> Convert to RFQ</Button>}
          <Button onClick={() => { setForm({ unitPrice: s.quote?.unitPrice || '', currency: s.quote?.currency || s.currency, leadTime: s.quote?.leadTime || '', validUntil: '', message: s.quote?.message || '' }); setModal('quote'); }}><Send className="h-4 w-4" /> {s.quote?.sentAt ? 'Revise quotation' : 'Send quotation to buyer'}</Button>
        </>} />
      {msg && <Alert type={msg.type} className="mb-5">{msg.t}</Alert>}
      {s.buyerResponse?.decision && <Alert type={s.buyerResponse.decision === 'accepted' ? 'success' : 'warning'} className="mb-5">Buyer {s.buyerResponse.decision} the quotation {timeAgo(s.buyerResponse.at)}{s.buyerResponse.note && `: “${s.buyerResponse.note}”`}</Alert>}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card className="grid gap-5 p-5 md:grid-cols-[minmax(0,300px)_1fr]">
            <div>
              <a href={fileUrl(s.images[img]?.url)} target="_blank" rel="noreferrer"><img src={fileUrl(s.images[img]?.url)} alt={s.title} className="aspect-square w-full rounded-xl bg-cream object-cover ring-1 ring-beige" /></a>
              {s.images.length > 1 && <div className="mt-2 flex gap-2 overflow-x-auto">{s.images.map((im, i) => <button key={im.url} onClick={() => setImg(i)} className={cx('h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2', i === img ? 'ring-gold' : 'ring-transparent')}><img src={fileUrl(im.url)} alt="" className="h-full w-full object-cover" /></button>)}</div>}
            </div>
            <div>
              <div className="grid grid-cols-2 gap-3">
                {[['Quantity', `${num(s.quantity)} ${s.unit}`], ['Required by', `${date(s.requiredBy)}`], ['Category', s.category || '—'], ['Incoterm', s.incoterm || '—'], ['Destination', [s.destination?.city, s.destination?.country].filter(Boolean).join(', ') || '—'], ['Preferred origin', s.preferredOrigin || 'Any']].map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-cream/70 p-3"><p className="text-[11px] uppercase tracking-wider text-ink-medium">{l}</p><p className="mt-0.5 text-sm font-medium">{v}</p></div>
                ))}
              </div>
              <div className="mt-3 rounded-lg bg-forest/5 p-3">
                <p className="text-[11px] uppercase tracking-wider text-ink-medium">Target price ({s.priceBasis === 'unit' ? 'per unit' : 'total'})</p>
                <p className="mt-0.5 font-serif text-2xl text-forest"><Price value={s.targetPrice} currency={s.currency} /></p>
                <p className="text-xs text-ink-medium">≈ <Money value={s.priceBasis === 'unit' ? s.targetPriceUsd * s.quantity : s.targetPriceUsd} digits={0} /> total {s.currency !== 'USD' && `(${s.currency} ${Number(totalTarget).toLocaleString('en-US')})`}</p>
              </div>
            </div>
          </Card>

          <Card className="card-pad">
            <h3 className="text-lg text-forest">Specifications</h3>
            <p className="mt-2 whitespace-pre-line text-sm">{s.specifications}</p>
            {specs.length > 0 && <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">{specs.map(([k, v]) => <div key={k} className="rounded-lg bg-cream/60 px-3 py-2"><dt className="text-[11px] uppercase tracking-wider text-ink-medium">{k}</dt><dd>{v}</dd></div>)}</dl>}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-mist px-6 py-3">
              <h3 className="text-lg text-forest">Supplier quotations</h3>
              {edit && <Button size="sm" variant="outline" onClick={() => { setForm({ currency: 'USD' }); setModal('sq'); }}><Plus className="h-4 w-4" /> Add</Button>}
            </div>
            {!s.supplierQuotes?.length ? <p className="p-6 text-sm text-ink-medium">Record the prices you collect from manufacturers to compare them here.</p> : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr><th>Supplier</th><th className="text-right">Unit price</th><th>MOQ</th><th>Lead time</th><th>Notes</th><th /></tr></thead>
                  <tbody>{[...s.supplierQuotes].sort((x, y) => x.unitPrice - y.unitPrice).map((q, i) => (
                    <tr key={q._id} className={cx(i === 0 && s.supplierQuotes.length > 1 && 'bg-success/5')}>
                      <td>{q.seller ? <Link to={`/sellers/${q.seller._id}`} className="font-medium text-forest hover:underline">{q.supplier || q.seller.company}</Link> : <span className="font-medium">{q.supplier}</span>}<span className="block text-xs text-ink-medium">{q.country}</span></td>
                      <td className="text-right"><Price value={q.unitPrice} currency={q.currency} /></td>
                      <td>{q.moq || '—'}</td><td>{q.leadTimeDays ? `${q.leadTimeDays} days` : '—'}</td>
                      <td className="max-w-[240px] text-xs text-ink-medium">{q.notes}{q.file?.url && <a href={fileUrl(q.file.url)} target="_blank" rel="noreferrer" className="block text-forest underline">{q.file.name}</a>}</td>
                      <td>{edit && <button onClick={() => window.confirm('Remove this quotation?') && run(() => api.delete(`/admin/sourcing/${id}/supplier-quotes/${q._id}`))} className="rounded p-1 text-ink-medium hover:bg-mist hover:text-danger" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Card>

          {s.quote?.sentAt && (
            <Card className="card-pad">
              <p className="eyebrow">Quotation sent to buyer · {dateTime(s.quote.sentAt)}{s.quote.by?.name && ` by ${s.quote.by.name}`}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div><p className="text-xs text-ink-medium">Unit price</p><p className="font-serif text-xl"><Price value={s.quote.unitPrice} currency={s.quote.currency} /></p></div>
                <div><p className="text-xs text-ink-medium">Total</p><p className="font-serif text-xl"><Price value={s.quote.total} currency={s.quote.currency} /></p></div>
                <div><p className="text-xs text-ink-medium">Lead time / valid until</p><p className="text-sm">{s.quote.leadTime || '—'} · {date(s.quote.validUntil)}</p></div>
              </div>
              {s.quote.message && <p className="mt-3 whitespace-pre-line text-sm text-ink-medium">{s.quote.message}</p>}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="card-pad space-y-3">
            <p className="eyebrow">Client</p>
            <div>
              <p className="font-serif text-lg text-forest">{s.contact?.company || s.contact?.name}</p>
              <p className="text-sm">{s.contact?.name}{s.contact?.country && ` · ${s.contact.country}`}</p>
              <a href={`mailto:${s.contact?.email}`} className="mt-1 flex items-center gap-2 text-sm text-forest hover:underline"><Mail className="h-3.5 w-3.5" />{s.contact?.email}</a>
              {s.contact?.phone && <a href={`tel:${s.contact.phone}`} className="flex items-center gap-2 text-sm text-forest hover:underline"><Phone className="h-3.5 w-3.5" />{s.contact.phone}</a>}
              {s.buyer ? <Link to={`/buyers/${s.buyer._id}`} className="mt-2 inline-block text-xs text-forest underline">Buyer account · {s.buyer.subscription?.plan?.replace('buyer_', '') || 'free'} plan</Link> : <p className="mt-2 text-xs text-ink-medium">Submitted as a guest (no buyer account)</p>}
            </div>
          </Card>

          <Card className="card-pad grid gap-3">
            <p className="eyebrow">Project</p>
            <Field label="Status"><Select disabled={!edit || busy} value={s.status} onChange={(e) => patch({ status: e.target.value }, 'Status updated.')} options={Object.entries(SRC_STATUS).map(([value, [, label]]) => ({ value, label }))} /></Field>
            <Field label="Priority"><Select disabled={!edit || busy} value={s.priority} onChange={(e) => patch({ priority: e.target.value })} options={['high', 'normal', 'low']} /></Field>
            <Field label="Category"><Select disabled={!edit || busy} value={s.category || ''} onChange={(e) => patch({ category: e.target.value })} options={CATEGORIES} placeholder="—" /></Field>
            <Field label="Owner"><Select disabled={!edit || busy} value={s.assignedTo?._id || ''} onChange={(e) => patch({ assignedTo: e.target.value || null }, 'Owner updated.')} options={(data.team || []).map((t) => ({ value: t._id, label: t.name }))} placeholder="Unassigned" /></Field>
          </Card>

          {data.sellers?.length > 0 && (
            <Card className="card-pad">
              <p className="eyebrow">Verified sellers in {s.category || 'this category'}</p>
              <ul className="mt-3 space-y-1.5 text-sm">{data.sellers.slice(0, 8).map((x) => <li key={x._id} className="flex justify-between gap-2"><Link to={`/sellers/${x._id}`} className="truncate text-forest hover:underline">{x.company || x.name}</Link><span className="shrink-0 text-xs text-ink-medium">{x.seller?.country}</span></li>)}</ul>
            </Card>
          )}

          <Card className="card-pad">
            <p className="eyebrow">Internal notes</p>
            <form onSubmit={(e) => { e.preventDefault(); if (note.trim()) post('note', { text: note }).then(() => setNote('')); }} className="mt-3 flex gap-2">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" /><Button variant="outline" disabled={!note.trim()}>Add</Button>
            </form>
            <ul className="mt-3 space-y-2">{[...(s.notes || [])].reverse().map((n, i) => <li key={i} className="rounded-lg bg-cream/70 p-2.5 text-sm"><p className="whitespace-pre-line">{n.text}</p><p className="mt-1 text-[11px] text-ink-medium">{n.by?.name} · {timeAgo(n.at)}</p></li>)}</ul>
          </Card>

          <Card className="card-pad">
            <p className="eyebrow">Activity</p>
            <ol className="mt-3 space-y-2 text-sm">{[...(s.log || [])].reverse().map((l, i) => <li key={i}><span className="font-medium">{l.action.replace(/[._]/g, ' ')}</span>{l.note && <span className="text-ink-medium"> — {l.note}</span>}<span className="block text-[11px] text-ink-medium">{l.byName} · {dateTime(l.at)}</span></li>)}</ol>
          </Card>
        </div>
      </div>

      <Modal open={modal === 'sq'} onClose={() => setModal(null)} title="Add supplier quotation"
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button loading={busy} onClick={() => post('supplier-quotes', form, 'Quotation added.')}>Add</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ranavista seller (optional)" className="sm:col-span-2"><Select value={form.seller || ''} onChange={set('seller')} options={(data.sellers || []).map((x) => ({ value: x._id, label: `${x.company || x.name} (${x.seller?.country || ''})` }))} placeholder="Not on Ranavista / type below" /></Field>
          <Field label="Supplier name"><Input value={form.supplier || ''} onChange={set('supplier')} /></Field>
          <Field label="Country"><Input value={form.country || ''} onChange={set('country')} /></Field>
          <Field label="Unit price"><Input type="number" min="0" step="0.01" value={form.unitPrice || ''} onChange={set('unitPrice')} /></Field>
          <Field label="Currency"><Select value={form.currency} onChange={set('currency')} options={CURRENCIES} /></Field>
          <Field label="MOQ"><Input value={form.moq || ''} onChange={set('moq')} placeholder="e.g. 500 pcs" /></Field>
          <Field label="Lead time (days)"><Input type="number" min="0" value={form.leadTimeDays || ''} onChange={set('leadTimeDays')} /></Field>
          <Field label="Notes" className="sm:col-span-2"><Textarea rows={2} value={form.notes || ''} onChange={set('notes')} /></Field>
          <Field label="Attachment" className="sm:col-span-2"><label className="btn-outline cursor-pointer"><Upload className="h-4 w-4" />{form.file?.name || 'Upload quotation / photo'}<input type="file" className="hidden" onChange={async (e) => { if (e.target.files?.[0]) { try { const [f] = await uploadFiles([e.target.files[0]]); setForm((x) => ({ ...x, file: f })); } catch (x) { setMsg({ type: 'error', t: errMsg(x) }); } } }} /></label></Field>
        </div>
      </Modal>

      <Modal open={modal === 'quote'} onClose={() => setModal(null)} title="Quotation for the buyer"
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button loading={busy} onClick={() => post('quote', form, 'Quotation emailed to the buyer.')}><Send className="h-4 w-4" /> Send</Button></>}>
        <p className="mb-4 text-sm text-ink-medium">Emailed to {s.contact?.email}{s.buyer ? ' and shown in their buyer dashboard, where they can accept or decline.' : '.'}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Unit price (per ${s.unit.replace(/s$/, '')})`}><Input type="number" min="0" step="0.01" value={form.unitPrice || ''} onChange={set('unitPrice')} /></Field>
          <Field label="Currency"><Select value={form.currency} onChange={set('currency')} options={CURRENCIES} /></Field>
          <Field label="Lead time"><Input value={form.leadTime || ''} onChange={set('leadTime')} placeholder="e.g. 45 days after sample approval" /></Field>
          <Field label="Valid until"><Input type="date" value={form.validUntil || ''} onChange={set('validUntil')} /></Field>
          <Field label="Message" className="sm:col-span-2"><Textarea rows={4} value={form.message || ''} onChange={set('message')} placeholder="Materials, packaging, samples, payment terms…" /></Field>
          {form.unitPrice > 0 && <p className="text-sm text-ink-medium sm:col-span-2">Total for {num(s.quantity)} {s.unit}: <b>{form.currency} {(form.unitPrice * s.quantity).toLocaleString('en-US', { maximumFractionDigits: 2 })}</b></p>}
        </div>
      </Modal>

      <Modal open={modal === 'convert'} onClose={() => setModal(null)} title="Convert to RFQ"
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button loading={busy} onClick={() => post('convert', {}, 'Converted — the RFQ is now in the pending queue.')}>Convert</Button></>}>
        <p className="text-sm text-ink-medium">Creates a normal RFQ for this buyer (with the photos, specifications, quantity and target price converted to USD) and puts it in the pending queue so you can push it to one verified seller. The buyer needs an account with <b>{s.contact?.email}</b>.</p>
      </Modal>
    </>
  );
}
