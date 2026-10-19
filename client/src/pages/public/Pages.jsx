import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Calendar, Check, Compass, Gem, Leaf, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import api, { errMsg } from '../../lib/api';
import useFetch from '../../lib/useFetch';
import { CATEGORIES } from '../../lib/format';
import PlanCard from '../../components/PlanCard';
import { Alert, Button, Field, Input, PageLoader, Textarea, cx } from '../../components/ui';
import { LotusMark } from '../../components/Logo';
import { CountryGrid, usePublicCountries } from '../../components/CountryGrid';

export function PageHero({ eyebrow, title, text }) {
  return (
    <section className="bg-hero relative overflow-hidden text-white">
      <div className="bg-grain absolute inset-0 opacity-40" aria-hidden />
      <LotusMark className="pointer-events-none absolute -right-12 top-1/2 h-64 w-auto -translate-y-1/2 opacity-[0.07]" color="#fff" />
      <div className="container-x relative py-16 sm:py-20">
        <p className="text-xs uppercase tracking-[0.25em] text-gold-light">{eyebrow}</p>
        <h1 className="rise mt-3 max-w-3xl text-4xl sm:text-5xl">{title}</h1>
        {text && <p className="rise rise-2 mt-4 max-w-2xl text-white/75">{text}</p>}
      </div>
    </section>
  );
}

/* ----------------------------- ABOUT ----------------------------- */
export function About() {
  const values = [
    { icon: Compass, title: 'Global Sourcing', text: 'We work with makers in 20+ countries — from India, Vietnam, Turkey and Indonesia to Europe, Japan, Brazil and the UAE.' },
    { icon: ShieldCheck, title: 'Trusted Partnerships', text: 'Every seller is verified by our team. Every order payment is held in escrow until delivery. Every dispute gets a human.' },
    { icon: Gem, title: 'Timeless Value', text: 'We favor durable, well-made goods and long-term buyer–maker relationships over one-off transactions.' },
    { icon: Leaf, title: 'Sustainable by design', text: 'Container planning cuts wasted freight, and we spotlight makers with responsible materials and fair labor.' },
  ];
  return (
    <>
      <PageHero eyebrow="About Ranavista" title="Connecting the world to exceptional home & lifestyle products" text="Ranavista was built for retailers, e-commerce brands, importers and interior studios around the world who want factory-direct pricing without the risk and noise of open marketplaces." />
      <section className="container-x grid gap-12 py-20 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Our approach</p>
          <h2 className="mt-3 text-3xl text-forest">A sourcing desk, not a search box</h2>
          <div className="mt-5 space-y-4 text-ink-medium">
            <p>Open B2B marketplaces send your request to dozens of suppliers at once. You get flooded with replies, many from traders rather than makers, and you’re left to vet them alone.</p>
            <p>Ranavista does the opposite. Every request lands with our sourcing team first. We review it, then hand it to the one verified manufacturer we believe fits best — by category, capacity, track record and responsiveness.</p>
            <p>If that seller can’t deliver a strong quote, we route your request to the next one. You only ever deal with one serious partner at a time.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {values.map((v) => (
            <div key={v.title} className="card card-pad">
              <v.icon className="h-6 w-6 text-gold" />
              <h3 className="mt-4 text-lg text-forest">{v.title}</h3>
              <p className="mt-1.5 text-sm text-ink-medium">{v.text}</p>
            </div>
          ))}
        </div>
      </section>
      <CTA />
    </>
  );
}

/* ----------------------------- CATEGORIES ----------------------------- */
const CAT_INFO = {
  'Home Decor': 'Vases, wall art, candle holders, decorative trays, metal & brass accents.',
  Furniture: 'Solid wood, rattan, iron and upholstered pieces — KD options for container efficiency.',
  'Home Textiles': 'Bedding, table linen, cushions, throws, curtains — block print to jacquard.',
  'Rugs & Carpets': 'Hand-knotted, hand-tufted, flat-weave and jute rugs in custom sizes.',
  'Kitchen & Dining': 'Serveware, cutlery, wooden boards, enamelware, glassware.',
  Lighting: 'Pendant and table lamps, lanterns, rattan and metal shades.',
  'Bath & Spa': 'Turkish towels, bath mats, organic cotton robes, accessories.',
  'Garden & Outdoor': 'Planters, outdoor furniture, garden decor, weatherproof textiles.',
  Handicrafts: 'Artisan-made pieces — wood carving, stone, papier-mâché, pottery.',
  'Fashion Accessories': 'Bags, scarves, belts and small accessories.',
  Jewelry: 'Fashion and fine jewelry, private label collections.',
  Apparel: 'Cut-and-sew garments, organic cotton basics, resort wear.',
  'Leather Goods': 'Bags, wallets, home leather accents.',
  'Gifts & Seasonal': 'Holiday decor, gift sets, seasonal collections.',
  Packaging: 'Custom boxes, gift packaging, eco-friendly shipping materials.',
  Other: 'Don’t see your product? Post an RFQ and our team will find the right maker.',
};
export function Categories() {
  return (
    <>
      <PageHero eyebrow="Products" title="Products by category and country" text="Browse what our verified makers produce in 20+ countries, or post an RFQ in any category — we match it to a manufacturer specializing in exactly that." />
      <section id="countries" className="container-x scroll-mt-28 pt-16">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Products by country</p>
            <h2 className="mt-2 text-3xl text-forest sm:text-4xl">Shop by sourcing country</h2>
            <p className="mt-2 max-w-2xl text-ink-medium">From Jaipur block prints to Japanese knives — see what each country does best, with indicative MOQs and prices.</p>
          </div>
          <Link to="/sourcing-request" className="btn-outline shrink-0">Can’t find it? Request a product <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-8"><CountryGrid compact /></div>
      </section>
      <section className="container-x pt-16"><p className="eyebrow">Products by category</p><h2 className="mt-2 text-3xl text-forest sm:text-4xl">Categories we source</h2></section>
      <section className="container-x grid gap-5 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((c) => (
          <div key={c} id={c} className="card card-pad group flex flex-col scroll-mt-28">
            <h3 className="text-xl text-forest">{c}</h3>
            <p className="mt-2 flex-1 text-sm text-ink-medium">{CAT_INFO[c]}</p>
            <Link to={`/register?role=buyer&category=${encodeURIComponent(c)}`} className="link mt-4 inline-flex items-center gap-1 text-sm">Request quotes <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></Link>
          </div>
        ))}
      </section>
    </>
  );
}

/* ----------------------------- SOURCING COUNTRIES ----------------------------- */
const COUNTRIES = [
  { name: 'India', flag: '🇮🇳', strengths: ['Home textiles', 'Handicrafts', 'Rugs', 'Brass & metal', 'Jewelry'], text: 'Our deepest network — Jaipur, Moradabad, Panipat, Bhadohi, Karur and beyond.' },
  { name: 'Vietnam', flag: '🇻🇳', strengths: ['Furniture', 'Ceramics', 'Bamboo & rattan'], text: 'Fast-growing furniture and lifestyle hub with strong export compliance.' },
  { name: 'Turkey', flag: '🇹🇷', strengths: ['Towels', 'Glassware', 'Rugs'], text: 'Premium cotton textiles and glass, a short hop from Europe and the Middle East.' },
  { name: 'Indonesia', flag: '🇮🇩', strengths: ['Teak furniture', 'Woven goods'], text: 'Solid-wood furniture and natural-fiber craft from Java and Bali.' },
  { name: 'Mexico', flag: '🇲🇽', strengths: ['Pottery', 'Talavera', 'Leather'], text: 'Nearshore option for North American buyers, with truck delivery and USMCA advantages.' },
  { name: 'Portugal', flag: '🇵🇹', strengths: ['Ceramics', 'Cork', 'Linen'], text: 'European craftsmanship for premium tableware and textiles.' },
];
export function Sourcing() {
  const live = usePublicCountries();
  return (
    <>
      <PageHero eyebrow="Sourcing countries" title="Where our makers are" text="We work with verified manufacturers in 20+ countries with strong craft heritage and reliable export infrastructure — shipping to buyers in every major market." />
      {live?.length ? <section className="container-x py-16"><CountryGrid /></section> : (
      <section className="container-x grid gap-5 py-16 md:grid-cols-2 lg:grid-cols-3">
        {COUNTRIES.map((c) => (
          <div key={c.name} className="card card-pad">
            <div className="flex items-center gap-3"><span className="text-4xl" aria-hidden>{c.flag}</span><h3 className="text-2xl text-forest">{c.name}</h3></div>
            <p className="mt-3 text-sm text-ink-medium">{c.text}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">{c.strengths.map((s) => <span key={s} className="rounded-full bg-cream px-2.5 py-1 text-xs text-ink">{s}</span>)}</div>
          </div>
        ))}
      </section>
      )}
      <CTA />
    </>
  );
}

/* ----------------------------- TRADE FAIRS ----------------------------- */
const FAIRS = [
  { name: 'IHGF Delhi Fair (Autumn)', country: '🇮🇳 India', when: 'Oct 14 – 18, 2026', where: 'India Expo Centre, Greater Noida', tags: ['Home', 'Lifestyle', 'Textiles'] },
  { name: 'High Point Market', country: '🇺🇸 United States', when: 'April & October', where: 'High Point, North Carolina', tags: ['Furniture', 'Home'] },
  { name: 'Las Vegas Market', country: '🇺🇸 United States', when: 'January & July', where: 'World Market Center, Las Vegas', tags: ['Furniture', 'Decor', 'Gift'] },
  { name: 'NY NOW', country: '🇺🇸 United States', when: 'February & August', where: 'Javits Center, New York', tags: ['Home', 'Gift', 'Lifestyle'] },
  { name: 'Ambiente', country: '🇩🇪 Germany', when: 'February', where: 'Messe Frankfurt', tags: ['Dining', 'Living', 'Giving'] },
  { name: 'Heimtextil', country: '🇩🇪 Germany', when: 'January', where: 'Messe Frankfurt', tags: ['Home textiles'] },
];
export function TradeFairs() {
  return (
    <>
      <PageHero eyebrow="Trade fairs" title="Meet our makers in person" text="Our team and sellers attend the leading home & lifestyle fairs. Enterprise members can book factory and booth visits through their sourcing manager." />
      <section className="container-x grid gap-5 py-16 md:grid-cols-2 lg:grid-cols-3">
        {FAIRS.map((f) => (
          <div key={f.name} className="card card-pad">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-forest p-2.5 text-gold-light"><Calendar className="h-5 w-5" /></div>
              <div><h3 className="text-lg text-forest">{f.name}</h3><p className="text-sm text-ink-medium">{f.country}</p></div>
            </div>
            <p className="mt-4 text-sm font-medium text-ink">{f.when}</p>
            <p className="flex items-center gap-1.5 text-sm text-ink-medium"><MapPin className="h-3.5 w-3.5" />{f.where}</p>
            <p className="mt-3 text-sm text-muted">{f.tags.join(' | ')}</p>
          </div>
        ))}
        <p className="text-xs text-ink-medium md:col-span-2 lg:col-span-3">Recurring fair months shown for planning — confirm exact dates on each organizer’s website.</p>
      </section>
    </>
  );
}

/* ----------------------------- PRICING ----------------------------- */
const SELLER_ADDONS = [
  ['Additional 10 product listings', '₹299', 'One-time or for the membership period'],
  ['Featured product placement', '₹499', 'Per 30-day campaign'],
  ['Featured supplier profile', '₹999', 'Per 30-day campaign'],
  ['Premium product catalogue design', '₹999', 'Per project'],
  ['Product description writing', '₹799', 'Per 10 products'],
  ['Professional company profile', '₹499', 'Per project'],
  ['Export readiness assessment', '₹1,499', 'Per assessment'],
  ['Photography, video, verification, QC, inspection, documentation & logistics coordination', 'Custom', 'Quoted per project or shipment'],
  ['Website development, digital marketing, custom B2B catalogue, dedicated sourcing support', 'Custom', 'Project fee or monthly retainer'],
];

export function Pricing() {
  const { data: plans, loading } = useFetch('/public/plans');
  const [aud, setAud] = useState('buyer');
  const all = (plans || []).filter((p) => p.audience === aud);
  const free = all.find((p) => !p.price && !p.customPricing);
  const cards = all.filter((p) => p !== free || all.length <= 3);
  const ctaFor = (p) => {
    if (p.customPricing) return <Link to={`/contact?topic=${encodeURIComponent(`${p.name} plan (${aud})`)}`} className="btn-outline w-full">Talk to our team</Link>;
    return <Link to={`/register?role=${aud}&plan=${p.key}`} className={cx('w-full', p.highlighted ? 'btn-gold' : 'btn-primary')}>{p.price ? `Choose ${p.name}` : 'Get started free'}</Link>;
  };
  return (
    <>
      <PageHero eyebrow="Pricing" title="Plans that grow with your business" text="Transparent plans for buyers and manufacturers worldwide. No markup on seller quotations — Ranavista only earns a small platform fee when an order completes." />
      <section className="container-x py-16">
        <div className="flex flex-col items-center gap-3">
          <div className="inline-flex rounded-2xl bg-white p-1.5 shadow-soft ring-1 ring-beige">
            {[['buyer', 'For buyers'], ['seller', 'For manufacturers']].map(([a, l]) => (
              <button key={a} onClick={() => setAud(a)} className={cx('rounded-xl px-6 py-2.5 text-sm font-medium transition', aud === a ? 'bg-forest text-white shadow-sm' : 'text-ink-medium hover:text-forest')}>{l}</button>
            ))}
          </div>
          <p className="text-xs text-ink-medium">{aud === 'buyer' ? 'Buyer plans are billed in US dollars (USD).' : 'Manufacturer plans are billed in Indian rupees (INR) and include GST where applicable.'}</p>
        </div>

        {loading ? <PageLoader /> : (
          <>
            {free && cards.length !== all.length && (
              <div className="mx-auto mt-10 flex max-w-6xl flex-col items-start justify-between gap-4 rounded-2xl border border-dashed border-gold/60 bg-white/70 px-6 py-5 sm:flex-row sm:items-center">
                <div>
                  <p className="font-serif text-xl text-forest">Just exploring? Start on the {free.name} plan.</p>
                  <p className="mt-0.5 text-sm text-ink-medium">{free.features.slice(1, 4).join(' · ')}. Upgrade any time.</p>
                </div>
                <Link to={`/register?role=${aud}&plan=${free.key}`} className="btn-outline shrink-0">Create free account <ArrowRight className="h-4 w-4" /></Link>
              </div>
            )}
            <div className={cx('mx-auto mt-10 grid max-w-6xl gap-6 md:grid-cols-2', cards.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
              {cards.map((p) => <PlanCard key={p.key} plan={p} action={ctaFor(p)} />)}
            </div>
          </>
        )}

        {aud === 'seller' && (
          <div className="mx-auto mt-16 max-w-6xl">
            <div className="text-center">
              <p className="eyebrow">Add-on services</p>
              <h2 className="mt-2 text-3xl text-forest">Boost your listing, on your terms</h2>
            </div>
            <div className="card mt-8 overflow-x-auto">
              <table className="table">
                <thead><tr><th>Service</th><th>Starting price</th><th>How it’s charged</th></tr></thead>
                <tbody>{SELLER_ADDONS.map(([s, p, m]) => <tr key={s}><td className="font-medium text-ink">{s}</td><td className="whitespace-nowrap font-serif text-lg text-forest">{p}</td><td className="text-ink-medium">{m}</td></tr>)}</tbody>
              </table>
            </div>
            <p className="mt-4 text-center text-xs text-ink-medium">Buyer contact details stay restricted on every plan, and no plan guarantees orders — leads are matched on fit, capacity and track record.</p>
          </div>
        )}

        <div className="mx-auto mt-14 grid max-w-6xl gap-4 sm:grid-cols-3">
          {[[ShieldCheck, 'Escrow-protected orders', 'Order payments are held by Ranavista and released to the seller only after delivery is confirmed.'], [Compass, 'Hand-matched sourcing', 'Every RFQ is reviewed by our team and routed to the best-fit verified manufacturer.'], [Gem, 'No hidden markups', 'You pay the seller’s quoted price. Card, ACH and wire fees are charged at cost by Stripe.']].map(([I, t, d]) => (
            <div key={t} className="flex gap-4 rounded-2xl bg-white/70 p-5 ring-1 ring-beige">
              <I className="h-6 w-6 shrink-0 text-gold" /><div><p className="font-medium text-ink">{t}</p><p className="mt-1 text-sm text-ink-medium">{d}</p></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/* ----------------------------- CONTACT ----------------------------- */
export function Contact() {
  const [sp] = useSearchParams();
  const topic = sp.get('topic');
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', message: topic ? `I'd like to know more about the ${topic}.` : '' });
  const [state, setState] = useState({ busy: false, ok: false, err: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, ok: false, err: '' });
    try { await api.post('/public/contact', form); setState({ busy: false, ok: true, err: '' }); setForm({ name: '', email: '', company: '', phone: '', message: '' }); }
    catch (x) { setState({ busy: false, ok: false, err: errMsg(x) }); }
  };
  return (
    <>
      <PageHero eyebrow="Contact us" title="Talk to our sourcing team" text="Questions about a product, a plan, a career or becoming a seller? We reply within one business day." />
      <section className="container-x grid gap-10 py-16 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-5">
          {[[Mail, 'Email', 'hello@ranavista.com', 'mailto:hello@ranavista.com'], [Phone, 'Phone', '+1 (800) 555-0199', 'tel:+18005550199'], [MapPin, 'Hours', 'Mon–Fri · we work across time zones', null]].map(([I, l, v, h]) => (
            <div key={l} className="card card-pad flex items-center gap-4">
              <div className="rounded-xl bg-forest p-3 text-gold-light"><I className="h-5 w-5" /></div>
              <div><p className="text-xs uppercase tracking-wider text-ink-medium">{l}</p>{h ? <a href={h} className="font-medium text-forest">{v}</a> : <p className="font-medium text-forest">{v}</p>}</div>
            </div>
          ))}
        </div>
        <form onSubmit={submit} className="card card-pad grid gap-4 sm:grid-cols-2">
          {state.ok && <Alert type="success" className="sm:col-span-2">Thanks — we’ve received your message and will be in touch shortly.</Alert>}
          {state.err && <Alert type="error" className="sm:col-span-2">{state.err}</Alert>}
          <Field label="Full name"><Input required value={form.name} onChange={set('name')} autoComplete="name" /></Field>
          <Field label="Work email"><Input required type="email" value={form.email} onChange={set('email')} autoComplete="email" /></Field>
          <Field label="Company"><Input value={form.company} onChange={set('company')} autoComplete="organization" /></Field>
          <Field label="Phone"><Input type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 555 555 5555" autoComplete="tel" /></Field>
          <Field label="How can we help?" className="sm:col-span-2"><Textarea required rows={5} value={form.message} onChange={set('message')} /></Field>
          <div className="sm:col-span-2"><Button loading={state.busy} size="lg">Send message</Button></div>
        </form>
      </section>
    </>
  );
}

export function CTA() {
  return (
    <section className="container-x pb-20">
      <div className="bg-hero relative overflow-hidden rounded-[1.75rem] px-8 py-12 text-center text-white sm:px-16">
        <h2 className="text-3xl sm:text-4xl">Ready to source smarter?</h2>
        <p className="mx-auto mt-3 max-w-xl text-white/75">Post your first RFQ free. Our team will match it with a verified maker within 24–48 hours.</p>
        <Link to="/register?role=buyer" className="btn-gold btn-lg mt-7">Post a free RFQ <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </section>
  );
}
