import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bell, Check, ExternalLink, FileText, Upload } from 'lucide-react';
import api, { errMsg, fileUrl } from '../../lib/api';
import useFetch from '../../lib/useFetch';
import { useAuth } from '../../lib/auth';
import { CATEGORIES, date, timeAgo } from '../../lib/format';
import AddressFields from '../../components/AddressFields';
import PlanCard from '../../components/PlanCard';
import { Alert, Button, Card, Empty, Field, Input, PageHeader, PageLoader, Select, Textarea, cx } from '../../components/ui';

/* ----------------------------- SUBSCRIPTION ----------------------------- */
export function Subscription({ role }) {
  const { data, loading, reload } = useFetch('/subscription');
  const { refresh } = useAuth();
  const [sp] = useSearchParams();
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(sp.get('success') ? { type: 'success', t: 'Subscription updated — welcome aboard!' } : sp.get('canceled') ? { type: 'info', t: 'Checkout was canceled. No changes made.' } : null);

  const choose = async (key) => {
    setBusy(key);
    setMsg(null);
    try {
      const { data: d } = await api.post('/subscription/checkout', { planKey: key });
      if (d.url) { window.location.href = d.url; return; }
      setMsg({ type: 'success', t: d.demo ? 'Plan activated (demo mode — no charge).' : 'Plan updated.' });
      await Promise.all([reload(), refresh()]);
    } catch (x) { setMsg({ type: 'error', t: errMsg(x) }); } finally { setBusy(''); }
  };
  const portal = async () => {
    try { const { data: d } = await api.post('/subscription/portal'); window.location.href = d.url; } catch (x) { setMsg({ type: 'error', t: errMsg(x) }); }
  };

  if (loading || !data) return <PageLoader />;
  const highlight = sp.get('plan');
  return (
    <>
      <PageHeader title="Plan & billing" subtitle={role === 'buyer' ? 'More RFQs, smarter tools and faster routing as you grow.' : 'Higher tiers get more listings, more visibility and priority in lead matching.'}
        actions={data.subscription?.stripeSubscriptionId && <Button variant="outline" onClick={portal}>Manage billing <ExternalLink className="h-4 w-4" /></Button>} />
      {msg && <Alert type={msg.type} className="mb-5">{msg.t}</Alert>}
      {data.demo && <Alert type="info" className="mb-5">Payments are in demo mode — choosing a paid plan activates it instantly without charging.</Alert>}
      <div className={cx('grid gap-6 md:grid-cols-2', data.plans.length >= 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3')}>
        {data.plans.map((p) => {
          const current = data.current?.key === p.key;
          const action = p.customPricing
            ? <Link to={`/contact?topic=${encodeURIComponent(`${p.name} plan (${role})`)}`} className="btn-outline w-full">Talk to our team</Link>
            : <Button className="w-full" variant={current ? 'ghost' : p.highlighted ? 'primary' : 'outline'} disabled={current} loading={busy === p.key} onClick={() => choose(p.key)}>
                {current ? 'Current plan' : p.price ? `Choose ${p.name}` : 'Switch to free'}
              </Button>;
          return <PlanCard key={p.key} plan={p} current={current} emphasis={highlight === p.key} action={action} />;
        })}
      </div>
      {data.subscription?.currentPeriodEnd && data.subscription.status === 'active' && <p className="mt-8 text-sm text-ink-medium">Current period ends {date(data.subscription.currentPeriodEnd)}.</p>}
    </>
  );
}

/* ----------------------------- NOTIFICATIONS ----------------------------- */
export function Notifications() {
  const { data, loading, reload } = useFetch('/notifications');
  const markAll = async () => { await api.post('/notifications/read'); reload(); };
  return (
    <>
      <PageHeader title="Notifications" actions={data?.unread > 0 && <Button variant="outline" onClick={markAll}>Mark all read</Button>} />
      <Card className="overflow-hidden">
        {loading ? <PageLoader /> : !data?.list.length ? <Empty icon={Bell} title="No notifications yet" /> : (
          <ul className="divide-y divide-mist">
            {data.list.map((n) => (
              <li key={n._id}>
                <Link to={n.link || '#'} onClick={() => !n.read && api.post('/notifications/read', { id: n._id })} className={cx('flex items-start gap-3 px-6 py-4 transition hover:bg-cream/40', !n.read && 'bg-gold/5')}>
                  <span className={cx('mt-2 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-gold')} />
                  <div className="min-w-0 flex-1"><p className="font-medium text-ink">{n.title}</p><p className="text-sm text-ink-medium">{n.body}</p></div>
                  <span className="shrink-0 text-xs text-ink-medium">{timeAgo(n.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

/* ----------------------------- SETTINGS / PROFILE ----------------------------- */
export function Settings({ role }) {
  const { user, setUser } = useAuth();
  const [f, setF] = useState(null);
  const [pw, setPw] = useState({ current: '', password: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    setF({
      name: user.name, phone: user.phone || '', company: user.company || '', jobTitle: user.jobTitle || '',
      address: { line1: '', city: '', state: '', zip: '', country: role === 'buyer' ? 'United States' : user.seller?.country || '', ...(user.address || {}) },
      seller: { description: user.seller?.description || '', website: user.seller?.website || '', yearEstablished: user.seller?.yearEstablished || '', minOrderValue: user.seller?.minOrderValue || '', categories: user.seller?.categories || [] },
    });
  }, [user, role]);
  if (!f) return null;

  const save = async (e) => {
    e.preventDefault();
    setBusy('profile');
    try { const { data } = await api.patch('/auth/me', f); setUser(data.user); setMsg({ type: 'success', t: 'Profile saved.' }); }
    catch (x) { setMsg({ type: 'error', t: errMsg(x) }); } finally { setBusy(''); }
  };
  const changePw = async (e) => {
    e.preventDefault();
    setBusy('pw');
    try { await api.post('/auth/change-password', pw); setPw({ current: '', password: '' }); setMsg({ type: 'success', t: 'Password updated.' }); }
    catch (x) { setMsg({ type: 'error', t: errMsg(x) }); } finally { setBusy(''); }
  };
  const uploadDocs = async (e) => {
    if (!e.target.files?.length) return;
    const fd = new FormData();
    [...e.target.files].forEach((x) => fd.append('files', x));
    setBusy('docs');
    try { await api.post('/seller/documents', fd); const { data } = await api.get('/auth/me'); setUser(data.user); setMsg({ type: 'success', t: 'Documents uploaded.' }); }
    catch (x) { setMsg({ type: 'error', t: errMsg(x) }); } finally { setBusy(''); e.target.value = ''; }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setS = (k) => (e) => setF({ ...f, seller: { ...f.seller, [k]: e.target.value } });
  const toggleCat = (c) => setF({ ...f, seller: { ...f.seller, categories: f.seller.categories.includes(c) ? f.seller.categories.filter((x) => x !== c) : [...f.seller.categories, c] } });

  return (
    <>
      <PageHeader title={role === 'seller' ? 'Company profile' : 'Settings'} subtitle={user.email} />
      {msg && <Alert type={msg.type} className="mb-5">{msg.t}</Alert>}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <form onSubmit={save} className="space-y-6">
          <Card className="card-pad grid gap-4 sm:grid-cols-2">
            <h2 className="text-lg text-forest sm:col-span-2">Contact</h2>
            <Field label="Full name"><Input value={f.name} onChange={set('name')} /></Field>
            <Field label="Job title"><Input value={f.jobTitle} onChange={set('jobTitle')} /></Field>
            <Field label="Company"><Input value={f.company} onChange={set('company')} /></Field>
            <Field label="Phone"><Input type="tel" value={f.phone} onChange={set('phone')} /></Field>
            <AddressFields street value={f.address} onChange={(address) => setF({ ...f, address })} />
          </Card>
          {role === 'seller' && (
            <Card className="card-pad grid gap-4 sm:grid-cols-2">
              <h2 className="text-lg text-forest sm:col-span-2">Business</h2>
              <Field label="Website"><Input value={f.seller.website} onChange={setS('website')} placeholder="https://" /></Field>
              <Field label="Year established"><Input type="number" value={f.seller.yearEstablished} onChange={setS('yearEstablished')} /></Field>
              <Field label="Minimum order (USD)"><Input type="number" value={f.seller.minOrderValue} onChange={setS('minOrderValue')} /></Field>
              <Field label="About your company" className="sm:col-span-2"><Textarea rows={4} value={f.seller.description} onChange={setS('description')} /></Field>
              <div className="sm:col-span-2">
                <span className="label">Categories you manufacture</span>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => <button type="button" key={c} onClick={() => toggleCat(c)} className={cx('rounded-full border px-3 py-1.5 text-xs', f.seller.categories.includes(c) ? 'border-forest bg-forest text-white' : 'border-line bg-white hover:border-gold')}>{c}</button>)}
                </div>
              </div>
            </Card>
          )}
          <Button loading={busy === 'profile'}>Save changes</Button>
        </form>
        <div className="space-y-6">
          {role === 'seller' && (
            <Card className="card-pad">
              <h2 className="text-lg text-forest">Verification documents</h2>
              <p className="mt-1 text-sm text-ink-medium">Business registration, IEC / export license, GST / tax ID, factory photos, certifications.</p>
              <ul className="mt-4 space-y-2">
                {(user.seller?.documents || []).map((d) => <li key={d.url}><a href={fileUrl(d.url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-forest hover:underline"><FileText className="h-4 w-4 text-gold" />{d.name}</a></li>)}
              </ul>
              <label className={cx('btn-outline mt-4 w-full cursor-pointer', busy === 'docs' && 'opacity-50')}><Upload className="h-4 w-4" />{busy === 'docs' ? 'Uploading…' : 'Upload documents'}<input type="file" multiple className="hidden" onChange={uploadDocs} /></label>
            </Card>
          )}
          <Card className="card-pad">
            <h2 className="text-lg text-forest">Change password</h2>
            <form onSubmit={changePw} className="mt-4 space-y-3">
              <Field label="Current password"><Input type="password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" /></Field>
              <Field label="New password"><Input type="password" required minLength={8} value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} autoComplete="new-password" /></Field>
              <Button variant="outline" loading={busy === 'pw'}>Update password</Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
