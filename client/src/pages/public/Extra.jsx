import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Anchor, ArrowRight, BadgeCheck, Bath, BedDouble, Briefcase, Camera, CheckCircle2, ClipboardList, Clock, Factory, FileText, Flower2, Gem, Gift, Globe2,
  ImagePlus, Lamp, LayoutGrid, Megaphone, Package, Palette, PenTool, Search, Shirt, ShieldCheck, Ship, ShoppingBag, Sofa, Sparkles, Tag, Trash2, UtensilsCrossed, X,
} from 'lucide-react';
import api, { errMsg, fileUrl } from '../../lib/api';
import useFetch from '../../lib/useFetch';
import { useAuth } from '../../lib/auth';
import { CATEGORIES, COUNTRIES, INCOTERMS, SOURCING_CURRENCIES, UNITS } from '../../lib/format';
import { Alert, Button, Field, Input, PageLoader, Select, Textarea, cx } from '../../components/ui';
import { PageHero } from './Pages';
import { CategoryTile, usePublicCountries } from '../../components/CountryGrid';

const sourcingLink = (p, c) => `/sourcing-request?${new URLSearchParams({ product: p.name, category: p.category || '', origin: c.name })}`;

export function CountryProducts() {
  const { slug } = useParams();
  const { data: c, loading, error } = useFetch(`/public/countries/${slug}`);
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const others = usePublicCountries();
  const products = useMemo(() => (c?.products || []).filter((p) => (!cat || p.category === cat) && (!q || `${p.name} ${p.description}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => Number(b.featured) - Number(a.featured)), [c, cat, q]);
  if (loading) return <PageLoader />;
  if (error || !c) return <div className="container-x py-24 text-center"><h1 className="text-3xl text-forest">Country not found</h1><Link to="/categories" className="btn-primary mt-6">All products</Link></div>;
  const cats = [...new Set(c.products.map((p) => p.category).filter(Boolean))];
  return (
    <>
      <section className="bg-hero relative overflow-hidden text-white">
        <div className="bg-grain absolute inset-0 opacity-40" aria-hidden />
        <div className="container-x relative py-14 sm:py-20">
          <Link to="/categories#countries" className="text-xs uppercase tracking-[0.25em] text-gold-light hover:text-white">Products · By country</Link>
          <div className="mt-3 flex flex-wrap items-center gap-4"><span className="text-6xl leading-none" aria-hidden>{c.flag}</span><h1 className="rise text-4xl sm:text-5xl">{c.name}</h1></div>
          <p className="rise rise-2 mt-4 max-w-2xl text-white/75">{c.intro}</p>
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-white/80">
            {c.sellers > 0 && <span className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-gold-light" />{c.sellers} verified sellers</span>}
            {c.leadTime && <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-gold-light" />Typical lead time {c.leadTime}</span>}
            {c.ports?.length > 0 && <span className="flex items-center gap-2"><Anchor className="h-4 w-4 text-gold-light" />{c.ports.slice(0, 3).join(' · ')}</span>}
          </div>
        </div>
      </section>

      <section className="container-x py-12">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card card-pad"><p className="eyebrow">Strengths</p><div className="mt-3 flex flex-wrap gap-1.5">{c.strengths.map((s) => <span key={s} className="rounded-full bg-cream px-3 py-1 text-sm">{s}</span>)}</div></div>
          <div className="card card-pad"><p className="eyebrow">Manufacturing hubs</p><p className="mt-3 flex items-start gap-2 text-sm text-ink"><Factory className="mt-0.5 h-4 w-4 shrink-0 text-gold" />{c.hubs.join(', ') || '—'}</p></div>
          <div className="card card-pad"><p className="eyebrow">Can’t see your product?</p><p className="mt-2 text-sm text-ink-medium">Send us a photo and your target price — our team sources it for you from {c.name} or anywhere else.</p><Link to={`/sourcing-request?origin=${encodeURIComponent(c.name)}`} className="link mt-3 inline-flex items-center gap-1 text-sm">Start a sourcing request <ArrowRight className="h-4 w-4" /></Link></div>
        </div>

        <div className="mt-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-3xl text-forest">Products from {c.name}</h2>
          <div className="relative md:w-72"><Search className="absolute left-3 top-3 h-4 w-4 text-ink-medium" /><Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" /></div>
        </div>
        {cats.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {['', ...cats].map((x) => <button key={x || 'all'} onClick={() => setCat(x)} className={cx('rounded-full border px-3.5 py-1.5 text-sm transition', cat === x ? 'border-forest bg-forest text-white' : 'border-line bg-white hover:border-gold')}>{x || 'All'}</button>)}
          </div>
        )}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <div key={p._id || p.name} className="card group flex flex-col overflow-hidden">
              {p.image ? <img src={fileUrl(p.image)} alt={p.name} className="aspect-[4/3] w-full object-cover" loading="lazy" /> : <CategoryTile category={p.category} className="aspect-[4/3] w-full" />}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold-dark">{p.category}</p>
                  {p.featured && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium uppercase text-gold-dark">Popular</span>}
                </div>
                <h3 className="mt-1 text-lg leading-snug text-forest">{p.name}</h3>
                {p.description && <p className="mt-1.5 flex-1 text-sm text-ink-medium">{p.description}</p>}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-medium">
                  {p.moq && <span>MOQ: <b className="font-medium text-ink">{p.moq}</b></span>}
                  {p.priceRange && <span>Indicative: <b className="font-medium text-ink">{p.priceRange}</b></span>}
                </div>
                <Link to={sourcingLink(p, c)} className="btn-outline btn-sm mt-4">Request a quote <ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>
            </div>
          ))}
          {!products.length && <p className="text-ink-medium">No products match.</p>}
        </div>
        <p className="mt-6 text-xs text-ink-medium">Indicative prices and MOQs vary by specification, quantity and season. Every quotation comes from a verified manufacturer.</p>
      </section>

      {others?.length > 1 && (
        <section className="container-x pb-20">
          <h2 className="mb-5 text-2xl text-forest">Other sourcing countries</h2>
          <div className="flex flex-wrap gap-2">
            {others.filter((o) => o.slug !== c.slug).map((o) => <Link key={o.slug} to={`/products/country/${o.slug}`} className="rounded-full bg-white px-4 py-2 text-sm shadow-soft ring-1 ring-beige transition hover:ring-gold"><span className="mr-1.5" aria-hidden>{o.flag}</span>{o.name}</Link>)}
          </div>
        </section>
      )}
    </>
  );
}

/* ---------------------------------------------------------------------------------
 * SOURCING REQUEST (can't find your product?)
 * --------------------------------------------------------------------------------- */
const MAX_IMAGES = 6;
const blankReq = (sp, user) => ({
  title: sp.get('product') || '', category: sp.get('category') || '', specifications: '', material: '', size: '', color: '', finish: '', packaging: '',
  quantity: '', unit: 'pcs', targetPrice: '', currency: 'USD', priceBasis: 'unit',
  requiredBy: new Date(Date.now() + 45 * 864e5).toISOString().slice(0, 10),
  destinationCountry: user?.address?.country || '', destinationCity: user?.address?.city || '', incoterm: '', preferredOrigin: sp.get('origin') || '',
  name: user?.name || '', company: user?.company || '', email: user?.email || '', phone: user?.phone || '', country: user?.address?.country || '', website: '',
});

export function SourcingRequest() {
  const { user } = useAuth();
  const buyer = user?.role === 'buyer' ? user : null;
  const [sp] = useSearchParams();
  const [f, setF] = useState(() => blankReq(sp, buyer));
  const [files, setFiles] = useState([]);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  const input = useRef(null);
  const countries = usePublicCountries();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const filesRef = useRef(files);
  filesRef.current = files;
  useEffect(() => () => filesRef.current.forEach((x) => URL.revokeObjectURL(x.preview)), []);

  const addFiles = (list) => {
    const ok = [...list].filter((x) => /\.(png|jpe?g|webp)$/i.test(x.name) && x.size <= 8 * 1024 * 1024);
    if (ok.length < list.length) setErr('Photos must be JPG, PNG or WEBP and under 8 MB each.'); else setErr('');
    setFiles((cur) => [...cur, ...ok.map((file) => ({ file, preview: URL.createObjectURL(file) }))].slice(0, MAX_IMAGES));
  };
  const submit = async (e) => {
    e.preventDefault();
    if (!files.length) return setErr('Please add at least one product photo.');
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => v !== '' && v != null && fd.append(k, v));
      files.forEach((x) => fd.append('images', x.file));
      const { data } = await api.post('/public/sourcing-requests', fd);
      setDone(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };

  if (done) {
    return (
      <>
        <PageHero eyebrow="Sourcing request" title="Your sourcing project has started" />
        <section className="container-x py-16">
          <div className="card card-pad mx-auto max-w-xl text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h2 className="mt-4 text-2xl text-forest">Thank you — we’re on it</h2>
            <p className="mt-2 text-ink-medium">Your reference is <b className="text-ink">{done.number}</b>. Our sourcing team will search our verified manufacturer network and email you with options.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {buyer ? <Link to={`/buyer/sourcing/${done.id}`} className="btn-primary">Track it in your dashboard</Link> : <Link to="/register?role=buyer" className="btn-primary">Create a free buyer account to track it</Link>}
              <button onClick={() => { setDone(null); setFiles([]); setF(blankReq(new URLSearchParams(), buyer)); }} className="btn-outline">Submit another product</button>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHero eyebrow="Sourcing" title="Can’t find your product? We’ll source it." text="Upload a photo, tell us the specifications, your target price, quantity and when you need it. Our sourcing team turns it into a project and finds the right verified manufacturer." />
      <section className="container-x grid gap-10 py-14 lg:grid-cols-[1fr_340px]">
        <form onSubmit={submit} className="space-y-6">
          {err && <Alert type="error">{err}</Alert>}
          <input type="text" name="website" value={f.website} onChange={set('website')} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />

          <div className="card card-pad">
            <h2 className="text-xl text-forest">1. Product photos</h2>
            <p className="mt-1 text-sm text-ink-medium">Up to {MAX_IMAGES} photos — product shots, sketches or a screenshot from a website. JPG, PNG or WEBP, max 8 MB each.</p>
            <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
              className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {files.map((x, i) => (
                <div key={x.preview} className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-beige">
                  <img src={x.preview} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => { URL.revokeObjectURL(x.preview); setFiles(files.filter((_, j) => j !== i)); }} className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-ink shadow" aria-label="Remove photo"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              {files.length < MAX_IMAGES && (
                <button type="button" onClick={() => input.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gold/60 bg-cream/50 text-xs text-gold-dark transition hover:bg-cream">
                  <ImagePlus className="h-6 w-6" />Add photo
                </button>
              )}
            </div>
            <input ref={input} type="file" accept=".png,.jpg,.jpeg,.webp" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          </div>

          <div className="card card-pad grid gap-4 sm:grid-cols-2">
            <h2 className="text-xl text-forest sm:col-span-2">2. What do you need?</h2>
            <Field label="Product name" className="sm:col-span-2"><Input required value={f.title} onChange={set('title')} placeholder="e.g. Hand-hammered copper serving bowls" /></Field>
            <Field label="Category"><Select value={f.category} onChange={set('category')} options={CATEGORIES} placeholder="Choose (optional)" /></Field>
            <Field label="Preferred sourcing country (optional)"><Select value={f.preferredOrigin} onChange={set('preferredOrigin')} options={(countries || []).map((c) => c.name)} placeholder="Any country" /></Field>
            <Field label="Specifications" hint="Size, material, colour, finish, packaging, certifications, branding…" className="sm:col-span-2"><Textarea required rows={5} value={f.specifications} onChange={set('specifications')} /></Field>
            <div className="sm:col-span-2">
              <button type="button" onClick={() => setMore(!more)} className="text-sm font-medium text-forest underline-offset-4 hover:underline">{more ? 'Hide' : 'Add'} detailed specs (optional)</button>
              {more && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Material"><Input value={f.material} onChange={set('material')} /></Field>
                  <Field label="Size / dimensions"><Input value={f.size} onChange={set('size')} /></Field>
                  <Field label="Colour"><Input value={f.color} onChange={set('color')} /></Field>
                  <Field label="Finish"><Input value={f.finish} onChange={set('finish')} /></Field>
                  <Field label="Packaging" className="sm:col-span-2"><Input value={f.packaging} onChange={set('packaging')} placeholder="e.g. gift box with our logo, 6 per master carton" /></Field>
                </div>
              )}
            </div>
          </div>

          <div className="card card-pad grid gap-4 sm:grid-cols-2">
            <h2 className="text-xl text-forest sm:col-span-2">3. Quantity, price & date</h2>
            <Field label="Quantity required">
              <div className="flex gap-2"><Input required type="number" min="1" value={f.quantity} onChange={set('quantity')} /><Select value={f.unit} onChange={set('unit')} options={UNITS} className="w-32" /></div>
            </Field>
            <Field label="Target price">
              <div className="flex gap-2">
                <Select value={f.currency} onChange={set('currency')} options={SOURCING_CURRENCIES} className="w-28" />
                <Input required type="number" min="0" step="0.01" value={f.targetPrice} onChange={set('targetPrice')} />
                <Select value={f.priceBasis} onChange={set('priceBasis')} options={[{ value: 'unit', label: 'per unit' }, { value: 'total', label: 'total' }]} className="w-32" />
              </div>
            </Field>
            <Field label="Required by (date)"><Input required type="date" min={new Date().toISOString().slice(0, 10)} value={f.requiredBy} onChange={set('requiredBy')} /></Field>
            <Field label="Incoterm (optional)"><Select value={f.incoterm} onChange={set('incoterm')} options={INCOTERMS} placeholder="Not sure" /></Field>
            <Field label="Deliver to (country)"><Select value={f.destinationCountry} onChange={set('destinationCountry')} options={COUNTRIES} placeholder="Choose country" /></Field>
            <Field label="City (optional)"><Input value={f.destinationCity} onChange={set('destinationCity')} /></Field>
          </div>

          <div className="card card-pad grid gap-4 sm:grid-cols-2">
            <h2 className="text-xl text-forest sm:col-span-2">4. Your details</h2>
            {buyer ? (
              <p className="text-sm text-ink-medium sm:col-span-2">Signed in as <b className="text-ink">{buyer.name}</b> ({buyer.email}). We’ll add this project to your buyer dashboard.</p>
            ) : (
              <>
                <Field label="Full name"><Input required value={f.name} onChange={set('name')} autoComplete="name" /></Field>
                <Field label="Company"><Input value={f.company} onChange={set('company')} autoComplete="organization" /></Field>
                <Field label="Email"><Input required type="email" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
                <Field label="Phone / WhatsApp"><Input type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" /></Field>
                <Field label="Your country"><Select value={f.country} onChange={set('country')} options={COUNTRIES} placeholder="Choose" /></Field>
                <p className="self-end pb-3 text-xs text-ink-medium">Have an account? <Link to="/login?next=/sourcing-request" className="link">Sign in</Link> to track it in your dashboard.</p>
              </>
            )}
          </div>
          <Button loading={busy} size="lg" className="w-full sm:w-auto">Submit sourcing request <ArrowRight className="h-4 w-4" /></Button>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <div className="card card-pad">
            <p className="eyebrow">How it works</p>
            <ol className="mt-4 space-y-4 text-sm">
              {[['Send your request', 'Photo, specs, target price, quantity and date.'], ['We source it', 'Our team checks our verified makers across 20+ countries.'], ['You get a quotation', 'Price, MOQ and lead time — accept it and we turn it into an order.']].map(([t, d], i) => (
                <li key={t} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest text-xs text-white">{i + 1}</span><div><p className="font-medium text-ink">{t}</p><p className="text-ink-medium">{d}</p></div></li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl bg-forest p-5 text-sm text-white/80">
            <ShieldCheck className="h-6 w-6 text-gold-light" />
            <p className="mt-2">Free to request. Orders placed through Ranavista are paid via escrow and released only after delivery.</p>
          </div>
        </aside>
      </section>
    </>
  );
}

/* ---------------------------------------------------------------------------------
 * LIAISON SERVICES
 * --------------------------------------------------------------------------------- */
export const LIAISON = [
  { name: 'Sourcing', icon: Search, text: 'Find and shortlist the right manufacturers for your product, price point and volume.' },
  { name: 'Procurement', icon: ClipboardList, text: 'Negotiation, purchase orders, sampling and production follow-up on your behalf.' },
  { name: 'Inspection Services', icon: ShieldCheck, text: 'Factory audits, in-line and pre-shipment inspections with photo reports.' },
  { name: 'Shipping Services', icon: Ship, text: 'Freight, consolidation, export documentation and customs coordination.' },
  { name: 'Graphic Designing', icon: Palette, text: 'Labels, hang-tags, packaging artwork, catalogues and brand assets.' },
  { name: 'Product Photography', icon: Camera, text: 'Studio, lifestyle and e-commerce photography of your products.' },
  { name: 'Digital Marketing', icon: Megaphone, text: 'Social media, marketplace listings, campaigns and performance marketing.' },
  { name: 'Product Designing', icon: PenTool, text: 'New product development, tech packs, CAD drawings and prototyping.' },
  { name: 'Content Creation', icon: FileText, text: 'Product descriptions, catalogue copy, videos and brand storytelling.' },
  { name: 'White Labelling', icon: Tag, text: 'Private-label products made, branded and packed under your own label.' },
];

export function LiaisonServices() {
  const [f, setF] = useState({ name: '', company: '', email: '', phone: '', country: '', services: [], budget: '', timeline: '', message: '', website: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');
  const formRef = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (s) => setF((x) => ({ ...x, services: x.services.includes(s) ? x.services.filter((y) => y !== s) : [...x.services, s] }));
  const pick = (s) => { setF((x) => ({ ...x, services: x.services.includes(s) ? x.services : [...x.services, s] })); formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const submit = async (e) => {
    e.preventDefault();
    if (!f.services.length) return setErr('Choose at least one service.');
    setBusy(true); setErr('');
    try { const { data } = await api.post('/public/liaison', f); setDone(data.number); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHero eyebrow="Liaison services" title="Your team on the ground — at a fraction of the cost" text="We provide liaisoning services to international clients at low cost, delivered by industry experts. From finding the factory to the photo on your website, one partner handles it end to end." />

      <section className="container-x py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">What we do</p>
          <h2 className="mt-2 text-3xl text-forest sm:text-4xl">Ten services, one point of contact</h2>
          <p className="mt-3 text-ink-medium">Pick one service or combine several. Click a card to add it to your enquiry.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {LIAISON.map((s) => {
            const on = f.services.includes(s.name);
            return (
              <button key={s.name} type="button" onClick={() => pick(s.name)} className={cx('card group flex flex-col p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lift', on && 'ring-2 ring-gold')}>
                <span className={cx('flex h-11 w-11 items-center justify-center rounded-xl transition', on ? 'bg-gold text-white' : 'bg-forest text-gold-light')}><s.icon className="h-5 w-5" /></span>
                <h3 className="mt-4 text-lg text-forest">{s.name}</h3>
                <p className="mt-1 flex-1 text-sm text-ink-medium">{s.text}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-gold-dark">{on ? <><CheckCircle2 className="h-3.5 w-3.5" /> Added to enquiry</> : <>Enquire <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></>}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-white/60 py-16">
        <div className="container-x grid gap-6 md:grid-cols-3">
          {[[Globe2, 'For international clients', 'Retailers, brands and importers anywhere in the world who need a reliable partner in the source country.'],
            [BadgeCheck, 'Industry experts', 'Specialists with years in export houses, buying offices, design studios and freight — not generalists.'],
            [Sparkles, 'Low cost, clear pricing', 'Pay per service or per project. You get a written quote before any work starts.']].map(([I, t, d]) => (
            <div key={t} className="flex gap-4"><I className="h-7 w-7 shrink-0 text-gold" /><div><p className="font-serif text-xl text-forest">{t}</p><p className="mt-1 text-sm text-ink-medium">{d}</p></div></div>
          ))}
        </div>
      </section>

      <section ref={formRef} className="container-x scroll-mt-24 py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="eyebrow">Get in touch</p>
            <h2 className="mt-2 text-3xl text-forest">Tell us what you need</h2>
            <p className="mt-3 text-ink-medium">Write to us with the services you’re interested in. A specialist replies within one business day with next steps and a quote.</p>
            <ul className="mt-6 space-y-2 text-sm text-ink-medium">
              {['No obligation — quotes are free', 'One dedicated contact for every service', 'NDA available on request'].map((t) => <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-gold" />{t}</li>)}
            </ul>
          </div>
          {done ? (
            <div className="card card-pad text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
              <h3 className="mt-3 text-2xl text-forest">Thank you!</h3>
              <p className="mt-2 text-ink-medium">We’ve received your enquiry <b>{done}</b>. Our liaison team will email you shortly.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="card card-pad grid gap-4 sm:grid-cols-2">
              {err && <Alert type="error" className="sm:col-span-2">{err}</Alert>}
              <input type="text" name="website" value={f.website} onChange={set('website')} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
              <div className="sm:col-span-2">
                <span className="label">Services you’re interested in</span>
                <div className="flex flex-wrap gap-2">
                  {LIAISON.map((s) => <button key={s.name} type="button" onClick={() => toggle(s.name)} className={cx('inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition', f.services.includes(s.name) ? 'border-forest bg-forest text-white' : 'border-line bg-white hover:border-gold')}>{f.services.includes(s.name) && <X className="h-3 w-3" />}{s.name}</button>)}
                </div>
              </div>
              <Field label="Full name"><Input required value={f.name} onChange={set('name')} autoComplete="name" /></Field>
              <Field label="Company"><Input value={f.company} onChange={set('company')} autoComplete="organization" /></Field>
              <Field label="Email"><Input required type="email" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
              <Field label="Phone / WhatsApp"><Input type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" /></Field>
              <Field label="Country"><Select value={f.country} onChange={set('country')} options={COUNTRIES} placeholder="Choose" /></Field>
              <Field label="Budget (optional)"><Input value={f.budget} onChange={set('budget')} placeholder="e.g. $2,000 – $5,000" /></Field>
              <Field label="Timeline (optional)" className="sm:col-span-2"><Select value={f.timeline} onChange={set('timeline')} options={['As soon as possible', 'Within a month', '1–3 months', '3–6 months', 'Just exploring']} placeholder="Choose" /></Field>
              <Field label="Tell us about your project" className="sm:col-span-2"><Textarea required rows={5} value={f.message} onChange={set('message')} placeholder="Products, quantities, target markets, what you’d like us to handle…" /></Field>
              <div className="sm:col-span-2"><Button loading={busy} size="lg">Send enquiry</Button></div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
