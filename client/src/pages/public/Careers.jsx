import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, CheckCircle2, ChevronDown, Clock, FileUp, Globe2, HeartHandshake, MapPin, Sprout, Trash2, Users } from 'lucide-react';
import api, { errMsg } from '../../lib/api';
import useFetch from '../../lib/useFetch';
import { COUNTRIES } from '../../lib/format';
import { Alert, Button, Field, Input, Select, Textarea, cx } from '../../components/ui';
import { PageHero } from './Pages';

const PERKS = [
  { icon: Globe2, title: 'Global from day one', text: 'Work with buyers and makers across continents, time zones and cultures.' },
  { icon: Sprout, title: 'Grow with us', text: 'An early team where your ideas ship fast and your role grows with the company.' },
  { icon: HeartHandshake, title: 'Craft & fairness', text: 'We champion skilled makers and fair, long-term trade relationships.' },
  { icon: Users, title: 'Small, senior, kind', text: 'A tight team that values ownership, clear communication and respect.' },
];

const EXPERIENCE = ['Fresher', 'Less than 1 year', '1–2 years', '3–5 years', '6–10 years', '10+ years'];
const NOTICE = ['Immediately', '15 days', '30 days', '45 days', '60 days', '90 days or more'];
const SOURCES = ['LinkedIn', 'Ranavista website', 'Job portal', 'Referral from a friend', 'Social media', 'Trade fair / event', 'Other'];
const ACCEPT = '.pdf,.doc,.docx';
const MAX_MB = 5;

const blank = {
  name: '', email: '', phone: '', country: '', city: '',
  openingId: '', position: '', currentRole: '', currentCompany: '', experienceYears: '', highestQualification: '',
  noticePeriod: '', expectedSalary: '', linkedin: '', portfolio: '', coverLetter: '', source: '', consent: false, website: '',
};

function Opening({ o, onApply }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full flex-col gap-3 p-5 text-left sm:flex-row sm:items-center sm:justify-between sm:p-6" aria-expanded={open}>
        <div>
          {o.department && <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gold-dark">{o.department}</p>}
          <h3 className="mt-1 text-xl text-forest">{o.title}</h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-medium">
            {o.location && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{o.location}</span>}
            <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{o.type} · {o.workMode}</span>
            {o.experience && <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{o.experience}</span>}
          </div>
        </div>
        <span className="flex items-center gap-1 text-sm font-medium text-forest">{open ? 'Hide details' : 'View details'}<ChevronDown className={cx('h-4 w-4 transition', open && 'rotate-180')} /></span>
      </button>
      {open && (
        <div className="border-t border-mist bg-cream/40 px-5 py-5 sm:px-6">
          {o.summary && <p className="text-ink">{o.summary}</p>}
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {[['What you’ll do', o.responsibilities], ['What we’re looking for', o.requirements]].map(([h, list]) => list?.length > 0 && (
              <div key={h}>
                <p className="label">{h}</p>
                <ul className="space-y-1.5 text-sm text-ink-medium">{list.map((x) => <li key={x} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />{x}</li>)}</ul>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => onApply(o)} className="btn-primary mt-6">Apply for this role <ArrowRight className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}

export default function Careers() {
  const { data: openings } = useFetch('/public/careers');
  const [f, setF] = useState(blank);
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [state, setState] = useState({ busy: false, ok: false, err: '' });
  const formRef = useRef(null);
  const fileRef = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const pickFile = (x) => {
    if (!x) return;
    const ext = x.name.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) return setState((s) => ({ ...s, err: 'Please upload your CV as a PDF, DOC or DOCX file.' }));
    if (x.size > MAX_MB * 1024 * 1024) return setState((s) => ({ ...s, err: `Your CV is larger than ${MAX_MB} MB. Please upload a smaller file.` }));
    setState((s) => ({ ...s, err: '' }));
    setFile(x);
  };

  const applyFor = (o) => {
    setF((prev) => ({ ...prev, openingId: o?._id || '', position: o ? o.title : prev.position }));
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setState({ busy: false, ok: false, err: 'Please attach your CV.' });
    if (!f.consent) return setState({ busy: false, ok: false, err: 'Please accept the privacy notice to continue.' });
    setState({ busy: true, ok: false, err: '' });
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, String(v ?? '')));
    if (!f.openingId && !f.position) fd.set('position', 'General application');
    fd.append('cv', file);
    try {
      await api.post('/public/careers/apply', fd);
      setState({ busy: false, ok: true, err: '' });
      setF(blank); setFile(null);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (x) { setState({ busy: false, ok: false, err: errMsg(x) }); }
  };

  const positionOptions = [{ value: '', label: 'General application — any suitable role' }, ...(openings || []).map((o) => ({ value: o._id, label: `${o.title}${o.location ? ` — ${o.location}` : ''}` }))];

  return (
    <>
      <PageHero eyebrow="Careers at Ranavista" title="Help us connect the world’s makers with the world’s buyers" text="We’re always glad to meet people who care about craft, trade and great service. Explore open roles or send us your CV — we read every application." />

      <section className="container-x py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map((p) => (
            <div key={p.title} className="rounded-xl2 border border-beige bg-white p-6 shadow-soft">
              <div className="inline-flex rounded-xl bg-forest p-2.5 text-gold-light"><p.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-sans text-base font-semibold text-ink">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-medium">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="container-x">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="eyebrow">Open positions</p><h2 className="mt-2 text-3xl text-forest sm:text-4xl">Current openings</h2></div>
            <button type="button" onClick={() => applyFor(null)} className="link inline-flex items-center gap-1">Send a general application <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="mt-8 space-y-4">
            {openings?.length ? openings.map((o) => <Opening key={o._id} o={o} onApply={applyFor} />) : (
              <div className="rounded-xl2 border border-dashed border-gold/60 bg-cream/40 p-8 text-center">
                <p className="font-serif text-xl text-forest">No open roles right now — but we’d still love to hear from you.</p>
                <p className="mt-1 text-sm text-ink-medium">Send your CV below and we’ll reach out when a suitable role opens.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section ref={formRef} id="apply" className="container-x scroll-mt-24 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="eyebrow">Apply</p>
            <h2 className="mt-2 text-3xl text-forest sm:text-4xl">Share your CV with us</h2>
            <p className="mx-auto mt-3 max-w-xl text-ink-medium">Fields marked * are required. It takes about three minutes.</p>
          </div>

          {state.ok ? (
            <div className="card mt-10 p-10 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
              <h3 className="mt-4 text-2xl text-forest">Thank you — your application is in</h3>
              <p className="mx-auto mt-2 max-w-md text-ink-medium">We’ve emailed you a confirmation. If your profile matches what we’re looking for, our team will contact you within 2–3 weeks.</p>
              <button type="button" onClick={() => setState({ busy: false, ok: false, err: '' })} className="btn-outline mt-6">Submit another application</button>
            </div>
          ) : (
            <form onSubmit={submit} className="card mt-10 space-y-10 p-6 sm:p-10" noValidate={false}>
              {state.err && <Alert type="error">{state.err}</Alert>}
              {/* honeypot — hidden from people, catches bots */}
              <input type="text" name="website" value={f.website} onChange={set('website')} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

              <fieldset className="grid gap-4 sm:grid-cols-2">
                <legend className="mb-4 flex items-center gap-3 font-serif text-xl text-forest"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest font-sans text-xs text-white">1</span>Personal details</legend>
                <Field label="Full name *"><Input required value={f.name} onChange={set('name')} autoComplete="name" /></Field>
                <Field label="Email *"><Input required type="email" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
                <Field label="Phone (with country code) *"><Input required type="tel" value={f.phone} onChange={set('phone')} placeholder="+91 98xxx xxxxx" autoComplete="tel" /></Field>
                <Field label="Country *"><Select required value={f.country} onChange={set('country')} options={COUNTRIES} placeholder="Select country" /></Field>
                <Field label="City"><Input value={f.city} onChange={set('city')} autoComplete="address-level2" /></Field>
                <Field label="LinkedIn profile"><Input type="url" value={f.linkedin} onChange={set('linkedin')} placeholder="https://linkedin.com/in/…" /></Field>
              </fieldset>

              <fieldset className="grid gap-4 sm:grid-cols-2">
                <legend className="mb-4 flex items-center gap-3 font-serif text-xl text-forest"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest font-sans text-xs text-white">2</span>Role & experience</legend>
                <Field label="Position applying for *" className="sm:col-span-2">
                  <Select value={f.openingId} onChange={(e) => { const o = openings?.find((x) => x._id === e.target.value); setF({ ...f, openingId: e.target.value, position: o ? o.title : '' }); }} options={positionOptions} />
                </Field>
                {!f.openingId && <Field label="Preferred role / department" className="sm:col-span-2"><Input value={f.position} onChange={set('position')} placeholder="e.g. Sourcing, Sales, Quality, Operations, Design, Technology" /></Field>}
                <Field label="Current job title"><Input value={f.currentRole} onChange={set('currentRole')} autoComplete="organization-title" /></Field>
                <Field label="Current company"><Input value={f.currentCompany} onChange={set('currentCompany')} autoComplete="organization" /></Field>
                <Field label="Total work experience *"><Select required value={f.experienceYears} onChange={set('experienceYears')} options={EXPERIENCE} placeholder="Select" /></Field>
                <Field label="Highest qualification"><Input value={f.highestQualification} onChange={set('highestQualification')} placeholder="e.g. MBA, B.Tech, B.Des" /></Field>
                <Field label="Notice period"><Select value={f.noticePeriod} onChange={set('noticePeriod')} options={NOTICE} placeholder="Select" /></Field>
                <Field label="Expected salary" hint="Optional — include currency, e.g. ₹8 LPA or $60k"><Input value={f.expectedSalary} onChange={set('expectedSalary')} /></Field>
                <Field label="Portfolio / website" className="sm:col-span-2"><Input type="url" value={f.portfolio} onChange={set('portfolio')} placeholder="https://" /></Field>
              </fieldset>

              <fieldset className="grid gap-4">
                <legend className="mb-4 flex items-center gap-3 font-serif text-xl text-forest"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest font-sans text-xs text-white">3</span>CV & cover letter</legend>
                <div>
                  <span className="label">Your CV / résumé *</span>
                  {file ? (
                    <div className="flex items-center gap-3 rounded-xl border border-forest/30 bg-forest/5 p-4">
                      <FileUp className="h-7 w-7 shrink-0 text-forest" />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{file.name}</p><p className="text-xs text-ink-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div>
                      <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }} className="rounded-md p-2 text-ink-medium hover:bg-white hover:text-danger" aria-label="Remove file"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <label
                      onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                      onDrop={(e) => { e.preventDefault(); setDrag(false); pickFile(e.dataTransfer.files?.[0]); }}
                      className={cx('flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition', drag ? 'border-gold bg-gold/10' : 'border-line bg-cream/40 hover:border-gold hover:bg-cream')}>
                      <FileUp className="h-8 w-8 text-gold" />
                      <p className="mt-3 text-sm font-medium text-ink">Drag your CV here, or <span className="text-forest underline underline-offset-4">browse</span></p>
                      <p className="mt-1 text-xs text-ink-medium">PDF, DOC or DOCX · up to {MAX_MB} MB</p>
                      <input ref={fileRef} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
                    </label>
                  )}
                </div>
                <Field label="Cover letter / why Ranavista?" hint="Optional — a few lines about you and what you’re looking for"><Textarea rows={5} maxLength={4000} value={f.coverLetter} onChange={set('coverLetter')} /></Field>
                <Field label="How did you hear about us?"><Select value={f.source} onChange={set('source')} options={SOURCES} placeholder="Select" /></Field>
              </fieldset>

              <div className="space-y-5 border-t border-mist pt-6">
                <label className="flex items-start gap-3 text-sm text-ink-medium">
                  <input type="checkbox" checked={f.consent} onChange={set('consent')} className="mt-0.5 h-4 w-4 accent-forest" />
                  <span>I agree that Ranavista may store and process my details and CV to assess this and future job opportunities, as described in the <Link to="/legal/privacy" className="link">Privacy Policy</Link>. *</span>
                </label>
                <Button size="lg" loading={state.busy} className="w-full sm:w-auto">Submit application <ArrowRight className="h-4 w-4" /></Button>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
