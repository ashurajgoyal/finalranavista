import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight, Briefcase, ChevronDown, Facebook, Globe2, Handshake, Instagram, Linkedin, Lock, Mail, Menu, PackageSearch, Phone, ShieldCheck, X, Youtube } from 'lucide-react';
import { usePublicCountries } from './CountryGrid';
import Logo, { LotusMark } from './Logo';
import { useAuth, homeFor } from '../lib/auth';
import { CATEGORIES } from '../lib/format';
import { cx } from './ui';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About Us' },
  { to: '/categories', label: 'Products', menu: 'products' },
  { to: '/sourcing-request', label: 'Sourcing', menu: 'sourcing' },
  { to: '/liaison-services', label: 'Liaison Services' },
  { to: '/trade-fairs', label: 'Trade Fairs' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/contact', label: 'Contact Us' },
];
const SOURCING_MENU = [
  { to: '/sourcing-request', label: 'Request a product', text: 'Can’t find it? Send a photo, specs & target price.', icon: PackageSearch },
  { to: '/sourcing', label: 'Sourcing countries', text: 'Where our verified makers are.', icon: Globe2 },
  { to: '/liaison-services', label: 'Liaison services', text: 'Inspection, shipping, design, photography & more.', icon: Handshake },
];

function TopBar() {
  return (
    <div className="hidden bg-forest-900 text-[12px] text-white/65 md:block">
      <div className="container-x flex h-9 items-center justify-between">
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-2"><Globe2 className="h-3.5 w-3.5 text-gold-light" /> Sourcing worldwide</span>
          <span className="h-3 w-px bg-white/20" />
          <Link to="/register?role=buyer" className="transition hover:text-white">For Buyers</Link>
          <Link to="/register?role=seller" className="transition hover:text-white">For Sellers</Link>
          <Link to="/liaison-services" className="text-gold-light transition hover:text-white">Liaison Services</Link>
        </span>
        <div className="flex items-center gap-5">
          <a href="mailto:hello@ranavista.com" className="flex items-center gap-1.5 transition hover:text-white"><Mail className="h-3.5 w-3.5 text-gold-light" /> hello@ranavista.com</a>
          <a href="tel:+18005550199" className="flex items-center gap-1.5 transition hover:text-white"><Phone className="h-3.5 w-3.5 text-gold-light" /> +1 (800) 555-0199</a>
          <Link to="/careers" className="flex items-center gap-1.5 transition hover:text-white"><Briefcase className="h-3.5 w-3.5 text-gold-light" /> Careers</Link>
        </div>
      </div>
    </div>
  );
}

const navCls = ({ isActive }) => cx(
  'relative flex items-center gap-1 px-3 text-[13px] tracking-wide transition xl:px-3.5',
  'after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:origin-center after:rounded-full after:bg-gold after:transition-transform after:duration-300',
  isActive ? 'text-white after:scale-x-100' : 'text-white/75 after:scale-x-0 hover:text-white hover:after:scale-x-100',
);

function Navbar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const countries = usePublicCountries();
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);

  return (
    <header className={cx('sticky top-0 z-40 border-b border-white/5 bg-forest/95 backdrop-blur transition-shadow', scrolled && 'shadow-lift')}>
      <div className="container-x flex h-[76px] items-center justify-between gap-4">
        <Logo light tagline={false} />
        <nav className="hidden items-stretch self-stretch xl:flex" aria-label="Main">
          {NAV.map((n) =>
            n.menu ? (
              <div key={n.to} className="group relative flex">
                <NavLink to={n.to} className={navCls}>{n.label} <ChevronDown className="h-3.5 w-3.5 transition group-hover:rotate-180" /></NavLink>
                {n.menu === 'products' ? (
                  <div className="invisible absolute left-1/2 top-full w-[720px] -translate-x-1/2 translate-y-2 rounded-2xl bg-white p-3 opacity-0 shadow-lift ring-1 ring-beige transition duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="grid grid-cols-[1fr_1fr_1.1fr] gap-3">
                      <div className="col-span-2">
                        <p className="px-3 pb-1 pt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-gold-dark">By category</p>
                        <div className="grid grid-cols-2 gap-0.5">
                          {CATEGORIES.slice(0, 14).map((c) => (
                            <Link key={c} to={`/categories#${encodeURIComponent(c)}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition hover:bg-cream hover:text-forest">
                              <span className="h-1.5 w-1.5 rounded-full bg-gold/70" />{c}
                            </Link>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl bg-cream/60 p-2">
                        <p className="px-2 pb-1 pt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-gold-dark">By country</p>
                        <div className="grid max-h-[300px] grid-cols-1 gap-0.5 overflow-y-auto">
                          {(countries || []).map((c) => (
                            <Link key={c.slug} to={`/products/country/${c.slug}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink transition hover:bg-white hover:text-forest"><span aria-hidden>{c.flag}</span>{c.name}</Link>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Link to="/categories" className="flex items-center justify-between rounded-xl bg-cream px-4 py-3 text-sm font-medium text-forest hover:bg-beige/60">All categories <ArrowRight className="h-4 w-4" /></Link>
                      <Link to="/categories#countries" className="flex items-center justify-between rounded-xl bg-cream px-4 py-3 text-sm font-medium text-forest hover:bg-beige/60">All countries <ArrowRight className="h-4 w-4" /></Link>
                    </div>
                  </div>
                ) : (
                  <div className="invisible absolute left-1/2 top-full w-[340px] -translate-x-1/2 translate-y-2 rounded-2xl bg-white p-2 opacity-0 shadow-lift ring-1 ring-beige transition duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    {SOURCING_MENU.map((m) => (
                      <Link key={m.to} to={m.to} className="flex gap-3 rounded-xl px-3 py-3 transition hover:bg-cream">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest text-gold-light"><m.icon className="h-4 w-4" /></span>
                        <span><span className="block text-sm font-medium text-forest">{m.label}</span><span className="block text-xs text-ink-medium">{m.text}</span></span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink key={n.to} to={n.to} end={n.end} className={navCls}>{n.label}</NavLink>
            )
          )}
        </nav>
        <div className="hidden items-center gap-2 xl:flex">
          {user ? (
            <Link to={homeFor(user)} className="btn-gold btn-sm">Go to dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="px-3 text-[13px] text-white/80 transition hover:text-white">Login</Link>
              <Link to="/register" className="btn-gold btn-sm px-4 py-2">Post an RFQ</Link>
            </>
          )}
        </div>
        <button className="rounded-md p-2 text-white xl:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-forest-900 xl:hidden">
          <div className="container-x flex flex-col py-3">
            {[...NAV, { to: '/sourcing', label: 'Sourcing Countries' }, { to: '/careers', label: 'Careers' }].map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('rounded-md px-3 py-3 text-white/85', isActive && 'bg-white/10 text-white')}>{n.label}</NavLink>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
              {user ? (
                <Link to={homeFor(user)} className="btn-gold col-span-2">Go to dashboard</Link>
              ) : (
                <>
                  <Link to="/login" className="btn border border-white/30 text-white">Login</Link>
                  <Link to="/register" className="btn-gold">Post an RFQ</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

const FOOTER_COLS = [
  ['Company', [['About Us', '/about'], ['Careers', '/careers', 'Hiring'], ['Trade Fairs', '/trade-fairs'], ['Contact Us', '/contact']]],
  ['Marketplace', [['Products', '/categories'], ['Products by Country', '/categories#countries'], ['Sourcing Request', '/sourcing-request', 'New'], ['Sourcing Countries', '/sourcing'], ['Liaison Services', '/liaison-services', 'New'], ['Pricing', '/pricing'], ['Post an RFQ', '/register?role=buyer'], ['Become a Seller', '/register?role=seller']]],
  ['Policies', [['Privacy Policy', '/legal/privacy'], ['Terms & Conditions', '/legal/terms'], ['Payment Protection', '/legal/payment-protection'], ['Refund & Cancellation', '/legal/refund-cancellation'], ['Shipping & Delivery', '/legal/shipping-delivery'], ['Buyer Policy', '/legal/buyer-policy'], ['Seller Policy', '/legal/seller-policy'], ['Subscriptions & Payments', '/legal/subscription-payment']]],
];

function Footer() {
  return (
    <footer className="relative overflow-hidden bg-forest text-white/75">
      <LotusMark className="pointer-events-none absolute -bottom-16 -right-16 h-80 w-auto opacity-[0.05]" color="#fff" />
      <div className="container-x relative grid gap-12 pb-12 pt-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logo light size="lg" />
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/65">Connecting global retailers and brands with exceptional home &amp; lifestyle manufacturers — vetted, matched by hand, and paid through escrow.</p>
          <Link to="/legal/payment-protection" className="mt-2 inline-flex items-center gap-1 text-xs text-gold-light transition hover:text-white"><ShieldCheck className="h-3.5 w-3.5" /> How escrow protects every order</Link>
          <div className="mt-6 space-y-2 text-sm">
            <a href="mailto:hello@ranavista.com" className="flex items-center gap-2.5 transition hover:text-white"><Mail className="h-4 w-4 text-gold" /> hello@ranavista.com</a>
            <a href="tel:+18005550199" className="flex items-center gap-2.5 transition hover:text-white"><Phone className="h-4 w-4 text-gold" /> +1 (800) 555-0199</a>
          </div>
          <div className="mt-6 flex gap-2.5">
            {[[Linkedin, 'LinkedIn'], [Facebook, 'Facebook'], [Instagram, 'Instagram'], [Youtube, 'YouTube']].map(([I, l]) => (
              <a key={l} href="#" className="rounded-full border border-white/15 p-2.5 transition hover:border-gold hover:bg-gold hover:text-white" aria-label={l}><I className="h-4 w-4" /></a>
            ))}
          </div>
        </div>
        <div className="grid gap-10 sm:grid-cols-3 lg:col-span-8 lg:pl-8">
          {FOOTER_COLS.map(([h, links]) => (
            <div key={h}>
              <h4 className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">{h}</h4>
              <ul className="space-y-2.5 text-sm">
                {links.map(([l, to, tag]) => (
                  <li key={to}><Link to={to} className="inline-flex items-center gap-2 transition hover:text-white">{l}{tag && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gold-light">{tag}</span>}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <div className="container-x flex flex-col justify-between gap-3 py-6 text-xs text-white/50 md:flex-row md:items-center">
          <span>© {new Date().getFullYear()} Ranavista. All rights reserved.</span>
          <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Payments processed securely by Stripe</span>
          <span className="font-serif italic text-white/60">Building Sustainable Partnerships Worldwide.</span>
        </div>
      </div>
    </footer>
  );
}

export default function SiteLayout() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) { window.scrollTo(0, 0); return undefined; }
    // in-page anchors like /categories#countries — wait for the page (and its data) to render
    const t = setTimeout(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
    return () => clearTimeout(t);
  }, [pathname, hash]);
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <Navbar />
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
