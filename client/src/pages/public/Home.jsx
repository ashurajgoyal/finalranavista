import { Link } from 'react-router-dom';
import {
  ArrowRight, BadgeCheck, Box, Building2, CheckCircle2, ClipboardList, CreditCard, FileText, Globe2, Handshake, Lock, MessageSquare, PackageSearch, ShieldCheck, ShoppingBag, Sparkles, Truck, UserCheck,
} from 'lucide-react';
import { CountryGrid } from '../../components/CountryGrid';
import { LotusMark } from '../../components/Logo';
import { CATEGORIES } from '../../lib/format';

const STEPS = [
  { icon: ClipboardList, title: 'Post your RFQ', text: 'Tell us what you need — items, quantities, target price, deadline and delivery location. Takes about 3 minutes.' },
  { icon: UserCheck, title: 'We hand-pick one seller', text: 'Our sourcing team reviews every request and routes it to the single best-fit verified manufacturer. No spam, no bidding wars.' },
  { icon: Handshake, title: 'Review & negotiate', text: 'Get a clear line-by-line quotation. Accept it, or counter-offer and chat directly with the seller.' },
  { icon: ShieldCheck, title: 'Pay safely, release on delivery', text: 'Your payment is held in escrow by Ranavista and released to the seller only after you confirm the goods arrived.' },
];

const FEATURES = [
  { icon: BadgeCheck, title: 'Verified manufacturers only', text: 'Business documents, export history and capacity are checked before a seller can receive a single lead.' },
  { icon: Lock, title: 'Escrow-style protection', text: 'Funds are held securely via Stripe. If something goes wrong, our dispute team steps in.' },
  { icon: Box, title: 'Container fill planner', text: 'See how full your 20′, 40′ or 40′ HC container is by volume and weight — and what to add to lower landed cost.' },
  { icon: MessageSquare, title: 'One conversation, one seller', text: 'Chat, files and negotiation history live in one place — no inbox flooded by dozens of suppliers.' },
  { icon: FileText, title: 'Automatic invoices', text: 'A clean PDF invoice is generated for every order, ready for your accountant.' },
  { icon: Globe2, title: 'Built for global buyers', text: 'Buyers from any country welcome — USD pricing, metric and imperial units, support across time zones, and sellers experienced with export compliance.' },
];

const ESCROW = [
  { icon: CreditCard, title: 'Buyer pays Ranavista', text: 'You accept the quotation and pay the order total securely through Stripe — not to the seller directly.' },
  { icon: Lock, title: 'Funds are held', text: 'We hold the money and tell the seller it’s secured, so production can start with confidence.' },
  { icon: Truck, title: 'Seller ships', text: 'The seller dispatches with tracking. You receive and inspect the goods.' },
  { icon: BadgeCheck, title: 'Payment released', text: 'You confirm delivery and we release the payment to the seller, minus the platform fee.' },
];

const FAQ = [
  ['What does “escrow” mean on Ranavista?', 'Escrow means your payment is held by a neutral party instead of going straight to the seller. On Ranavista you pay the order amount to us through Stripe; we hold it while the seller produces and ships, and release it to the seller only after you confirm the goods arrived as agreed. If there’s a problem, the money stays frozen while our team resolves the dispute.'],
  ['Can buyers outside the USA use Ranavista?', 'Yes. Ranavista connects retailers, brands and importers in every country with verified manufacturers. Quotations are in USD and each RFQ uses an Incoterm (FOB, CIF, DDP and more), so shipping to your market is clear from the start.'],
  ['Why only one seller per RFQ?', 'Quality over quantity. Our team matches your request to the manufacturer best suited by category, capacity and track record — so you get a serious quote instead of 40 emails.'],
  ['What if I don’t like the quote?', 'Counter-offer in the app, or decline and ask us to route your RFQ to a different seller at no extra cost.'],
  ['How does payment protection work?', 'You pay through Stripe. Ranavista holds the funds and releases them to the seller only after you confirm delivery. Open a dispute any time while funds are on hold.'],
  ['Is there a fee for buyers?', 'You can start free with 3 RFQs a month. Paid plans — Starter, Professional, Business and Enterprise — add more RFQs, AI sourcing tools, landed-cost and container planning. There is never a markup on seller quotes.'],
];

function HeroMock() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="absolute -inset-6 rounded-[2rem] bg-gold/10 blur-2xl" aria-hidden />
      <div className="rise rise-2 relative rounded-2xl bg-white p-5 shadow-lift">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.2em] text-gold-dark">RFQ-2026-00418</span>
          <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-xs font-medium text-forest">Quote received</span>
        </div>
        <p className="mt-2 font-serif text-xl text-forest">Hand-block printed table linens</p>
        <p className="text-xs text-ink-medium">Home Textiles · FOB · Ship to Rotterdam, Netherlands</p>
        <div className="mt-4 space-y-2 text-sm">
          {[['Table runner 14×72 in', '3,000 pcs', '$3.85'], ['Napkin set of 4', '5,000 sets', '$2.90']].map(([n, q, p]) => (
            <div key={n} className="flex items-center justify-between rounded-lg bg-cream/70 px-3 py-2">
              <span className="text-ink">{n}<span className="ml-2 text-xs text-ink-medium">{q}</span></span>
              <span className="font-medium text-forest">{p}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-end justify-between border-t border-mist pt-4">
          <div>
            <p className="text-xs text-ink-medium">Quotation total</p>
            <p className="font-serif text-2xl text-ink">$26,050.00</p>
          </div>
          <span className="btn-primary btn-sm">Accept quote</span>
        </div>
      </div>
      <div className="rise rise-3 absolute -bottom-8 -left-4 hidden w-56 rounded-xl bg-white p-3.5 shadow-lift sm:block">
        <p className="text-[11px] uppercase tracking-wider text-ink-medium">20′ container</p>
        <div className="mt-2 h-2 rounded-full bg-mist"><div className="h-full w-[86%] rounded-full bg-success" /></div>
        <p className="mt-1.5 text-xs text-ink"><b>86%</b> full · volume-limited</p>
      </div>
      <div className="rise rise-3 absolute -right-3 -top-6 hidden items-center gap-2 rounded-xl bg-forest px-3.5 py-2.5 text-white shadow-lift sm:flex">
        <ShieldCheck className="h-4 w-4 text-gold-light" />
        <span className="text-xs">$26,050 held in escrow</span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="bg-hero relative overflow-hidden text-white">
        <div className="bg-grain absolute inset-0 opacity-40" aria-hidden />
        <div className="container-x relative grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-2 lg:py-28">
          <div className="rise">
            <p className="font-serif text-lg italic text-gold-light">Global Sourcing · Trusted Partnerships · Timeless Value</p>
            <h1 className="mt-4 text-4xl leading-[1.1] sm:text-5xl lg:text-[3.6rem]">
              Source home &amp; lifestyle products from vetted makers — <span className="italic text-gold-light">matched by hand.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              For retailers and brands everywhere. Post one request — our sourcing team routes it to the single best-fit verified manufacturer. Get a clear quotation, negotiate in-app, and pay through escrow that’s released only when your goods arrive.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link to="/register?role=buyer" className="btn-gold btn-lg">Post a free RFQ <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/register?role=seller" className="btn btn-lg border border-white/30 text-white hover:bg-white/10">I’m a manufacturer</Link>
              <Link to="/liaison-services" className="btn btn-lg border border-gold/50 text-gold-light hover:bg-white/10">Liaison services</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
              {['No credit card to start', 'Escrow-protected payments', 'Buyers & makers worldwide'].map((t) => (
                <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-gold-light" />{t}</span>
              ))}
            </div>
          </div>
          <HeroMock />
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-b border-beige bg-white">
        <div className="container-x grid grid-cols-2 gap-6 py-8 text-center md:grid-cols-4">
          {[['1 seller', 'hand-matched per RFQ'], ['100%', 'escrow-protected orders'], ['20+', 'sourcing countries'], ['24–48h', 'typical routing time']].map(([a, b]) => (
            <div key={b}>
              <p className="font-serif text-3xl text-forest">{a}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-ink-medium">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* GLOBAL REACH */}
      <section className="border-b border-beige bg-cream">
        <div className="container-x flex flex-col items-center gap-3 py-5 text-center text-sm text-ink-medium md:flex-row md:justify-center md:gap-6">
          <span className="flex items-center gap-2 font-medium text-forest"><Globe2 className="h-4 w-4 text-gold" /> Serving buyers worldwide</span>
          <span className="hidden h-4 w-px bg-beige md:block" />
          <span>North America · Europe · United Kingdom · Middle East · Australia &amp; NZ · Asia</span>
        </div>
      </section>

      {/* THREE WAYS TO WORK WITH US — Buyers · Sellers · Liaison services */}
      <section className="container-x py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Work with Ranavista</p>
          <h2 className="mt-2 text-3xl text-forest sm:text-4xl">Buyers, sellers — and a team on the ground</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { icon: ShoppingBag, title: 'For Buyers', text: 'Post an RFQ, or send a photo of a product you can’t find — we source it from verified makers in 20+ countries.', links: [['Post a free RFQ', '/register?role=buyer'], ['Request a product', '/sourcing-request']] },
            { icon: Building2, title: 'For Sellers', text: 'Register your factory, get verified by our team and receive exclusive, pre-qualified buyer leads.', links: [['Register as a supplier', '/register?role=seller'], ['Seller plans', '/pricing']] },
            { icon: Handshake, title: 'Liaison Services', text: 'Sourcing, procurement, inspection, shipping, design, photography, marketing and white labelling — at low cost, by industry experts.', links: [['Explore services', '/liaison-services']], gold: true },
          ].map((c) => (
            <div key={c.title} className={`flex flex-col rounded-[1.4rem] p-7 ${c.gold ? 'bg-hero text-white' : 'card'}`}>
              <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.gold ? 'bg-gold text-white' : 'bg-forest text-gold-light'}`}><c.icon className="h-6 w-6" /></span>
              <h3 className={`mt-5 text-2xl ${c.gold ? 'text-white' : 'text-forest'}`}>{c.title}</h3>
              <p className={`mt-2 flex-1 text-sm ${c.gold ? 'text-white/75' : 'text-ink-medium'}`}>{c.text}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {c.links.map(([l, to], i) => <Link key={to} to={to} className={i === 0 ? (c.gold ? 'btn-gold' : 'btn-primary') : 'btn-outline'}>{l}{i === 0 && <ArrowRight className="h-4 w-4" />}</Link>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUCTS BY COUNTRY */}
      <section className="border-y border-beige bg-white/60 py-20">
        <div className="container-x">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Sourcing countries</p>
              <h2 className="mt-2 text-3xl text-forest sm:text-4xl">Products from 20+ countries</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/categories#countries" className="btn-outline">All countries <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/sourcing-request" className="btn-gold"><PackageSearch className="h-4 w-4" /> Can’t find it? We’ll source it</Link>
            </div>
          </div>
          <div className="mt-8"><CountryGrid compact limit={10} /></div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="container-x py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-3xl text-forest sm:text-4xl">From request to delivery, without the noise</h2>
        </div>
        <ol className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card card-pad relative">
              <span className="absolute right-5 top-4 font-serif text-5xl text-beige">{i + 1}</span>
              <div className="inline-flex rounded-xl bg-forest p-3 text-gold-light"><s.icon className="h-5 w-5" /></div>
              <h3 className="mt-5 text-xl text-forest">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-medium">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>


      {/* ESCROW EXPLAINED */}
      <section className="relative overflow-hidden bg-forest py-20 text-white">
        <div className="bg-grain absolute inset-0 opacity-25" aria-hidden />
        <LotusMark className="pointer-events-none absolute -left-16 top-10 h-72 w-auto opacity-[0.06]" color="#fff" />
        <div className="container-x relative">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:items-end">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-light">Payment protection</p>
              <h2 className="mt-3 text-3xl sm:text-4xl">What “paid through escrow” means</h2>
            </div>
            <p className="text-white/70 lg:pb-1">Escrow means the buyer’s money is held by a neutral party — Ranavista — instead of going straight to the seller. Buyers know they won’t pay for goods that never arrive; sellers know the money is secured before they start production.</p>
          </div>
          <ol className="relative mt-12 grid gap-6 md:grid-cols-4">
            <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-gold/0 via-gold/60 to-gold/0 md:block" aria-hidden />
            {ESCROW.map((e, i) => (
              <li key={e.title} className="relative">
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-gold/50 bg-forest-900 text-gold-light shadow-lift"><e.icon className="h-5 w-5" /></div>
                <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.2em] text-gold-light/80">Step {i + 1}</p>
                <h3 className="mt-1 text-xl">{e.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{e.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/75"><b className="font-medium text-white">Something wrong with the delivery?</b> Open a dispute while funds are held — they stay frozen until our team decides on a release, refund or partial refund.</p>
            <Link to="/legal/payment-protection" className="btn-gold shrink-0">Read the policy <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-white py-20">
        <div className="container-x grid gap-12 lg:grid-cols-[1fr_1.6fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow">Why Ranavista</p>
            <h2 className="mt-3 text-3xl text-forest sm:text-4xl">A curated marketplace, not a directory</h2>
            <p className="mt-4 text-ink-medium">Open marketplaces flood you with unvetted suppliers. Ranavista puts a sourcing team between you and the factory floor — so every quote you see is one worth reading.</p>
            <Link to="/about" className="link mt-6 inline-flex items-center gap-1">Our approach <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl2 border border-beige bg-cream/50 p-6 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-soft">
                <f.icon className="h-6 w-6 text-gold" />
                <h3 className="mt-4 font-sans text-base font-semibold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-medium">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container-x py-20">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Products</p>
            <h2 className="mt-3 text-3xl text-forest sm:text-4xl">What our makers produce</h2>
          </div>
          <Link to="/categories" className="link inline-flex items-center gap-1">All categories <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.slice(0, 8).map((c, i) => (
            <Link key={c} to={`/register?role=buyer&category=${encodeURIComponent(c)}`}
              className="group relative flex h-32 flex-col justify-end overflow-hidden rounded-xl2 p-4 text-white transition hover:-translate-y-0.5 hover:shadow-lift"
              style={{ background: ['#0D3B32', '#A47148', '#6B7F5B', '#5A7D9A', '#134a40', '#9c8155', '#8BA88E', '#1F2D2A'][i] }}>
              <LotusMark className="absolute -right-4 -top-3 h-24 w-28 opacity-20 transition group-hover:opacity-30" color="#fff" />
              <span className="relative font-serif text-lg">{c}</span>
              <span className="relative text-xs text-white/70 group-hover:text-white">Request a quote →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ + SELLER CTA */}
      <section className="bg-white py-20">
        <div className="container-x grid gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Questions</p>
            <h2 className="mt-3 text-3xl text-forest">Frequently asked</h2>
            <div className="mt-8 divide-y divide-mist rounded-xl2 border border-beige">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink">
                    {q}<span className="text-gold transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-ink-medium">{a}</p>
                </details>
              ))}
            </div>
          </div>
          <div className="bg-hero relative overflow-hidden rounded-[1.75rem] p-8 text-white sm:p-10">
            <LotusMark className="absolute -bottom-6 -right-6 h-40 w-48 opacity-15" color="#fff" />
            <Sparkles className="h-6 w-6 text-gold-light" />
            <h3 className="mt-4 text-3xl">Manufacturers: receive exclusive, pre-qualified leads</h3>
            <p className="mt-3 text-white/75">Every lead you receive is reviewed by our team and sent to you alone. No race to the bottom — just serious buyers from around the world, ready to order.</p>
            <ul className="mt-6 space-y-2 text-sm text-white/85">
              {['Exclusive leads, matched to your categories', 'Get paid via Stripe Connect', 'Build your rating with every delivery'].map((t) => (
                <li key={t} className="flex items-center gap-2"><Truck className="h-4 w-4 text-gold-light" />{t}</li>
              ))}
            </ul>
            <Link to="/register?role=seller" className="btn-gold btn-lg mt-8">Apply as a seller <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
