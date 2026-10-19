import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, Download, ExternalLink, FileText, Mail, MapPin, Pencil, Phone, Plus, Search, Trash2, UserRound } from 'lucide-react';
import api, { download, errMsg } from '../lib/api';
import useFetch from '../lib/useFetch';
import { useAuth } from '../lib/auth';
import { date, dateTime } from '../lib/format';
import { Alert, Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, PageLoader, Select, Stars, Tabs, Textarea, cx } from '../components/ui';

export const APP_STATUS = {
  new: ['gold', 'New'],
  reviewing: ['blue', 'Reviewing'],
  shortlisted: ['green', 'Shortlisted'],
  interview: ['amber', 'Interview'],
  offered: ['sage', 'Offered'],
  hired: ['success', 'Hired'],
  on_hold: ['gray', 'On hold'],
  rejected: ['red', 'Not selected'],
};
const ABadge = ({ s }) => <Badge color={APP_STATUS[s]?.[0]}>{APP_STATUS[s]?.[1] || s}</Badge>;
const kb = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round((n || 0) / 1024)} KB`);

function CareersTabs({ active }) {
  return (
    <div className="mb-5 inline-flex rounded-xl bg-white p-1 shadow-soft ring-1 ring-beige/80">
      {[['/careers', 'Applications'], ['/careers/openings', 'Open positions']].map(([to, l]) => (
        <Link key={to} to={to} className={cx('rounded-lg px-4 py-2 text-sm transition', active === to ? 'bg-forest text-white' : 'text-ink-medium hover:bg-cream')}>{l}</Link>
      ))}
    </div>
  );
}

/* ======================= APPLICATIONS LIST ======================= */
export function Careers() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const { data, loading } = useFetch(`/admin/careers/applications?status=${status}&q=${encodeURIComponent(search)}`);
  const counts = data?.counts || {};
  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  return (
    <>
      <PageHeader title="Careers" subtitle="CVs and applications sent through the website’s Careers page." />
      <CareersTabs active="/careers" />
      <Tabs value={status} onChange={setStatus} tabs={[{ value: '', label: 'All', count: total }, ...Object.entries(APP_STATUS).map(([v, [, l]]) => ({ value: v, label: l, count: counts[v] || 0 }))]} />
      <form onSubmit={(e) => { e.preventDefault(); setSearch(q); }} className="mb-4 flex max-w-md gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-ink-medium" /><Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, position, city…" /></div>
        <Button variant="outline">Search</Button>
      </form>
      <Card className="overflow-x-auto">
        {loading ? <PageLoader /> : !data?.list?.length ? <Empty icon={Briefcase} title="No applications here yet" text="When someone applies on the Careers page, their details and CV appear here." /> : (
          <table className="table">
            <thead><tr><th>Candidate</th><th>Position</th><th>Experience</th><th>Location</th><th>CV</th><th>Status</th><th>Applied</th></tr></thead>
            <tbody>{data.list.map((a) => (
              <tr key={a._id}>
                <td><Link to={`/careers/${a._id}`} className="font-medium text-forest hover:underline">{a.name}</Link><span className="block text-xs text-ink-medium">{a.email}</span></td>
                <td>{a.position}{a.currentRole && <span className="block text-xs text-ink-medium">Now: {a.currentRole}{a.currentCompany ? ` · ${a.currentCompany}` : ''}</span>}</td>
                <td>{a.experienceYears || '—'}</td>
                <td>{[a.city, a.country].filter(Boolean).join(', ') || '—'}</td>
                <td><button onClick={() => download(`/admin/careers/applications/${a._id}/cv`, a.cv?.name || 'cv')} className="inline-flex items-center gap-1 text-sm text-forest hover:underline"><Download className="h-3.5 w-3.5" /> CV</button></td>
                <td><ABadge s={a.status} /></td>
                <td className="whitespace-nowrap text-ink-medium">{date(a.createdAt)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
    </>
  );
}

/* ======================= APPLICATION DETAIL ======================= */
export function CareerDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { data: a, setData, loading, error } = useFetch(`/admin/careers/applications/${id}`);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  if (loading && !a) return <PageLoader />;
  if (error) return <Alert type="error">{error}</Alert>;

  const patch = async (body, key) => {
    setBusy(key); setMsg(null);
    try { const { data } = await api.patch(`/admin/careers/applications/${id}`, body); setData(data); if (body.note) setNote(''); }
    catch (x) { setMsg({ type: 'error', t: errMsg(x) }); } finally { setBusy(''); }
  };
  const remove = async () => {
    if (!window.confirm('Delete this application and its CV permanently?')) return;
    await api.delete(`/admin/careers/applications/${id}`);
    nav('/careers');
  };
  const getCv = async () => {
    setBusy('cv');
    try { await download(`/admin/careers/applications/${id}/cv`, a.cv?.name || 'cv'); } catch (x) { setMsg({ type: 'error', t: errMsg(x) }); } finally { setBusy(''); }
  };

  const rows = [
    ['Current role', a.currentRole], ['Current company', a.currentCompany], ['Total experience', a.experienceYears],
    ['Highest qualification', a.highestQualification], ['Notice period', a.noticePeriod], ['Expected salary', a.expectedSalary],
    ['Heard about us', a.source],
  ].filter(([, v]) => v);

  return (
    <>
      <PageHeader title={a.name} subtitle={`Applied for ${a.position} · ${dateTime(a.createdAt)}`}
        back={<Link to="/careers" className="mb-2 inline-flex items-center gap-1 text-sm text-ink-medium hover:text-forest"><ArrowLeft className="h-4 w-4" /> All applications</Link>}
        actions={<><ABadge s={a.status} />{user.adminRole === 'super' && <Button variant="ghost" size="sm" onClick={remove}><Trash2 className="h-4 w-4" /> Delete</Button>}</>} />
      {msg && <Alert type={msg.type} className="mb-4">{msg.t}</Alert>}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="card-pad">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <a href={`mailto:${a.email}`} className="flex items-center gap-2 text-forest hover:underline"><Mail className="h-4 w-4 text-gold" />{a.email}</a>
              <a href={`tel:${a.phone}`} className="flex items-center gap-2 text-forest hover:underline"><Phone className="h-4 w-4 text-gold" />{a.phone}</a>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gold" />{[a.city, a.country].filter(Boolean).join(', ') || '—'}</p>
              <p className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-gold" />{a.opening ? `${a.opening.department || 'Opening'} · ${a.opening.location || ''}` : 'General application'}</p>
              {a.linkedin && <a href={a.linkedin} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2 text-forest hover:underline"><ExternalLink className="h-4 w-4 text-gold" />LinkedIn profile</a>}
              {a.portfolio && <a href={a.portfolio} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2 text-forest hover:underline"><ExternalLink className="h-4 w-4 text-gold" />Portfolio / website</a>}
            </div>
            {rows.length > 0 && (
              <dl className="mt-6 grid gap-x-6 gap-y-3 border-t border-mist pt-5 text-sm sm:grid-cols-2">
                {rows.map(([k, v]) => <div key={k}><dt className="text-xs uppercase tracking-wider text-ink-medium">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>)}
              </dl>
            )}
          </Card>
          <Card className="card-pad">
            <h2 className="text-lg text-forest">Cover letter</h2>
            {a.coverLetter ? <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink">{a.coverLetter}</p> : <p className="mt-2 text-sm text-ink-medium">No cover letter provided.</p>}
          </Card>
          <Card className="card-pad">
            <h2 className="text-lg text-forest">Team notes</h2>
            <div className="mt-4 space-y-3">
              {!a.notes?.length && <p className="text-sm text-ink-medium">No notes yet. Notes are internal — the candidate never sees them.</p>}
              {a.notes?.map((n, i) => (
                <div key={i} className="rounded-lg bg-cream/60 px-4 py-3 text-sm">
                  <p className="whitespace-pre-line">{n.text}</p>
                  <p className="mt-1 text-xs text-ink-medium">{n.by?.name || 'Admin'} · {dateTime(n.at)}</p>
                </div>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (note.trim()) patch({ note }, 'note'); }} className="mt-4 space-y-2">
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Interview feedback, next steps…" />
              <Button size="sm" loading={busy === 'note'} disabled={!note.trim()}>Add note</Button>
            </form>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="card-pad">
            <h2 className="text-lg text-forest">CV</h2>
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-beige bg-cream/40 p-3">
              <FileText className="h-8 w-8 shrink-0 text-gold" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{a.cv?.name}</p><p className="text-xs text-ink-medium">{kb(a.cv?.size)}</p></div>
            </div>
            <Button className="mt-3 w-full" loading={busy === 'cv'} onClick={getCv}><Download className="h-4 w-4" /> Download CV</Button>
          </Card>
          <Card className="card-pad space-y-4">
            <h2 className="text-lg text-forest">Pipeline</h2>
            <Field label="Status"><Select value={a.status} onChange={(e) => patch({ status: e.target.value }, 'status')} options={Object.entries(APP_STATUS).map(([value, [, label]]) => ({ value, label }))} /></Field>
            <div><span className="label">Your rating</span><Stars value={a.rating} onChange={(v) => patch({ rating: v }, 'rating')} size="h-5 w-5" /></div>
            <p className="text-xs text-ink-medium">Status changes are logged in the notes and the audit log.</p>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ======================= OPENINGS ======================= */
const blankOpening = { title: '', department: '', location: '', type: 'Full-time', workMode: 'On-site', experience: '', summary: '', responsibilities: '', requirements: '', active: true, sort: 0 };

export function Openings() {
  const { data, loading, reload } = useFetch('/admin/careers/openings');
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setEdit({ ...edit, [k]: v });
  const open = (o) => setEdit(o ? { ...o, responsibilities: (o.responsibilities || []).join('\n'), requirements: (o.requirements || []).join('\n') } : { ...blankOpening });
  const save = async () => {
    setBusy(true); setErr('');
    try { edit._id ? await api.patch(`/admin/careers/openings/${edit._id}`, edit) : await api.post('/admin/careers/openings', edit); setEdit(null); reload(); }
    catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  const remove = async (o) => {
    if (!window.confirm(`Delete “${o.title}”? Existing applications are kept.`)) return;
    await api.delete(`/admin/careers/openings/${o._id}`); reload();
  };
  const toggle = async (o) => { await api.patch(`/admin/careers/openings/${o._id}`, { active: !o.active }); reload(); };
  return (
    <>
      <PageHeader title="Careers" subtitle="Positions listed on the website. General applications are always accepted, even with no openings."
        actions={<Button onClick={() => open(null)}><Plus className="h-4 w-4" /> New position</Button>} />
      <CareersTabs active="/careers/openings" />
      <Card className="overflow-x-auto">
        {loading ? <PageLoader /> : !data?.length ? <Empty icon={UserRound} title="No positions yet" text="Add a position and it appears on the Careers page instantly." action={<Button onClick={() => open(null)}><Plus className="h-4 w-4" /> New position</Button>} /> : (
          <table className="table">
            <thead><tr><th>Position</th><th>Location</th><th>Type</th><th className="text-right">Applications</th><th>Status</th><th></th></tr></thead>
            <tbody>{data.map((o) => (
              <tr key={o._id} className={cx(!o.active && 'opacity-60')}>
                <td className="font-medium">{o.title}<span className="block text-xs font-normal text-ink-medium">{o.department}{o.experience ? ` · ${o.experience}` : ''}</span></td>
                <td>{o.location || '—'}<span className="block text-xs text-ink-medium">{o.workMode}</span></td>
                <td>{o.type}</td>
                <td className="text-right">{o.applications}</td>
                <td><button onClick={() => toggle(o)}>{o.active ? <Badge color="success">Live</Badge> : <Badge color="gray">Hidden</Badge>}</button></td>
                <td className="whitespace-nowrap text-right">
                  <button onClick={() => open(o)} className="rounded-md p-1.5 hover:bg-mist" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(o)} className="rounded-md p-1.5 text-danger hover:bg-danger/10" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
      <Modal wide open={!!edit} onClose={() => setEdit(null)} title={edit?._id ? 'Edit position' : 'New position'}
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save position</Button></>}>
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            {err && <Alert type="error" className="sm:col-span-2">{err}</Alert>}
            <Field label="Job title" className="sm:col-span-2"><Input value={edit.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Sourcing Executive" /></Field>
            <Field label="Department"><Input value={edit.department || ''} onChange={(e) => set('department', e.target.value)} placeholder="Sourcing, Sales, Technology…" /></Field>
            <Field label="Location"><Input value={edit.location || ''} onChange={(e) => set('location', e.target.value)} placeholder="Jaipur, India / Remote" /></Field>
            <Field label="Employment type"><Select value={edit.type} onChange={(e) => set('type', e.target.value)} options={['Full-time', 'Part-time', 'Contract', 'Internship']} /></Field>
            <Field label="Work mode"><Select value={edit.workMode} onChange={(e) => set('workMode', e.target.value)} options={['On-site', 'Hybrid', 'Remote']} /></Field>
            <Field label="Experience"><Input value={edit.experience || ''} onChange={(e) => set('experience', e.target.value)} placeholder="2–4 years" /></Field>
            <Field label="Sort order" hint="Lower shows first"><Input type="number" value={edit.sort ?? 0} onChange={(e) => set('sort', Number(e.target.value))} /></Field>
            <Field label="Short summary" className="sm:col-span-2"><Textarea rows={2} value={edit.summary || ''} onChange={(e) => set('summary', e.target.value)} /></Field>
            <Field label="Responsibilities (one per line)"><Textarea rows={6} value={edit.responsibilities} onChange={(e) => set('responsibilities', e.target.value)} /></Field>
            <Field label="Requirements (one per line)"><Textarea rows={6} value={edit.requirements} onChange={(e) => set('requirements', e.target.value)} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!edit.active} onChange={(e) => set('active', e.target.checked)} className="accent-forest" /> Show on website</label>
          </div>
        )}
      </Modal>
    </>
  );
}
