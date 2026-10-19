import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Handshake, Mail, MapPin, Phone, Search, Send } from 'lucide-react';
import api, { errMsg } from '../lib/api';
import useFetch from '../lib/useFetch';
import { useAuth } from '../lib/auth';
import { date, dateTime, timeAgo } from '../lib/format';
import { Alert, Badge, Button, Card, Empty, Field, Input, PageHeader, PageLoader, Select, Tabs, Textarea } from '../components/ui';

export const LIAISON_STATUS = {
  new: ['gold', 'New'], contacted: ['blue', 'Contacted'], proposal_sent: ['sage', 'Proposal sent'], won: ['success', 'Won'], lost: ['red', 'Lost'], closed: ['gray', 'Closed'],
};
const LBadge = ({ s }) => <Badge color={LIAISON_STATUS[s]?.[0]}>{LIAISON_STATUS[s]?.[1] || s}</Badge>;

export function LiaisonList() {
  const [sp, setSp] = useSearchParams();
  const status = sp.get('status') ?? '';
  const service = sp.get('service') || '';
  const [q, setQ] = useState('');
  const { data, loading } = useFetch(`/admin/liaison?${new URLSearchParams({ ...(status && { status }), ...(service && { service }), ...(sp.get('q') && { q: sp.get('q') }) })}`);
  const c = data?.counts || {};
  const setParam = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n); };
  return (
    <>
      <PageHeader title="Liaison services enquiries" subtitle="International clients asking about sourcing, procurement, inspection, shipping, design, photography, marketing and white labelling." />
      <Tabs value={status} onChange={(v) => setParam('status', v)} tabs={[{ value: '', label: 'All', count: Object.values(c).reduce((a, b) => a + b, 0) }, ...Object.entries(LIAISON_STATUS).map(([v, [, l]]) => ({ value: v, label: l, count: c[v] || 0 }))]} />
      {data?.byService?.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {data.byService.map((x) => (
            <button key={x._id} onClick={() => setParam('service', service === x._id ? '' : x._id)} className={`rounded-full border px-3 py-1 text-xs transition ${service === x._id ? 'border-forest bg-forest text-white' : 'border-line bg-white hover:border-gold'}`}>{x._id} · {x.n}</button>
          ))}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); setParam('q', q); }} className="relative mb-4 max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-ink-medium" /><Input className="pl-9" placeholder="Name, company, email, country…" value={q} onChange={(e) => setQ(e.target.value)} /></form>
      <Card className="overflow-hidden">
        {loading ? <PageLoader /> : !data?.list?.length ? <Empty icon={Handshake} title="No enquiries yet" text="Enquiries from the website’s Liaison Services page land here." /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Client</th><th>Country</th><th>Services</th><th>Budget</th><th>Status</th><th>Owner</th><th>Received</th></tr></thead>
              <tbody>{data.list.map((e) => (
                <tr key={e._id}>
                  <td><Link to={`/liaison/${e._id}`} className="font-medium text-forest hover:underline">{e.company || e.name}</Link><span className="block text-xs text-ink-medium">{e.number} · {e.name}</span></td>
                  <td>{e.country || '—'}</td>
                  <td className="max-w-xs"><div className="flex flex-wrap gap-1">{e.services.map((s) => <Badge key={s} color="green">{s}</Badge>)}</div></td>
                  <td className="text-sm">{e.budget || '—'}</td>
                  <td><LBadge s={e.status} /></td>
                  <td className="text-sm text-ink-medium">{e.assignedTo?.name || '—'}</td>
                  <td className="whitespace-nowrap text-ink-medium">{date(e.createdAt)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

export function LiaisonDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const { data, setData, loading, error } = useFetch(`/admin/liaison/${id}`);
  const [reply, setReply] = useState({ subject: '', message: '' });
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  if (loading && !data) return <PageLoader />;
  if (error) return <Alert type="error">{error}</Alert>;
  const e = data.enquiry;
  const edit = can('liaisonEdit');
  const run = async (fn, ok) => {
    setBusy(true); setMsg(null);
    try { const { data: d } = await fn(); setData({ ...data, enquiry: d.enquiry }); if (ok) setMsg({ type: 'success', t: ok }); return true; }
    catch (x) { setMsg({ type: 'error', t: errMsg(x) }); return false; } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader back={<Link to="/liaison" className="mb-2 inline-flex items-center gap-1 text-sm text-ink-medium hover:text-forest"><ArrowLeft className="h-4 w-4" /> Liaison enquiries</Link>}
        title={e.company || e.name} subtitle={<span className="flex flex-wrap items-center gap-2">{e.number} · {dateTime(e.createdAt)} <LBadge s={e.status} /></span>} />
      {msg && <Alert type={msg.type} className="mb-5">{msg.t}</Alert>}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="card-pad">
            <div className="flex flex-wrap gap-1.5">{e.services.map((s) => <Badge key={s} color="green">{s}</Badge>)}</div>
            <p className="mt-4 whitespace-pre-line text-ink">{e.message}</p>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              {e.budget && <p><span className="text-ink-medium">Budget:</span> {e.budget}</p>}
              {e.timeline && <p><span className="text-ink-medium">Timeline:</span> {e.timeline}</p>}
            </div>
          </Card>
          <Card className="card-pad">
            <h3 className="text-lg text-forest">Reply by email</h3>
            <form onSubmit={async (ev) => { ev.preventDefault(); if (await run(() => api.post(`/admin/liaison/${id}/reply`, reply), 'Reply emailed — saved in the notes.')) setReply({ subject: '', message: '' }); }} className="mt-3 space-y-3">
              <Input value={reply.subject} onChange={(ev) => setReply({ ...reply, subject: ev.target.value })} placeholder={`Re: your Ranavista liaison enquiry ${e.number}`} disabled={!edit} />
              <Textarea rows={6} value={reply.message} onChange={(ev) => setReply({ ...reply, message: ev.target.value })} placeholder="Introduce the specialist, scope, pricing, next steps…" disabled={!edit} />
              <Button loading={busy} disabled={!edit || !reply.message.trim()}><Send className="h-4 w-4" /> Send to {e.email}</Button>
            </form>
          </Card>
          <Card className="card-pad">
            <p className="eyebrow">Notes & history</p>
            <form onSubmit={async (ev) => { ev.preventDefault(); if (note.trim() && await run(() => api.post(`/admin/liaison/${id}/note`, { text: note }))) setNote(''); }} className="mt-3 flex gap-2">
              <Input value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Add an internal note" /><Button variant="outline" disabled={!note.trim()}>Add</Button>
            </form>
            <ul className="mt-3 space-y-2">{[...(e.notes || [])].reverse().map((n, i) => <li key={i} className="rounded-lg bg-cream/70 p-3 text-sm"><p className="whitespace-pre-line">{n.text}</p><p className="mt-1 text-[11px] text-ink-medium">{n.by?.name} · {timeAgo(n.at)}</p></li>)}</ul>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="card-pad space-y-2 text-sm">
            <p className="eyebrow">Contact</p>
            <p className="font-serif text-lg text-forest">{e.name}</p>
            {e.company && <p>{e.company}</p>}
            <a href={`mailto:${e.email}`} className="flex items-center gap-2 text-forest hover:underline"><Mail className="h-3.5 w-3.5" />{e.email}</a>
            {e.phone && <a href={`tel:${e.phone}`} className="flex items-center gap-2 text-forest hover:underline"><Phone className="h-3.5 w-3.5" />{e.phone}</a>}
            {e.country && <p className="flex items-center gap-2 text-ink-medium"><MapPin className="h-3.5 w-3.5" />{e.country}</p>}
          </Card>
          <Card className="card-pad grid gap-3">
            <Field label="Status"><Select disabled={!edit || busy} value={e.status} onChange={(ev) => run(() => api.patch(`/admin/liaison/${id}`, { status: ev.target.value }), 'Status updated.')} options={Object.entries(LIAISON_STATUS).map(([value, [, label]]) => ({ value, label }))} /></Field>
            <Field label="Owner"><Select disabled={!edit || busy} value={e.assignedTo?._id || ''} onChange={(ev) => run(() => api.patch(`/admin/liaison/${id}`, { assignedTo: ev.target.value || null }), 'Owner updated.')} options={(data.team || []).map((t) => ({ value: t._id, label: t.name }))} placeholder="Unassigned" /></Field>
          </Card>
        </div>
      </div>
    </>
  );
}
