import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BadgeCheck, CalendarClock, Check, Download, ExternalLink, Factory, FileText, PenLine, ShieldCheck, Upload, Video } from 'lucide-react';
import api, { download, errMsg, fileUrl } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { date, dateTime } from '../../lib/format';
import SupplierForm, { blankSupplier, fromApplication } from '../../components/SupplierForm';
import PlanCard from '../../components/PlanCard';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, PageLoader, Select, cx } from '../../components/ui';

const FLOW = [
  { label: 'Registration', stages: ['submitted', 'info_requested'] },
  { label: 'Verification', stages: ['under_review', 'verification_scheduled', 'verified'] },
  { label: 'Sign NDA', stages: ['nda_sent'] },
  { label: 'Plan & payment', stages: ['nda_signed', 'payment_pending'] },
  { label: 'Supplier code', stages: ['active'] },
];
const DOC_KINDS = [['gst', 'GST certificate'], ['registration', 'Company registration'], ['iec', 'IEC / export licence'], ['certificate', 'Certification'], ['compliance', 'Compliance audit report'], ['catalogue', 'Catalogue / photos'], ['other', 'Other']];

function Tracker({ stage }) {
  const idx = FLOW.findIndex((f) => f.stages.includes(stage));
  return (
    <ol className="flex items-start gap-1">
      {FLOW.map((f, i) => {
        const done = i < idx || stage === 'active';
        const current = i === idx && stage !== 'active';
        return (
          <li key={f.label} className="flex flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <span className={cx('h-0.5 flex-1', i === 0 ? 'bg-transparent' : done || current ? 'bg-forest' : 'bg-line')} />
              <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium ring-2', done ? 'bg-forest text-white ring-forest' : current ? 'bg-gold text-white ring-gold' : 'bg-white text-ink-medium ring-line')}>{done ? <Check className="h-4 w-4" /> : i + 1}</span>
              <span className={cx('h-0.5 flex-1', i === FLOW.length - 1 ? 'bg-transparent' : done ? 'bg-forest' : 'bg-line')} />
            </div>
            <span className={cx('mt-2 text-[11px] leading-tight sm:text-xs', current ? 'font-medium text-forest' : 'text-ink-medium')}>{f.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function SellerVerification() {
  const { user, refresh } = useAuth();
  const [sp, setSp] = useSearchParams();
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [sign, setSign] = useState({ signerName: '', signerTitle: '', agree: false });
  const [plan, setPlan] = useState('');
  const [docKind, setDocKind] = useState('gst');
  const fileRef = useRef(null);
  const ndaFileRef = useRef(null);

  const load = async () => {
    const { data: d } = await api.get('/supplier/application');
    setData(d);
    if (d.application) setForm(fromApplication(d.application));
    else setForm(blankSupplier({ companyName: user.company || '', contactName: user.name, email: user.email, contactNumber: user.phone || '', country: user.seller?.country || 'India', categories: user.seller?.categories || [], website: user.seller?.website || '', description: user.seller?.description || '' }));
    setPlan(d.application?.payment?.planKey || d.plans?.find((p) => p.highlighted)?.key || d.plans?.[0]?.key || '');
    return d;
  };
  useEffect(() => {
    (async () => {
      const d = await load().catch((x) => { setMsg({ type: 'error', t: errMsg(x) }); return null; });
      const paid = sp.get('paid');
      if (paid && d?.application && !d.application.payment?.paidAt) {
        setBusy('verify');
        try { await api.post('/supplier/pay/verify', { sessionId: paid }); await load(); await refresh(); setMsg({ type: 'success', t: 'Payment received — welcome to Ranavista!' }); } catch (x) { setMsg({ type: 'error', t: errMsg(x) }); } finally { setBusy(''); setSp({}, { replace: true }); }
      } else if (sp.get('canceled')) setMsg({ type: 'info', t: 'Payment was cancelled — you can try again below.' });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (key, fn, ok) => {
    setBusy(key); setMsg(null);
    try { await fn(); await load(); await refresh(); if (ok) setMsg({ type: 'success', t: ok }); setEditing(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    catch (x) { setMsg({ type: 'error', t: errMsg(x) }); } finally { setBusy(''); }
  };

  if (!data || !form) return <PageLoader />;
  const a = data.application;
  const editable = !a || ['submitted', 'info_requested'].includes(a.stage);
  const showForm = !a || a.stage === 'info_requested' || editing;

  const pay = async () => {
    setBusy('pay'); setMsg(null);
    try {
      const { data: d } = await api.post('/supplier/pay', { planKey: plan });
      if (d.url) { window.location.href = d.url; return; }
      await load(); await refresh();
      setMsg({ type: 'success', t: d.demo ? 'Payment simulated (demo mode) — your supplier account is active.' : 'Payment received.' });
    } catch (x) { setMsg({ type: 'error', t: errMsg(x) }); } finally { setBusy(''); }
  };
  const uploadDocs = (files) => run('docs', async () => {
    const fd = new FormData();
    [...files].forEach((f) => fd.append('files', f));
    fd.append('kind', docKind);
    await api.post('/supplier/application/documents', fd);
  }, 'Documents uploaded.');
  const uploadNda = (file) => run('ndaUpload', async () => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('signerName', sign.signerName || a.contactName);
    fd.append('signerTitle', sign.signerTitle);
    await api.post('/supplier/nda/upload', fd);
  }, 'Signed NDA received — your plan details are below.');

  return (
    <>
      <PageHeader title="Supplier verification" subtitle="Registration → verification → NDA → plan payment → supplier code." />
      {msg && <Alert type={msg.type} className="mb-5">{msg.t}</Alert>}
      {busy === 'verify' && <Alert type="info" className="mb-5">Confirming your payment…</Alert>}

      {!a && user.seller?.approval === 'approved' && <Alert type="info" className="mb-5">Your company was verified before our new registration process. Completing the form below keeps your profile up to date for buyers and our team.</Alert>}

      {a && (
        <Card className="card-pad mb-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink-medium">Reference <b className="text-ink">{a.number}</b> · submitted {date(a.submittedAt)}</p>
            <Badge color={a.stage === 'active' ? 'success' : a.stage === 'rejected' ? 'red' : 'gold'}>{data.stageLabels?.[a.stage] || a.stage}</Badge>
          </div>
          {a.stage !== 'rejected' && <Tracker stage={a.stage} />}

          <div className="mt-6">
            {a.stage === 'submitted' && <Alert type="info">Thank you! Our team is reviewing your registration. We’ll let you know if a factory visit or a video call is needed. You can still edit your details until the review starts.</Alert>}
            {a.stage === 'info_requested' && <Alert type="warning"><b>Please update your registration:</b> {a.infoRequest?.message}</Alert>}
            {a.stage === 'rejected' && <Alert type="error">We couldn’t approve your registration{a.decision?.reason ? `: ${a.decision.reason}` : '.'} Contact our team if you’d like us to reconsider.</Alert>}
            {['under_review', 'verification_scheduled', 'verified'].includes(a.stage) && (
              <div className="grid gap-4 md:grid-cols-2">
                {[['physical', 'Factory visit (physical verification)', Factory], ['virtual', 'Video call (virtual verification)', Video]].map(([k, t, Icon]) => {
                  const s = a[k] || {};
                  return (
                    <div key={k} className={cx('rounded-xl p-4 ring-1', s.needed ? 'bg-cream/60 ring-beige' : 'bg-mist/40 ring-mist')}>
                      <p className="flex items-center gap-2 font-medium text-forest"><Icon className="h-4 w-4 text-gold" />{t}</p>
                      {s.needed == null ? <p className="mt-1 text-sm text-ink-medium">Our team is deciding the verification steps.</p>
                        : !s.needed ? <p className="mt-1 text-sm text-ink-medium">Not required for your company.</p>
                          : s.status === 'completed' ? <p className="mt-1 text-sm font-medium text-[#1e7b34]">✓ Completed {date(s.completedAt)}</p>
                            : s.scheduledAt ? (
                              <div className="mt-1 space-y-1 text-sm">
                                <p className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4 text-gold" /><b>{dateTime(s.scheduledAt)}</b></p>
                                {k === 'physical' && s.location && <p className="text-ink-medium">{s.location}</p>}
                                {s.assignee && <p className="text-ink-medium">{k === 'physical' ? 'Visiting' : 'Host'}: {s.assignee}</p>}
                                {k === 'virtual' && s.link && <a href={s.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-forest underline">Join {s.platform || 'meeting'} <ExternalLink className="h-3.5 w-3.5" /></a>}
                                {s.notes && <p className="whitespace-pre-line text-ink-medium">{s.notes}</p>}
                              </div>
                            ) : <p className="mt-1 text-sm text-ink-medium">Required — we’ll email you a date shortly.</p>}
                    </div>
                  );
                })}
              </div>
            )}

            {a.stage === 'nda_sent' && (
              <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <div>
                  <p className="flex items-center gap-2 text-lg text-forest"><ShieldCheck className="h-5 w-5 text-gold" /> Your verification is approved 🎉</p>
                  <p className="mt-2 text-sm text-ink-medium">Please read and sign our <b>{data.nda?.title}</b> (version {a.nda?.version}). It protects buyer designs, prices and contacts that we share with you.</p>
                  <Button variant="outline" className="mt-4" onClick={() => download('/supplier/nda', `Ranavista-NDA-${a.number}.pdf`).catch((x) => setMsg({ type: 'error', t: errMsg(x) }))}><Download className="h-4 w-4" /> Download NDA (PDF)</Button>
                  <div className="mt-5 rounded-xl bg-cream/60 p-4 text-sm ring-1 ring-beige">
                    <p className="font-medium">Prefer to sign on paper?</p>
                    <p className="mt-1 text-ink-medium">Print, sign and stamp the NDA, then upload the scan.</p>
                    <Button type="button" variant="ghost" className="mt-2" loading={busy === 'ndaUpload'} onClick={() => ndaFileRef.current?.click()}><Upload className="h-4 w-4" /> Upload signed copy</Button>
                    <input ref={ndaFileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => e.target.files?.[0] && uploadNda(e.target.files[0])} />
                  </div>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); run('sign', () => api.post('/supplier/nda/sign', sign), 'NDA signed — choose your plan below.'); }} className="rounded-xl border-2 border-gold/40 bg-white p-5">
                  <p className="flex items-center gap-2 font-medium text-forest"><PenLine className="h-4 w-4 text-gold" /> Sign electronically</p>
                  <div className="mt-4 grid gap-3">
                    <Field label="Full name of authorised signatory"><Input required value={sign.signerName} onChange={(e) => setSign({ ...sign, signerName: e.target.value })} placeholder={a.contactName} /></Field>
                    <Field label="Designation"><Input value={sign.signerTitle} onChange={(e) => setSign({ ...sign, signerTitle: e.target.value })} placeholder="Director / Proprietor / Partner" /></Field>
                    <label className="flex items-start gap-2 text-sm text-ink-medium"><input type="checkbox" className="mt-0.5 accent-forest" checked={sign.agree} onChange={(e) => setSign({ ...sign, agree: e.target.checked })} /> I have read the NDA and I’m authorised to sign it on behalf of {a.companyName}. Typing my name is my electronic signature.</label>
                    {sign.signerName && <p className="rounded-lg bg-cream px-4 py-3 font-serif text-2xl italic text-forest">{sign.signerName}</p>}
                    <Button loading={busy === 'sign'} disabled={!sign.agree || sign.signerName.trim().length < 3}>Sign NDA</Button>
                  </div>
                </form>
              </div>
            )}

            {['nda_signed', 'payment_pending'].includes(a.stage) && (
              <div id="payment">
                <p className="text-lg text-forest">Last step: choose your plan</p>
                <p className="mt-1 text-sm text-ink-medium">Your NDA is signed{a.nda?.signedAt ? ` (${date(a.nda.signedAt)})` : ''}. Pay securely to activate your account — your invoice and supplier code are issued instantly.</p>
                {data.demoPayments && <Alert type="info" className="mt-3">Payments are in demo mode — paying activates your account without charging.</Alert>}
                <div className={cx('mt-5 grid gap-5 md:grid-cols-2', data.plans.length >= 3 && 'xl:grid-cols-3')}>
                  {data.plans.map((p) => (
                    <PlanCard key={p.key} plan={p} emphasis={plan === p.key}
                      action={<Button type="button" variant={plan === p.key ? 'gold' : 'outline'} className="w-full" onClick={() => setPlan(p.key)}>{plan === p.key ? <><Check className="h-4 w-4" /> Selected</> : `Choose ${p.name}`}{a.recommendedPlan === p.key && plan !== p.key ? ' · suggested' : ''}</Button>} />
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button size="lg" loading={busy === 'pay'} disabled={!plan} onClick={pay}>Pay & activate</Button>
                  <p className="text-xs text-ink-medium">Prefer bank transfer or UPI? Reply to the payment email and our team will confirm it manually.</p>
                </div>
              </div>
            )}

            {a.stage === 'active' && (
              <div className="flex flex-wrap items-center justify-between gap-5 rounded-xl bg-forest p-6 text-white">
                <div>
                  <p className="flex items-center gap-2 text-sm text-gold-light"><BadgeCheck className="h-4 w-4" /> Verified Ranavista supplier</p>
                  <p className="mt-1 font-serif text-4xl tracking-wide">{a.supplierCode}</p>
                  <p className="mt-1 text-sm text-white/70">{a.payment?.planName} plan · paid {date(a.payment?.paidAt)} · invoice {a.payment?.invoiceNumber}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="gold" onClick={() => download('/supplier/invoice', `Ranavista-Invoice-${a.payment?.invoiceNumber}.pdf`).catch((x) => setMsg({ type: 'error', t: errMsg(x) }))}><Download className="h-4 w-4" /> Invoice</Button>
                  {a.nda?.file && <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => download('/supplier/nda', `Ranavista-NDA-${a.number}.pdf`)}><FileText className="h-4 w-4" /> Signed NDA</Button>}
                  <Link to="/seller" className="btn border border-white/30 text-white hover:bg-white/10">Go to dashboard</Link>
                </div>
              </div>
            )}
          </div>
          {a.stage === 'submitted' && !editing && <Button variant="outline" className="mt-4" onClick={() => setEditing(true)}>Edit registration</Button>}
        </Card>
      )}

      {showForm && editable && (
        <Card className="card-pad mb-6">
          <h2 className="mb-1 text-xl text-forest">{a ? 'Update your registration' : 'Complete your supplier registration'}</h2>
          {!a && <p className="mb-5 text-sm text-ink-medium">We need these details before our team can verify your company and send you buyer leads.</p>}
          <SupplierForm value={form} onChange={setForm} busy={busy === 'save'} submitLabel={a?.stage === 'info_requested' ? 'Resubmit registration' : a ? 'Save changes' : 'Submit registration'}
            onSubmit={(v) => run('save', () => api.post('/supplier/application', v), a ? 'Registration updated.' : 'Registration submitted — our team will be in touch soon.')} />
          {editing && <Button variant="ghost" className="mt-2" onClick={() => { setEditing(false); setForm(fromApplication(a)); }}>Cancel editing</Button>}
        </Card>
      )}

      {a && (
        <Card className="card-pad">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg text-forest">Documents</h2>
              <p className="text-sm text-ink-medium">Upload your GST certificate, company registration, export licence and certificates to speed up verification.</p>
            </div>
            <div className="flex items-end gap-2">
              <Field label="Document type"><Select value={docKind} onChange={(e) => setDocKind(e.target.value)} options={DOC_KINDS.map(([value, label]) => ({ value, label }))} /></Field>
              <Button variant="outline" loading={busy === 'docs'} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Upload</Button>
              <input ref={fileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" className="hidden" onChange={(e) => e.target.files?.length && uploadDocs(e.target.files)} />
            </div>
          </div>
          {a.documents?.length > 0 && (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">{a.documents.map((d) => (
              <li key={d.url}><a href={fileUrl(d.url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg p-2.5 text-sm text-forest ring-1 ring-beige hover:bg-cream"><FileText className="h-4 w-4 shrink-0 text-gold" /><span className="truncate">{d.name}</span><Badge className="ml-auto">{DOC_KINDS.find(([k]) => k === d.kind)?.[1] || d.kind}</Badge></a></li>
            ))}</ul>
          )}
        </Card>
      )}
    </>
  );
}
