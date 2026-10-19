import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, BadgeCheck, Building2, CalendarClock, Check, CheckCircle2, ClipboardCheck, CreditCard, Download, ExternalLink, Factory,
  PenTool, FileText, Mail, MapPin, MessageSquare, Phone, RotateCcw, Search, Send, Upload, Video, XCircle,
} from 'lucide-react';
import api, { download, errMsg, fileUrl, uploadFiles } from '../lib/api';
import useFetch from '../lib/useFetch';
import { useAuth } from '../lib/auth';
import { date, dateTime, money, PERIOD_LABEL, timeAgo } from '../lib/format';
import Money from '../components/Money';
import { Alert, Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, PageLoader, Select, Tabs, Textarea, cx } from '../components/ui';

export const STAGE_COLOR = {
  submitted: 'gold', under_review: 'blue', info_requested: 'amber', verification_scheduled: 'blue', verified: 'green',
  nda_sent: 'sage', nda_signed: 'green', payment_pending: 'amber', active: 'success', rejected: 'red',
};
export const STAGE_TEXT = {
  submitted: 'Registration received', under_review: 'Under review', info_requested: 'Info requested', verification_scheduled: 'Verification scheduled',
  verified: 'Verified', nda_sent: 'NDA sent', nda_signed: 'NDA signed', payment_pending: 'Awaiting payment', active: 'Active', rejected: 'Rejected',
};
export const StageBadge = ({ stage }) => <Badge color={STAGE_COLOR[stage]}>{STAGE_TEXT[stage] || stage}</Badge>;
const OPEN = ['submitted', 'under_review', 'info_requested', 'verification_scheduled', 'verified', 'nda_sent', 'nda_signed', 'payment_pending'];
const STEP_TEXT = { not_required: 'Not required', pending: 'To schedule', scheduled: 'Scheduled', completed: 'Passed', failed: 'Failed' };
const STEP_COLOR = { not_required: 'gray', pending: 'amber', scheduled: 'blue', completed: 'success', failed: 'red' };
const daysSince = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 864e5);

function StepChip({ step, icon: Icon }) {
  if (!step || step.needed == null) return <span className="text-xs text-ink-medium">—</span>;
  const st = step.needed ? step.status : 'not_required';
  return <Badge color={STEP_COLOR[st]}><Icon className="h-3 w-3" />{STEP_TEXT[st]}</Badge>;
}

/* ============================== LIST ============================== */
export function Verifications() {
  const [sp, setSp] = useSearchParams();
  const stage = sp.get('stage') ?? 'open';
  const [q, setQ] = useState(sp.get('q') || '');
  const { data, loading } = useFetch(`/admin/suppliers?${new URLSearchParams({ stage, ...(sp.get('q') && { q: sp.get('q') }) })}`);
  const counts = data?.counts || {};
  const openCount = OPEN.reduce((s, k) => s + (counts[k] || 0), 0);
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <>
      <PageHeader title="Seller verification" subtitle="Supplier registrations → physical / virtual verification → NDA → plan payment → supplier code." />
      {openCount > 0 && (
        <Alert type="warning" className="mb-4"><b>{openCount}</b> supplier verification{openCount > 1 ? 's are' : ' is'} pending. Oldest first below — waiting days are counted from the last step.</Alert>
      )}
      <Tabs value={stage} onChange={(v) => setSp(v ? { stage: v } : { stage: '' })} tabs={[
        { value: 'open', label: 'Pending', count: openCount },
        ...OPEN.map((k) => ({ value: k, label: STAGE_TEXT[k], count: counts[k] || 0 })).filter((t) => t.count),
        { value: 'active', label: 'Active', count: counts.active || 0 },
        { value: 'rejected', label: 'Rejected', count: counts.rejected || 0 },
        { value: '', label: 'All', count: all },
      ]} />
      <form onSubmit={(e) => { e.preventDefault(); const n = new URLSearchParams(sp); q ? n.set('q', q) : n.delete('q'); setSp(n); }} className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-ink-medium" /><Input className="pl-9" placeholder="Company, GST, supplier code, city…" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>
      <Card className="overflow-hidden">
        {loading ? <PageLoader /> : !data?.list?.length ? <Empty icon={BadgeCheck} title="Nothing here" text="New supplier registrations appear here as soon as a seller submits the form." /> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Supplier</th><th>Location</th><th>Stage</th><th>A · Physical</th><th>B · Virtual</th><th>Waiting</th><th>Owner</th><th>Submitted</th></tr></thead>
              <tbody>{data.list.map((a) => {
                const waiting = daysSince(a.stageChangedAt || a.submittedAt);
                const open = OPEN.includes(a.stage);
                return (
                  <tr key={a._id} className={cx(open && waiting >= 3 && 'bg-warning/5')}>
                    <td className={cx('border-l-4', open ? 'border-l-gold' : 'border-l-transparent')}>
                      <Link to={`/verifications/${a._id}`} className="font-medium text-forest hover:underline">{a.companyName}</Link>
                      <span className="block text-xs text-ink-medium">{a.number}{a.supplierCode && ` · ${a.supplierCode}`} · {a.contactName}</span>
                    </td>
                    <td className="text-sm">{[a.city, a.state].filter(Boolean).join(', ')}<span className="block text-xs text-ink-medium">{a.country}</span></td>
                    <td><StageBadge stage={a.stage} /></td>
                    <td><StepChip step={a.physical} icon={Factory} />{a.physical?.scheduledAt && a.physical.status === 'scheduled' && <span className="block text-[11px] text-ink-medium">{dateTime(a.physical.scheduledAt)}</span>}</td>
                    <td><StepChip step={a.virtual} icon={Video} />{a.virtual?.scheduledAt && a.virtual.status === 'scheduled' && <span className="block text-[11px] text-ink-medium">{dateTime(a.virtual.scheduledAt)}</span>}</td>
                    <td>{open ? <span className={cx('text-sm', waiting >= 3 ? 'font-medium text-danger' : 'text-ink-medium')}>{waiting === 0 ? 'Today' : `${waiting} day${waiting > 1 ? 's' : ''}`}</span> : '—'}</td>
                    <td className="text-sm text-ink-medium">{a.assignedTo?.name || '—'}</td>
                    <td className="whitespace-nowrap text-ink-medium">{date(a.submittedAt)}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

/* ============================== DETAIL ============================== */
const FLOW = [
  { key: 'reg', label: 'Registration', stages: ['submitted', 'info_requested'] },
  { key: 'review', label: 'Verification', stages: ['under_review', 'verification_scheduled', 'verified'] },
  { key: 'nda', label: 'NDA', stages: ['nda_sent', 'nda_signed'] },
  { key: 'pay', label: 'Plan & payment', stages: ['payment_pending'] },
  { key: 'active', label: 'Supplier code', stages: ['active'] },
];

function Stepper({ stage }) {
  const idx = stage === 'rejected' ? -1 : FLOW.findIndex((f) => f.stages.includes(stage));
  return (
    <ol className="grid grid-cols-5 gap-2">
      {FLOW.map((f, i) => {
        const done = i < idx || stage === 'active';
        const current = i === idx && stage !== 'active';
        return (
          <li key={f.key} className="flex flex-col items-center text-center">
            <span className={cx('flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium ring-2', done ? 'bg-forest text-white ring-forest' : current ? 'bg-gold text-white ring-gold' : 'bg-white text-ink-medium ring-line')}>
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cx('mt-1.5 text-[11px] leading-tight', current ? 'font-medium text-forest' : 'text-ink-medium')}>{f.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

const Row = ({ label, children }) => (
  <div className="grid grid-cols-[150px_1fr] gap-3 border-t border-mist py-2 text-sm first:border-t-0">
    <span className="text-ink-medium">{label}</span><span className="min-w-0 break-words">{children || '—'}</span>
  </div>
);

export function VerificationDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const { data, setData, loading, error } = useFetch(`/admin/suppliers/${id}`);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [note, setNote] = useState('');
  if (loading && !data) return <PageLoader />;
  if (error) return <Alert type="error">{error}</Alert>;
  const a = data.application;
  const plans = (data.plans || []).filter((p) => p.active && !p.customPricing && p.price > 0);
  const canWork = can('verify');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const act = async (path, body, ok) => {
    setBusy(true); setMsg(null);
    try {
      const { data: app } = await api.post(`/admin/suppliers/${id}/${path}`, body);
      setData({ ...data, application: app });
      setModal(null); setForm({});
      if (ok) setMsg({ type: 'success', t: ok });
    } catch (x) { setMsg({ type: 'error', t: errMsg(x) }); } finally { setBusy(false); }
  };
  const upload = async (e, key) => {
    if (!e.target.files?.length) return;
    try { const [f] = await uploadFiles([e.target.files[0]]); setForm((x) => ({ ...x, [key]: f })); } catch (x) { setMsg({ type: 'error', t: errMsg(x) }); }
  };
  const waiting = daysSince(a.stageChangedAt || a.submittedAt);
  const open = OPEN.includes(a.stage);
  const layersChosen = a.physical?.needed != null || a.virtual?.needed != null;
  const pendingLayers = ['physical', 'virtual'].filter((k) => a[k]?.needed && a[k]?.status !== 'completed');

  /* ---------- "Next step" panel by stage ---------- */
  let next = null;
  if (['submitted', 'info_requested', 'under_review', 'verification_scheduled', 'verified'].includes(a.stage)) {
    next = (
      <>
        {a.stage === 'info_requested' && <Alert type="warning" className="mb-4">Waiting for the supplier to update their registration: “{a.infoRequest?.message}”</Alert>}
        {!layersChosen || ['submitted', 'info_requested'].includes(a.stage) ? (
          <div>
            <p className="font-medium text-ink">Choose the verification layers for this supplier</p>
            <p className="mb-3 text-sm text-ink-medium">You can change these until the verification is approved.</p>
            <LayerChoice a={a} disabled={!canWork || busy} onSave={(v) => act('review', v, 'Verification options saved — supplier notified.')} />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="font-medium text-ink">{pendingLayers.length ? `Complete the ${pendingLayers.join(' and ')} verification, then approve.` : 'All required verification is complete — approve to send the NDA.'}</p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!canWork} onClick={() => { setForm({ recommendedPlan: a.recommendedPlan || plans.find((p) => p.highlighted)?.key || plans[0]?.key || '', force: pendingLayers.length > 0 }); setModal('approve'); }}><BadgeCheck className="h-4 w-4" /> Approve & send NDA</Button>
              <Button variant="outline" disabled={!canWork} onClick={() => setModal('layers')}>Change layers</Button>
            </div>
          </div>
        )}
      </>
    );
  } else if (a.stage === 'nda_sent') {
    next = (
      <div className="space-y-3">
        <p className="font-medium text-ink">NDA sent {timeAgo(a.nda?.sentAt)} — waiting for the supplier to sign.</p>
        <p className="text-sm text-ink-medium">They can e-sign in their dashboard or upload a signed copy. If they signed on paper, upload it here.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!canWork} loading={busy} onClick={() => act('resend-nda', {}, 'NDA re-sent.')}><Send className="h-4 w-4" /> Resend NDA</Button>
          <Button variant="outline" disabled={!canWork} onClick={() => { setForm({ signerName: a.contactName }); setModal('ndaOffline'); }}><PenTool className="h-4 w-4" /> Mark signed (offline)</Button>
        </div>
      </div>
    );
  } else if (a.stage === 'nda_signed' || a.stage === 'payment_pending') {
    next = (
      <div className="space-y-3">
        <p className="font-medium text-ink">{a.stage === 'nda_signed' ? 'NDA signed — send the plan details & payment link.' : `Plan details & payment link sent ${timeAgo(a.payment?.sentAt)}. Waiting for payment.`}</p>
        {a.payment?.planName && <p className="text-sm text-ink-medium">Suggested plan: <b>{a.payment.planName}</b> · <Money value={a.payment.amount} currency={a.payment.currency} digits={0} /></p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!can('markPaid')} onClick={() => { setForm({ planKey: a.payment?.planKey || '' }); setModal('sendPay'); }}><Send className="h-4 w-4" /> {a.stage === 'nda_signed' ? 'Send payment link' : 'Resend / change plan'}</Button>
          {a.stage === 'payment_pending' && <Button disabled={!can('markPaid')} onClick={() => { setForm({ planKey: a.payment?.planKey || '', method: 'bank_transfer', ref: '', amount: '' }); setModal('paid'); }}><CreditCard className="h-4 w-4" /> Mark payment received</Button>}
        </div>
      </div>
    );
  } else if (a.stage === 'active') {
    next = (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-ink-medium">Supplier code</p>
          <p className="font-serif text-3xl tracking-wide text-forest">{a.supplierCode}</p>
          <p className="text-sm text-ink-medium">{a.payment?.planName} · paid {date(a.payment?.paidAt)} via {String(a.payment?.method || '').replace('_', ' ')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => download(`/admin/suppliers/${id}/invoice`, `Invoice-${a.payment?.invoiceNumber}.pdf`).catch((x) => setMsg({ type: 'error', t: errMsg(x) }))}><Download className="h-4 w-4" /> Invoice</Button>
          <Link to={`/sellers/${a.user?._id}`} className="btn-primary"><Building2 className="h-4 w-4" /> Seller profile</Link>
        </div>
      </div>
    );
  } else if (a.stage === 'rejected') {
    next = (
      <div className="space-y-3">
        <Alert type="error">Rejected {date(a.decision?.at)}{a.decision?.by?.name ? ` by ${a.decision.by.name}` : ''}: {a.decision?.reason}</Alert>
        <Button variant="outline" disabled={!canWork} loading={busy} onClick={() => act('reopen', {}, 'Application reopened.')}><RotateCcw className="h-4 w-4" /> Reopen</Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader back={<Link to="/verifications" className="mb-2 inline-flex items-center gap-1 text-sm text-ink-medium hover:text-forest"><ArrowLeft className="h-4 w-4" /> Seller verification</Link>}
        title={a.companyName}
        subtitle={<span className="flex flex-wrap items-center gap-2">{a.number} · submitted {dateTime(a.submittedAt)} <StageBadge stage={a.stage} />{open && waiting >= 3 && <Badge color="red"><AlertTriangle className="h-3 w-3" /> waiting {waiting} days</Badge>}</span>}
        actions={open && canWork && <>
          <Button variant="outline" onClick={() => { setForm({ message: '' }); setModal('info'); }}><MessageSquare className="h-4 w-4" /> Request info</Button>
          <Button variant="danger" onClick={() => { setForm({ reason: '' }); setModal('reject'); }}><XCircle className="h-4 w-4" /> Reject</Button>
        </>} />
      {msg && <Alert type={msg.type} className="mb-5">{msg.t}</Alert>}

      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
        <div className="space-y-6">
          <Card className="card-pad">
            <Stepper stage={a.stage} />
            <div className="mt-6 rounded-xl bg-cream/70 p-4 ring-1 ring-beige">{next}</div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {[['physical', 'A · Physical verification', Factory], ['virtual', 'B · Virtual verification (Teams / Zoom)', Video]].map(([k, title, Icon]) => {
              const s = a[k] || {};
              return (
                <Card key={k} className="card-pad">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-base text-forest"><Icon className="h-4 w-4 text-gold" />{title}</h3>
                    <StepChip step={s} icon={k === 'physical' ? Factory : Video} />
                  </div>
                  {s.needed == null ? <p className="mt-3 text-sm text-ink-medium">Required? Not decided yet.</p> : !s.needed ? <p className="mt-3 text-sm text-ink-medium">Required: <b>No</b></p> : (
                    <div className="mt-3 space-y-1 text-sm">
                      <p>Required: <b>Yes</b></p>
                      {s.scheduledAt && <p className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5 text-gold" />{dateTime(s.scheduledAt)}</p>}
                      {s.assignee && <p className="text-ink-medium">{k === 'physical' ? 'Visiting' : 'Host'}: {s.assignee}</p>}
                      {k === 'physical' && s.location && <p className="flex items-start gap-1.5 text-ink-medium"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{s.location}</p>}
                      {k === 'virtual' && s.link && <a href={s.link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-forest underline"><ExternalLink className="h-3.5 w-3.5" />{s.platform || 'Meeting'} link</a>}
                      {s.notes && <p className="whitespace-pre-line text-ink-medium">{s.notes}</p>}
                      {s.report?.url && <a href={fileUrl(s.report.url)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-forest underline"><FileText className="h-3.5 w-3.5" />Verification report</a>}
                      {s.completedAt && <p className="text-xs text-ink-medium">Completed {dateTime(s.completedAt)}</p>}
                      {canWork && !['active', 'rejected', 'nda_sent', 'nda_signed', 'payment_pending'].includes(a.stage) && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button size="sm" variant="outline" onClick={() => { setForm({ kind: k, scheduledAt: s.scheduledAt ? new Date(new Date(s.scheduledAt).getTime() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '', assignee: s.assignee || '', location: s.location || a.factoryAddress, platform: s.platform || 'Zoom', link: s.link || '', notes: s.notes || '', notifySeller: true }); setModal('schedule'); }}>
                            <CalendarClock className="h-3.5 w-3.5" /> {s.scheduledAt ? 'Reschedule' : 'Schedule'}
                          </Button>
                          {s.status !== 'completed' && <Button size="sm" onClick={() => { setForm({ kind: k, result: 'pass', notes: '' }); setModal('complete'); }}><ClipboardCheck className="h-3.5 w-3.5" /> Record result</Button>}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <Card className="card-pad">
            <h3 className="text-lg text-forest">Registration details</h3>
            <div className="mt-3 grid gap-x-8 md:grid-cols-2">
              <div>
                <Row label="Company name">{a.companyName}</Row>
                <Row label="Contact person">{a.contactName}</Row>
                <Row label="Contact number"><a href={`tel:${a.contactNumber}`} className="text-forest hover:underline">{a.contactNumber}</a></Row>
                <Row label="Email"><a href={`mailto:${a.email}`} className="text-forest hover:underline">{a.email}</a></Row>
                <Row label="Address">{a.address}</Row>
                <Row label="City / State">{[a.city, a.state].filter(Boolean).join(', ')}{a.postalCode && ` – ${a.postalCode}`}</Row>
                <Row label="Country">{a.country}</Row>
                <Row label="GST / Tax ID"><span className="font-mono">{a.gst}</span></Row>
                <Row label="Factory address">{a.factoryAddress}</Row>
                <Row label="Company type">{a.companyType}</Row>
                <Row label="Established">{a.establishedYear}</Row>
              </div>
              <div>
                <Row label="Turnover"><Money value={a.turnover?.amount} currency={a.turnover?.currency === 'INR' ? 'INR' : 'USD'} digits={0} />{!['INR', 'USD'].includes(a.turnover?.currency) && ` (${a.turnover?.currency} ${Number(a.turnover?.amount).toLocaleString()})`}</Row>
                <Row label="Employees">{a.employees?.toLocaleString()}</Row>
                <Row label="Factory units">{a.factoryUnits}</Row>
                <Row label="Production capacity">{a.productionCapacity} × {String(a.containerSize || '40ft').replace('_hc', ' HC')} containers / month</Row>
                <Row label="Product categories">{a.productCategoriesCount}{a.categories?.length > 0 && <span className="block text-xs text-ink-medium">{a.categories.join(', ')}</span>}</Row>
                <Row label="Number of SKUs">{a.skuCount?.toLocaleString()}</Row>
                <Row label="Exporting since">{a.exportingSince}</Row>
                <Row label="Export markets">{a.exportMarkets?.join(', ')}</Row>
                <Row label="Certifications">{a.certifications?.join(', ')}</Row>
                <Row label="Factory compliance">{{ certified: 'Certified', checked: 'Checked (not certified)', in_progress: 'In progress', no: 'No' }[a.compliance?.status]}{a.compliance?.audits?.length > 0 && ` — ${a.compliance.audits.join(', ')}`}{a.compliance?.details && <span className="block text-xs text-ink-medium">{a.compliance.details}</span>}</Row>
                <Row label="Website">{a.website ? <a href={a.website} target="_blank" rel="noreferrer" className="text-forest underline">{a.website.replace(/^https?:\/\//, '')}</a> : null}</Row>
              </div>
            </div>
            {a.description && <p className="mt-4 whitespace-pre-line rounded-lg bg-cream/60 p-3 text-sm">{a.description}</p>}
          </Card>

          <Card className="card-pad">
            <h3 className="text-lg text-forest">Documents</h3>
            {!a.documents?.length ? <p className="mt-2 text-sm text-ink-medium">No documents uploaded yet.</p> : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">{a.documents.map((d) => (
                <li key={d.url}><a href={fileUrl(d.url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg p-2 text-sm text-forest ring-1 ring-beige hover:bg-cream"><FileText className="h-4 w-4 shrink-0 text-gold" /><span className="truncate">{d.name}</span>{d.kind && d.kind !== 'other' && <Badge className="ml-auto">{d.kind}</Badge>}</a></li>
              ))}</ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="card-pad space-y-2 text-sm">
            <p className="eyebrow">Account</p>
            <Link to={`/sellers/${a.user?._id}`} className="block font-serif text-lg text-forest hover:underline">{a.user?.company || a.companyName}</Link>
            <p className="flex items-center gap-2 text-ink-medium"><Mail className="h-3.5 w-3.5" />{a.user?.email}</p>
            {a.user?.phone && <p className="flex items-center gap-2 text-ink-medium"><Phone className="h-3.5 w-3.5" />{a.user.phone}</p>}
            <p className="text-ink-medium">Email verified: {a.user?.emailVerified ? 'Yes' : 'No'} · Joined {date(a.user?.createdAt)}</p>
            <Field label="Owner" className="pt-2">
              <Select value={a.assignedTo?._id || ''} disabled={!canWork} onChange={(e) => act('assign', { adminId: e.target.value, adminName: e.target.selectedOptions[0]?.text }, 'Owner updated.')}
                options={(data.team || []).map((t) => ({ value: t._id, label: t.name }))} placeholder="Unassigned" />
            </Field>
          </Card>

          <Card className="card-pad text-sm">
            <p className="eyebrow">NDA</p>
            {!a.nda?.sentAt ? <p className="mt-2 text-ink-medium">Sent automatically when the verification is approved.</p> : (
              <div className="mt-2 space-y-1">
                <p>Sent {dateTime(a.nda.sentAt)} · v{a.nda.version}</p>
                {a.nda.signedAt ? <p className="font-medium text-[#1e7b34]">✓ Signed {dateTime(a.nda.signedAt)} by {a.nda.signerName}{a.nda.signerTitle && `, ${a.nda.signerTitle}`} ({a.nda.method})</p> : <p className="text-warning">Not signed yet</p>}
                {a.nda.signerIp && <p className="text-xs text-ink-medium">IP {a.nda.signerIp}</p>}
                <div className="flex flex-wrap gap-3 pt-1">
                  <button className="inline-flex items-center gap-1 text-forest underline" onClick={() => download(`/admin/suppliers/${id}/nda`, `NDA-${a.number}.pdf`).catch((x) => setMsg({ type: 'error', t: errMsg(x) }))}><Download className="h-3.5 w-3.5" />{a.nda.signedAt ? 'Signed NDA (PDF)' : 'NDA (PDF)'}</button>
                  {a.nda.signedCopy?.url && <a href={fileUrl(a.nda.signedCopy.url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-forest underline"><FileText className="h-3.5 w-3.5" />Uploaded copy</a>}
                </div>
              </div>
            )}
          </Card>

          <Card className="card-pad text-sm">
            <p className="eyebrow">Plan & payment</p>
            {!a.payment?.sentAt && !a.payment?.paidAt ? <p className="mt-2 text-ink-medium">Plan details & payment link go out automatically after the NDA is signed.</p> : (
              <div className="mt-2 space-y-1">
                <p>{a.payment.planName} · <Money value={a.payment.amount} currency={a.payment.currency} digits={0} /> {PERIOD_LABEL[a.payment.billingPeriod] || ''}</p>
                {a.payment.sentAt && <p className="text-ink-medium">Link sent {dateTime(a.payment.sentAt)}</p>}
                {a.payment.paidAt ? <p className="font-medium text-[#1e7b34]">✓ Paid {dateTime(a.payment.paidAt)} · {String(a.payment.method).replace('_', ' ')}{a.payment.ref && ` · ${a.payment.ref}`}</p> : <p className="text-warning">Awaiting payment</p>}
                {a.payment.invoiceNumber && <p>Invoice {a.payment.invoiceNumber}</p>}
              </div>
            )}
          </Card>

          <Card className="card-pad">
            <p className="eyebrow">Internal notes</p>
            <form onSubmit={(e) => { e.preventDefault(); if (note.trim()) act('note', { text: note }).then(() => setNote('')); }} className="mt-3 flex gap-2">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Only visible to the admin team" />
              <Button variant="outline" disabled={!note.trim()}>Add</Button>
            </form>
            <ul className="mt-3 space-y-2">{[...(a.notes || [])].reverse().map((n, i) => (
              <li key={i} className="rounded-lg bg-cream/70 p-2.5 text-sm"><p className="whitespace-pre-line">{n.text}</p><p className="mt-1 text-[11px] text-ink-medium">{n.by?.name} · {timeAgo(n.at)}</p></li>
            ))}</ul>
          </Card>

          <Card className="card-pad">
            <p className="eyebrow">Activity</p>
            <ol className="mt-3 space-y-3 border-l border-beige pl-4">{[...(a.log || [])].reverse().map((l, i) => (
              <li key={i} className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-gold" />
                <p className="font-medium text-ink">{l.action.replace(/[._]/g, ' ')}</p>
                {l.note && <p className="whitespace-pre-line text-ink-medium">{l.note}</p>}
                <p className="text-[11px] text-ink-medium">{l.byName || 'System'} · {dateTime(l.at)}</p>
              </li>
            ))}</ol>
          </Card>
        </div>
      </div>

      {/* ---------------- Modals ---------------- */}
      <Modal open={modal === 'layers'} onClose={() => setModal(null)} title="Verification layers">
        <LayerChoice a={a} disabled={busy} onSave={(v) => act('review', { ...v, notifySeller: false }, 'Verification options updated.')} />
      </Modal>

      <Modal open={modal === 'schedule'} onClose={() => setModal(null)} title={form.kind === 'virtual' ? 'Schedule virtual verification' : 'Schedule factory visit'}
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button loading={busy} disabled={!form.scheduledAt} onClick={() => act('schedule', { ...form, scheduledAt: new Date(form.scheduledAt).toISOString() }, 'Scheduled — supplier notified by email.')}>Save schedule</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date & time"><Input type="datetime-local" value={form.scheduledAt || ''} onChange={set('scheduledAt')} /></Field>
          <Field label={form.kind === 'virtual' ? 'Host' : 'Team member visiting'}><Input value={form.assignee || ''} onChange={set('assignee')} list="team-names" placeholder="Name" /></Field>
          <datalist id="team-names">{(data.team || []).map((t) => <option key={t._id} value={t.name} />)}</datalist>
          {form.kind === 'virtual' ? (
            <>
              <Field label="Platform"><Select value={form.platform || 'Zoom'} onChange={set('platform')} options={['Zoom', 'Microsoft Teams', 'Google Meet', 'WhatsApp video']} /></Field>
              <Field label="Meeting link"><Input value={form.link || ''} onChange={set('link')} placeholder="https://" /></Field>
            </>
          ) : <Field label="Visit address" className="sm:col-span-2"><Textarea rows={2} value={form.location || ''} onChange={set('location')} /></Field>}
          <Field label="Notes for the supplier (optional)" className="sm:col-span-2"><Textarea rows={2} value={form.notes || ''} onChange={set('notes')} placeholder="Documents to keep ready, who to ask for at the gate…" /></Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="accent-forest" checked={form.notifySeller !== false} onChange={set('notifySeller')} /> Email the supplier with these details</label>
        </div>
      </Modal>

      <Modal open={modal === 'complete'} onClose={() => setModal(null)} title={`Record ${form.kind === 'virtual' ? 'virtual' : 'physical'} verification result`}
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button loading={busy} onClick={() => act('complete', form, 'Result recorded.')}>Save result</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[['pass', 'Passed', CheckCircle2], ['fail', 'Failed', XCircle]].map(([v, l, I]) => (
              <button key={v} type="button" onClick={() => setForm({ ...form, result: v })} className={cx('flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-medium', form.result === v ? (v === 'pass' ? 'border-forest bg-forest/5 text-forest' : 'border-danger bg-danger/5 text-danger') : 'border-line')}><I className="h-4 w-4" />{l}</button>
            ))}
          </div>
          <Field label="Findings / notes"><Textarea rows={3} value={form.notes || ''} onChange={set('notes')} placeholder="Capacity observed, compliance, quality, red flags…" /></Field>
          <Field label="Report / photos (optional)"><label className="btn-outline cursor-pointer"><Upload className="h-4 w-4" />{form.report?.name || 'Upload file'}<input type="file" className="hidden" onChange={(e) => upload(e, 'report')} /></label></Field>
        </div>
      </Modal>

      <Modal open={modal === 'approve'} onClose={() => setModal(null)} title="Approve verification"
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button loading={busy} onClick={() => act('approve', form, 'Approved — NDA emailed to the supplier.')}><BadgeCheck className="h-4 w-4" /> Approve & send NDA</Button></>}>
        {pendingLayers.length > 0 && <Alert type="warning" className="mb-4">The {pendingLayers.join(' and ')} verification is not marked complete. Approving now will skip it.</Alert>}
        <p className="mb-4 text-sm text-ink-medium">The supplier receives the NDA by email (PDF attached) and in their dashboard. After they sign, plan details and a payment link go out automatically.</p>
        <div className="grid gap-4">
          <Field label="Suggested plan"><Select value={form.recommendedPlan || ''} onChange={set('recommendedPlan')} options={plans.map((p) => ({ value: p.key, label: `${p.name} — ${money(p.price, p.currency)} ${PERIOD_LABEL[p.billingPeriod] || ''}` }))} placeholder="Let the supplier choose" /></Field>
          <Field label="Internal note (optional)"><Textarea rows={2} value={form.note || ''} onChange={set('note')} /></Field>
        </div>
      </Modal>

      <Modal open={modal === 'reject'} onClose={() => setModal(null)} title="Reject registration"
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button variant="danger" loading={busy} disabled={!form.reason?.trim()} onClick={() => act('reject', form, 'Rejected — supplier notified.')}>Reject</Button></>}>
        <Field label="Reason (sent to the supplier)"><Textarea rows={3} value={form.reason || ''} onChange={set('reason')} placeholder="e.g. Factory capacity does not meet our minimum for this category." /></Field>
      </Modal>

      <Modal open={modal === 'info'} onClose={() => setModal(null)} title="Request more information"
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button loading={busy} disabled={!form.message?.trim()} onClick={() => act('request-info', form, 'Request sent to the supplier.')}><Send className="h-4 w-4" /> Send</Button></>}>
        <p className="mb-3 text-sm text-ink-medium">The supplier can edit and resubmit their registration form.</p>
        <Field label="What needs to change?"><Textarea rows={4} value={form.message || ''} onChange={set('message')} placeholder="e.g. Please upload your GST certificate and correct the factory address." /></Field>
      </Modal>

      <Modal open={modal === 'ndaOffline'} onClose={() => setModal(null)} title="Mark NDA as signed"
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button loading={busy} disabled={!form.signerName} onClick={() => act('nda-signed', form, 'NDA recorded — plan details & payment link sent.')}>Save</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Signed by"><Input value={form.signerName || ''} onChange={set('signerName')} /></Field>
          <Field label="Designation"><Input value={form.signerTitle || ''} onChange={set('signerTitle')} /></Field>
          <Field label="Signed copy" className="sm:col-span-2"><label className="btn-outline cursor-pointer"><Upload className="h-4 w-4" />{form.file?.name || 'Upload scan / PDF'}<input type="file" className="hidden" onChange={(e) => upload(e, 'file')} /></label></Field>
        </div>
      </Modal>

      <Modal open={modal === 'sendPay'} onClose={() => setModal(null)} title="Send plan details & payment link"
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button loading={busy} onClick={() => act('send-payment', form, 'Plan details & payment link emailed.')}><Send className="h-4 w-4" /> Send</Button></>}>
        <p className="mb-3 text-sm text-ink-medium">The email lists every active paid seller plan with the suggested one highlighted. The supplier pays securely from their dashboard.</p>
        <Field label="Suggested plan"><Select value={form.planKey || ''} onChange={set('planKey')} options={plans.map((p) => ({ value: p.key, label: `${p.name} — ${money(p.price, p.currency)} ${PERIOD_LABEL[p.billingPeriod] || ''}` }))} placeholder="Keep current suggestion" /></Field>
      </Modal>

      <Modal open={modal === 'paid'} onClose={() => setModal(null)} title="Mark payment received"
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button loading={busy} disabled={!form.planKey} onClick={() => act('mark-paid', form, 'Payment recorded — invoice emailed and supplier code generated.')}>Confirm payment</Button></>}>
        <p className="mb-4 text-sm text-ink-medium">For bank transfer / UPI / cheque payments. This generates the invoice and supplier code, activates the seller and emails them the invoice.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Plan"><Select value={form.planKey || ''} onChange={set('planKey')} options={plans.map((p) => ({ value: p.key, label: `${p.name} — ${money(p.price, p.currency)}` }))} placeholder="Choose" /></Field>
          <Field label="Method"><Select value={form.method} onChange={set('method')} options={[{ value: 'bank_transfer', label: 'Bank transfer' }, { value: 'upi', label: 'UPI' }, { value: 'cheque', label: 'Cheque' }, { value: 'cash', label: 'Cash' }, { value: 'waived', label: 'Waived / complimentary' }, { value: 'other', label: 'Other' }]} /></Field>
          <Field label="Amount received" hint="Leave empty to use the plan price"><Input type="number" min="0" value={form.amount || ''} onChange={set('amount')} /></Field>
          <Field label="Transaction reference"><Input value={form.ref || ''} onChange={set('ref')} placeholder="UTR / UPI ref / cheque no." /></Field>
        </div>
      </Modal>
    </>
  );
}

function LayerChoice({ a, disabled, onSave }) {
  const [v, setV] = useState({ physicalNeeded: a.physical?.needed ?? null, virtualNeeded: a.virtual?.needed ?? null });
  const Opt = ({ k, label, icon: Icon }) => (
    <div className="rounded-xl bg-white p-3 ring-1 ring-beige">
      <p className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-gold" />{label}</p>
      <div className="mt-2 flex gap-2">
        {[[true, 'Yes'], [false, 'No']].map(([val, l]) => (
          <button key={l} type="button" disabled={disabled} onClick={() => setV({ ...v, [k]: val })} className={cx('flex-1 rounded-lg border px-3 py-1.5 text-sm transition', v[k] === val ? 'border-forest bg-forest text-white' : 'border-line hover:border-gold')}>{l}</button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Opt k="physicalNeeded" label="A · Physical verification required?" icon={Factory} />
        <Opt k="virtualNeeded" label="B · Virtual verification (Teams / Zoom) required?" icon={Video} />
      </div>
      <Button disabled={disabled || v.physicalNeeded == null || v.virtualNeeded == null} onClick={() => onSave(v)}>Save verification options</Button>
    </div>
  );
}
