import { useEffect, useState } from 'react';
import { Building, PenTool, Mail, Save } from 'lucide-react';
import api, { errMsg } from '../lib/api';
import useFetch from '../lib/useFetch';
import { money } from '../lib/format';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, PageLoader, Textarea, cx } from '../components/ui';

const Section = ({ icon: Icon, title, text, children }) => (
  <Card className="card-pad">
    <h2 className="flex items-center gap-2 text-lg text-forest"><Icon className="h-4 w-4 text-gold" />{title}</h2>
    {text && <p className="mt-1 text-sm text-ink-medium">{text}</p>}
    <div className="mt-4">{children}</div>
  </Card>
);

export default function Settings() {
  const { data, loading, error } = useFetch('/admin/settings');
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  useEffect(() => { if (data) setS(data.settings); }, [data]);
  if (loading || !s) return error ? <Alert type="error">{error}</Alert> : <PageLoader />;
  const set = (k) => (e) => setS({ ...s, [k]: e.target.value });
  const save = async () => {
    setBusy(true); setMsg(null);
    try { const { data: d } = await api.patch('/admin/settings', s); setS(d.settings); setMsg({ type: 'success', t: 'Settings saved.' }); } catch (x) { setMsg({ type: 'error', t: errMsg(x) }); } finally { setBusy(false); }
  };
  const togglePlan = (key) => setS({ ...s, verificationPlans: s.verificationPlans.includes(key) ? s.verificationPlans.filter((k) => k !== key) : [...s.verificationPlans, key] });

  return (
    <>
      <PageHeader title="Settings" subtitle="Inboxes, company details for invoices, the supplier NDA and plans offered after verification."
        actions={<Button onClick={save} loading={busy}><Save className="h-4 w-4" /> Save settings</Button>} />
      {msg && <Alert type={msg.type} className="mb-5">{msg.t}</Alert>}
      {!data.env.smtp && <Alert type="warning" className="mb-5">Email (SMTP) is not configured on the server — emails are printed in the server log instead of being sent. Add SMTP_* keys to the API’s environment.</Alert>}
      <div className="grid gap-6 xl:grid-cols-2">
        <Section icon={Mail} title="Ranavista inboxes" text="Where “new request” emails go. Leave a specific inbox empty to use the team inbox.">
          <div className="grid gap-4">
            <Field label="Team inbox (registered email)" hint="Receives everything below unless overridden"><Input type="email" value={s.teamEmail || ''} onChange={set('teamEmail')} placeholder="hello@ranavista.com" /></Field>
            <Field label="New supplier registrations"><Input type="email" value={s.sellerRequestsEmail || ''} onChange={set('sellerRequestsEmail')} placeholder="Uses team inbox" /></Field>
            <Field label="Sourcing requests"><Input type="email" value={s.sourcingEmail || ''} onChange={set('sourcingEmail')} placeholder="Uses team inbox" /></Field>
            <Field label="Liaison services enquiries"><Input type="email" value={s.liaisonEmail || ''} onChange={set('liaisonEmail')} placeholder="Uses team inbox" /></Field>
          </div>
        </Section>
        <Section icon={Building} title="Company details" text="Printed on supplier invoices and the NDA.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Legal name" className="sm:col-span-2"><Input value={s.companyLegalName || ''} onChange={set('companyLegalName')} /></Field>
            <Field label="Registered address" className="sm:col-span-2"><Textarea rows={2} value={s.companyAddress || ''} onChange={set('companyAddress')} /></Field>
            <Field label="GSTIN"><Input value={s.companyGstin || ''} onChange={set('companyGstin')} /></Field>
            <Field label="Phone"><Input value={s.companyPhone || ''} onChange={set('companyPhone')} /></Field>
            <Field label="Billing email" className="sm:col-span-2"><Input type="email" value={s.companyEmail || ''} onChange={set('companyEmail')} /></Field>
          </div>
        </Section>
        <Section icon={PenTool} title="Supplier NDA" text="Sent automatically after verification is approved. Placeholders: {{supplierName}} {{supplierAddress}} {{supplierGst}} {{companyLegalName}} {{companyAddress}} {{date}}">
          <Alert type="info" className="mb-4">The default text is a template — have your lawyer review it. Change the version when you edit it so signed copies stay traceable.</Alert>
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <Field label="Title"><Input value={s.ndaTitle || ''} onChange={set('ndaTitle')} /></Field>
            <Field label="Version"><Input value={s.ndaVersion || ''} onChange={set('ndaVersion')} /></Field>
            <Field label="Agreement text (blank line = new paragraph)" className="sm:col-span-2"><Textarea rows={16} value={s.ndaBody || ''} onChange={set('ndaBody')} className="font-mono text-xs" /></Field>
          </div>
        </Section>
        <Section icon={Building} title="Plans offered after the NDA" text="Which paid seller plans appear in the payment email and dashboard. None selected = every active paid seller plan.">
          <div className="flex flex-wrap gap-2">
            {data.sellerPlans.filter((p) => p.price > 0 && !p.customPricing).map((p) => (
              <button key={p.key} type="button" onClick={() => togglePlan(p.key)} className={cx('rounded-xl border px-4 py-2.5 text-left text-sm transition', s.verificationPlans.includes(p.key) ? 'border-forest bg-forest text-white' : 'border-line bg-white hover:border-gold')}>
                <b>{p.name}</b><span className="block text-xs opacity-80">{money(p.price, p.currency)}{!p.active && ' · hidden'}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-medium">Edit prices in <a href="/plans" className="underline">Subscriptions</a>. {data.env.stripe ? <Badge color="success">Stripe live</Badge> : <Badge color="amber">Stripe demo mode — payments are simulated</Badge>}</p>
        </Section>
      </div>
    </>
  );
}
