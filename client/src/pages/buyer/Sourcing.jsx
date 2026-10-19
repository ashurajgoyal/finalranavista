import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, PackageSearch, Plus } from 'lucide-react';
import api, { errMsg, fileUrl } from '../../lib/api';
import useFetch from '../../lib/useFetch';
import { date, dateTime, num } from '../../lib/format';
import { Alert, Badge, Button, Card, Empty, Field, PageHeader, PageLoader, Textarea } from '../../components/ui';

const STATUS = {
  new: ['gold', 'Received'], in_review: ['blue', 'In review'], sourcing: ['sage', 'Sourcing'], quoted: ['green', 'Quotation ready'],
  accepted: ['success', 'Accepted'], converted: ['success', 'Moved to RFQ'], closed: ['gray', 'Closed'], cancelled: ['gray', 'Cancelled'],
};
const SBadge = ({ s }) => <Badge color={STATUS[s]?.[0]}>{STATUS[s]?.[1] || s}</Badge>;
const money = (n, c) => `${c} ${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export function BuyerSourcingList() {
  const { data, loading } = useFetch('/sourcing');
  return (
    <>
      <PageHeader title="Sourcing requests" subtitle="Products you asked us to find for you." actions={<Link to="/sourcing-request" className="btn-gold"><Plus className="h-4 w-4" /> New sourcing request</Link>} />
      {loading ? <PageLoader /> : !data?.length ? (
        <Card><Empty icon={PackageSearch} title="No sourcing requests yet" text="Can’t find a product? Upload a photo with your specs and target price — our team will source it." action={<Link to="/sourcing-request" className="btn-primary">Start a sourcing request</Link>} /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((s) => (
            <Link key={s._id} to={`/buyer/sourcing/${s._id}`} className="card flex gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
              <img src={fileUrl(s.images?.[0]?.url)} alt="" className="h-20 w-20 shrink-0 rounded-xl bg-cream object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2"><p className="truncate font-medium text-forest">{s.title}</p><SBadge s={s.status} /></div>
                <p className="text-xs text-ink-medium">{s.number} · {date(s.createdAt)}</p>
                <p className="mt-2 text-sm">{num(s.quantity)} {s.unit} · target {money(s.targetPrice, s.currency)}{s.priceBasis === 'unit' ? '/unit' : ''}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-ink-medium"><CalendarDays className="h-3.5 w-3.5" />Needed by {date(s.requiredBy)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export function BuyerSourcingDetail() {
  const { id } = useParams();
  const { data: s, setData, loading, error } = useFetch(`/sourcing/${id}`);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [img, setImg] = useState(0);
  if (loading && !s) return <PageLoader />;
  if (error) return <Alert type="error">{error}</Alert>;
  const respond = async (decision) => {
    setBusy(decision); setMsg(null);
    try { const { data } = await api.post(`/sourcing/${id}/respond`, { decision, note }); setData(data); setMsg({ type: 'success', t: decision === 'accepted' ? 'Thank you — our team will contact you to confirm samples and the order.' : 'Noted — we’ll keep looking and come back with alternatives.' }); }
    catch (x) { setMsg({ type: 'error', t: errMsg(x) }); } finally { setBusy(''); }
  };
  const specs = Object.entries(s.specs || {}).filter(([, v]) => v);
  return (
    <>
      <PageHeader back={<Link to="/buyer/sourcing" className="mb-2 inline-flex items-center gap-1 text-sm text-ink-medium hover:text-forest"><ArrowLeft className="h-4 w-4" /> Sourcing requests</Link>}
        title={s.title} subtitle={<span className="flex flex-wrap items-center gap-2">{s.number} · submitted {dateTime(s.createdAt)} <SBadge s={s.status} /></span>} />
      {msg && <Alert type={msg.type} className="mb-5">{msg.t}</Alert>}
      {s.rfq && <Alert type="success" className="mb-5">This request is now RFQ <Link to={`/buyer/rfqs/${s.rfq._id}`} className="link">{s.rfq.number}</Link> — follow the quotation there.</Alert>}

      {s.quote?.sentAt && (
        <Card className="card-pad mb-6 border-gold/50 ring-2 ring-gold/20">
          <p className="eyebrow">Our quotation · {date(s.quote.sentAt)}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-4">
            <div><p className="text-xs text-ink-medium">Unit price</p><p className="font-serif text-2xl text-forest">{money(s.quote.unitPrice, s.quote.currency)}</p></div>
            <div><p className="text-xs text-ink-medium">Total ({num(s.quantity)} {s.unit})</p><p className="font-serif text-2xl">{money(s.quote.total, s.quote.currency)}</p></div>
            <div><p className="text-xs text-ink-medium">Lead time</p><p className="text-sm">{s.quote.leadTime || '—'}</p></div>
            <div><p className="text-xs text-ink-medium">Valid until</p><p className="text-sm">{date(s.quote.validUntil)}</p></div>
          </div>
          {s.quote.message && <p className="mt-4 whitespace-pre-line text-sm text-ink-medium">{s.quote.message}</p>}
          {s.status === 'quoted' && (
            <div className="mt-5 space-y-3 border-t border-mist pt-4">
              <Field label="Message to our team (optional)"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Questions, sample request, changes…" /></Field>
              <div className="flex flex-wrap gap-2">
                <Button loading={busy === 'accepted'} onClick={() => respond('accepted')}>Accept quotation</Button>
                <Button variant="outline" loading={busy === 'declined'} onClick={() => respond('declined')}>Decline — keep looking</Button>
              </div>
            </div>
          )}
          {s.buyerResponse?.decision && <p className="mt-4 text-sm text-ink-medium">You {s.buyerResponse.decision} this quotation on {date(s.buyerResponse.at)}.</p>}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <Card className="p-4">
          <a href={fileUrl(s.images[img]?.url)} target="_blank" rel="noreferrer"><img src={fileUrl(s.images[img]?.url)} alt={s.title} className="aspect-square w-full rounded-xl bg-cream object-cover" /></a>
          {s.images.length > 1 && <div className="mt-2 flex gap-2 overflow-x-auto">{s.images.map((im, i) => <button key={im.url} onClick={() => setImg(i)} className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2 ${i === img ? 'ring-gold' : 'ring-transparent'}`}><img src={fileUrl(im.url)} alt="" className="h-full w-full object-cover" /></button>)}</div>}
        </Card>
        <Card className="card-pad">
          <div className="grid gap-3 sm:grid-cols-3">
            {[['Quantity', `${num(s.quantity)} ${s.unit}`], ['Target price', `${money(s.targetPrice, s.currency)} ${s.priceBasis === 'unit' ? 'per unit' : 'total'}`], ['Required by', date(s.requiredBy)],
              ['Category', s.category || '—'], ['Deliver to', [s.destination?.city, s.destination?.country].filter(Boolean).join(', ') || '—'], ['Preferred origin', s.preferredOrigin || 'Any']].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-cream/70 p-3"><p className="text-[11px] uppercase tracking-wider text-ink-medium">{l}</p><p className="mt-0.5 text-sm font-medium">{v}</p></div>
            ))}
          </div>
          <h3 className="mt-6 text-lg text-forest">Specifications</h3>
          <p className="mt-2 whitespace-pre-line text-sm">{s.specifications}</p>
          {specs.length > 0 && <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">{specs.map(([k, v]) => <div key={k} className="rounded-lg bg-cream/60 px-3 py-2"><dt className="text-[11px] uppercase tracking-wider text-ink-medium">{k}</dt><dd>{v}</dd></div>)}</dl>}
        </Card>
      </div>
    </>
  );
}
