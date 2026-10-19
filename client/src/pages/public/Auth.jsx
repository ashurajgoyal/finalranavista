import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Check, ShoppingBag } from 'lucide-react';
import api, { errMsg } from '../../lib/api';
import { useAuth, homeFor } from '../../lib/auth';
import { CATEGORIES, COUNTRIES } from '../../lib/format';
import AddressFields from '../../components/AddressFields';
import SupplierForm, { blankSupplier } from '../../components/SupplierForm';
import { Alert, Button, Field, Input, Select, Textarea, cx } from '../../components/ui';
import Logo, { LotusMark } from '../../components/Logo';

function Shell({ title, subtitle, children, wide }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.15fr]">
      <div className="bg-hero relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div className="bg-grain absolute inset-0 opacity-40" aria-hidden />
        <div className="relative"><Logo light /></div>
        <div className="relative">
          <LotusMark className="mb-6 h-16 w-auto" />
          <p className="max-w-md font-serif text-3xl leading-snug">“One request. One hand-picked maker. Payment released only when your goods arrive.”</p>
          <ul className="mt-8 space-y-2 text-sm text-white/75">
            {['Verified manufacturers only', 'Escrow-style payment protection', 'Buyers and makers across the globe'].map((t) => (
              <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-gold-light" />{t}</li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/50">© {new Date().getFullYear()} Ranavista</p>
      </div>
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className={cx('w-full', wide ? 'max-w-xl' : 'max-w-md')}>
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="text-3xl text-forest">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-ink-medium">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- LOGIN ----------------------------- */
export function Login() {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const { data } = await api.post('/auth/login', form);
      signIn(data);
      nav(sp.get('next') || (data.user.emailVerified ? homeFor(data.user) : '/verify'), { replace: true });
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  return (
    <Shell title="Welcome back" subtitle="Sign in to manage your RFQs, quotes and orders.">
      <form onSubmit={submit} className="space-y-4">
        {err && <Alert type="error">{err}</Alert>}
        <Field label="Email"><Input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Password"><Input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <div className="flex justify-end"><Link to="/forgot-password" className="text-sm text-muted hover:underline">Forgot password?</Link></div>
        <Button loading={busy} className="w-full" size="lg">Sign in</Button>
        <p className="text-center text-sm text-ink-medium">New to Ranavista? <Link to="/register" className="link">Create an account</Link></p>
      </form>
    </Shell>
  );
}

/* ----------------------------- REGISTER ----------------------------- */
export function Register() {
  const { signIn } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [role, setRole] = useState(sp.get('role') === 'seller' ? 'seller' : 'buyer');
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '', company: '', jobTitle: '',
    address: { city: '', state: '', zip: '', country: 'United States' },
    categories: sp.get('category') ? [sp.get('category')] : [], country: 'India', website: '', description: '', agree: false,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sup, setSup] = useState(() => blankSupplier({ categories: sp.get('category') ? [sp.get('category')] : [] }));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggleCat = (c) => setForm((f) => ({ ...f, categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c] }));

  /* Sellers: account step of the supplier registration wizard */
  const validateAccount = () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) return 'Please fill in your name, email and password.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) return 'Please enter a valid email address.';
    if (!form.agree) return 'Please accept the Terms, Privacy Policy and Seller Policy.';
    setSup((x) => ({ ...x, contactName: x.contactName || form.name, email: x.email || form.email, contactNumber: x.contactNumber || form.phone, companyName: x.companyName || form.company }));
    return '';
  };
  const submitSeller = async (application) => {
    setBusy(true);
    setErr('');
    try {
      const { data } = await api.post('/auth/register', { name: form.name, email: form.email, password: form.password, phone: form.phone || application.contactNumber, company: application.companyName, role: 'seller', application });
      signIn(data);
      nav('/verify', { replace: true });
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.agree) return setErr('Please accept the Terms and Privacy Policy.');
    if (role === 'seller' && !form.categories.length) return setErr('Pick at least one product category.');
    setBusy(true);
    setErr('');
    try {
      const payload = { ...form, role };
      if (role === 'seller') payload.address = { ...form.address, country: form.country };
      const { data } = await api.post('/auth/register', payload);
      signIn(data);
      if (sp.get('plan')) sessionStorage.setItem('rv_plan', sp.get('plan'));
      nav('/verify', { replace: true });
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };

  return (
    <Shell wide title={role === 'seller' ? 'Supplier registration' : 'Create your account'} subtitle={role === 'seller' ? 'Takes about 5 minutes. Keep your GST and company details handy.' : 'Free to join. Takes about two minutes.'}>
      <div className="mb-6 grid grid-cols-2 gap-3">
        {[['buyer', ShoppingBag, 'I want to buy', 'Retailers, brands, designers'], ['seller', Building2, 'I’m a manufacturer', 'Factories & exporters']].map(([r, I, t, s]) => (
          <button key={r} type="button" onClick={() => setRole(r)} className={cx('rounded-xl border-2 p-4 text-left transition', role === r ? 'border-forest bg-forest/5' : 'border-line bg-white hover:border-gold')}>
            <I className={cx('h-5 w-5', role === r ? 'text-forest' : 'text-gold')} />
            <p className="mt-2 text-sm font-semibold text-ink">{t}</p>
            <p className="text-xs text-ink-medium">{s}</p>
          </button>
        ))}
      </div>
      {role === 'seller' ? (
        <>
          <Alert type="info" className="mb-5">Supplier registration: tell us about your company and factory. Our team verifies every supplier (factory visit or video call), then you sign our NDA, choose a plan and receive your supplier code.</Alert>
          <SupplierForm value={sup} onChange={setSup} onSubmit={submitSeller} busy={busy} error={err} submitLabel="Submit supplier registration" validateAccount={validateAccount}
            accountStep={(
              <>
                <Field label="Your full name"><Input value={form.name} onChange={set('name')} autoComplete="name" /></Field>
                <Field label="Work email" hint="You’ll sign in with this"><Input type="email" value={form.email} onChange={set('email')} autoComplete="email" /></Field>
                <Field label="Mobile number"><Input type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98xxx xxxxx" autoComplete="tel" /></Field>
                <Field label="Password" hint="At least 8 characters"><Input type="password" minLength={8} value={form.password} onChange={set('password')} autoComplete="new-password" /></Field>
                <label className="flex items-start gap-2 text-sm text-ink-medium sm:col-span-2">
                  <input type="checkbox" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} className="mt-0.5 accent-forest" />
                  <span>I agree to the <Link to="/legal/terms" className="link">Terms</Link>, <Link to="/legal/privacy" className="link">Privacy Policy</Link> and <Link to="/legal/seller-policy" className="link">Seller Policy</Link>.</span>
                </label>
              </>
            )} />
          <p className="mt-4 text-center text-sm text-ink-medium">Already have an account? <Link to="/login" className="link">Sign in</Link></p>
        </>
      ) : (
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {err && <Alert type="error" className="sm:col-span-2">{err}</Alert>}
        <Field label="Full name"><Input required value={form.name} onChange={set('name')} autoComplete="name" /></Field>
        <Field label="Company name"><Input required value={form.company} onChange={set('company')} autoComplete="organization" /></Field>
        <Field label="Work email"><Input required type="email" value={form.email} onChange={set('email')} autoComplete="email" /></Field>
        <Field label="Phone"><Input type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 555 555 5555" autoComplete="tel" /></Field>
        <Field label="Password" hint="At least 8 characters" className="sm:col-span-2"><Input required type="password" minLength={8} value={form.password} onChange={set('password')} autoComplete="new-password" /></Field>

        {role === 'buyer' ? (
          <>
            <AddressFields value={form.address} onChange={(address) => setForm({ ...form, address })} />
          </>
        ) : (
          <>
            <Field label="Country of manufacture"><Select value={form.country} onChange={set('country')} options={COUNTRIES} /></Field>
            <Field label="Website (optional)"><Input value={form.website} onChange={set('website')} placeholder="https://" /></Field>
            <div className="sm:col-span-2">
              <span className="label">Product categories</span>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c} type="button" onClick={() => toggleCat(c)} className={cx('rounded-full border px-3 py-1.5 text-xs transition', form.categories.includes(c) ? 'border-forest bg-forest text-white' : 'border-line bg-white text-ink hover:border-gold')}>{c}</button>
                ))}
              </div>
            </div>
            <Field label="About your company" className="sm:col-span-2"><Textarea rows={3} value={form.description} onChange={set('description')} placeholder="Products, capacity, certifications, key export markets…" /></Field>
          </>
        )}
        <label className="flex items-start gap-2 text-sm text-ink-medium sm:col-span-2">
          <input type="checkbox" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} className="mt-0.5 accent-forest" />
          <span>I agree to the <Link to="/legal/terms" className="link">Terms</Link>, <Link to="/legal/privacy" className="link">Privacy Policy</Link> and <Link to={`/legal/${role}-policy`} className="link">{role === 'seller' ? 'Seller' : 'Buyer'} Policy</Link>.</span>
        </label>
        <div className="sm:col-span-2">
          <Button loading={busy} className="w-full" size="lg">{role === 'buyer' ? 'Create buyer account' : 'Apply as seller'}</Button>
          <p className="mt-4 text-center text-sm text-ink-medium">Already have an account? <Link to="/login" className="link">Sign in</Link></p>
        </div>
      </form>
      )}
    </Shell>
  );
}

/* ----------------------------- VERIFY EMAIL (OTP) ----------------------------- */
export function Verify() {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ t: '', type: 'info' });
  useEffect(() => {
    if (!user) nav('/login', { replace: true });
    else if (user.emailVerified) nav(homeFor(user), { replace: true });
  }, [user, nav]);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/auth/verify-email', { code });
      setUser(data.user);
      const plan = sessionStorage.getItem('rv_plan');
      sessionStorage.removeItem('rv_plan');
      nav(plan && !plan.endsWith('basic') && !plan.endsWith('starter') ? `${homeFor(data.user)}/subscription?plan=${plan}` : homeFor(data.user), { replace: true });
    } catch (x) { setMsg({ t: errMsg(x), type: 'error' }); } finally { setBusy(false); }
  };
  const resend = async () => {
    try { await api.post('/auth/resend-otp'); setMsg({ t: 'A new code is on its way.', type: 'success' }); } catch (x) { setMsg({ t: errMsg(x), type: 'error' }); }
  };
  if (!user) return null;
  return (
    <Shell title="Check your email" subtitle={`We sent a 6-digit code to ${user.email}.`}>
      <form onSubmit={submit} className="space-y-4">
        {msg.t && <Alert type={msg.type}>{msg.t}</Alert>}
        <Input required inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="text-center font-serif text-3xl tracking-[0.6em]" placeholder="••••••" aria-label="Verification code" />
        <Button loading={busy} disabled={code.length !== 6} className="w-full" size="lg">Verify email</Button>
        <p className="text-center text-sm text-ink-medium">Didn’t get it? <button type="button" onClick={resend} className="link">Resend code</button></p>
      </form>
    </Shell>
  );
}

/* ----------------------------- FORGOT / RESET ----------------------------- */
export function Forgot() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: '', code: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (step === 1) { await api.post('/auth/forgot-password', { email: form.email }); setStep(2); }
      else { await api.post('/auth/reset-password', form); nav('/login?reset=1'); }
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  return (
    <Shell title="Reset your password" subtitle={step === 1 ? 'Enter your email and we’ll send a reset code.' : `If an account exists for ${form.email}, a code is on its way.`}>
      <form onSubmit={submit} className="space-y-4">
        {err && <Alert type="error">{err}</Alert>}
        {step === 1 ? (
          <Field label="Email"><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        ) : (
          <>
            <Field label="6-digit code"><Input required inputMode="numeric" maxLength={6} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
            <Field label="New password" hint="At least 8 characters"><Input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          </>
        )}
        <Button loading={busy} className="w-full" size="lg">{step === 1 ? 'Send code' : 'Set new password'}</Button>
        <p className="text-center text-sm"><Link to="/login" className="link">Back to sign in</Link></p>
      </form>
    </Shell>
  );
}
