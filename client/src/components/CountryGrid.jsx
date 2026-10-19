import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bath, BedDouble, Briefcase, Flower2, Gem, Gift, Lamp, LayoutGrid, Package, Palette, Shirt, ShoppingBag, Sofa, Sparkles, UtensilsCrossed } from 'lucide-react';
import api from '../lib/api';
import { PageLoader, cx } from './ui';

/* ---------------------------------------------------------------------------------
 * Category visuals (used when a product has no photo yet)
 * --------------------------------------------------------------------------------- */
const CAT_ICON = {
  'Home Decor': Sparkles, Furniture: Sofa, 'Home Textiles': BedDouble, 'Rugs & Carpets': LayoutGrid, 'Kitchen & Dining': UtensilsCrossed, Lighting: Lamp,
  'Bath & Spa': Bath, 'Garden & Outdoor': Flower2, Handicrafts: Palette, 'Fashion Accessories': ShoppingBag, Jewelry: Gem, Apparel: Shirt,
  'Leather Goods': Briefcase, 'Gifts & Seasonal': Gift, Packaging: Package, Other: Package,
};
export function CategoryTile({ category, className }) {
  const Icon = CAT_ICON[category] || Package;
  return (
    <div className={cx('bg-hero relative flex items-center justify-center overflow-hidden', className)}>
      <div className="bg-grain absolute inset-0 opacity-50" aria-hidden />
      <Icon className="relative h-10 w-10 text-gold-light" strokeWidth={1.4} />
    </div>
  );
}

/* ---------------------------------------------------------------------------------
 * PRODUCTS BY COUNTRY — shared by the Products page, the Sourcing countries page and the navbar
 * --------------------------------------------------------------------------------- */
let countriesPromise = null;
export function usePublicCountries() {
  const [list, setList] = useState(null);
  useEffect(() => {
    countriesPromise ||= api.get('/public/countries').then((r) => r.data).catch(() => { countriesPromise = null; return []; });
    countriesPromise.then(setList);
  }, []);
  return list;
}

/** Grid of country cards linking to /products/country/:slug */
export function CountryGrid({ limit, compact = false }) {
  const list = usePublicCountries();
  if (!list) return <PageLoader />;
  if (!list.length) return null;
  const items = limit ? list.slice(0, limit) : list;
  return (
    <div className={cx('grid gap-4', compact ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-3')}>
      {items.map((c) => (
        <Link key={c.slug} to={`/products/country/${c.slug}`} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
          <div className="flex items-center gap-3">
            <span className="text-4xl leading-none" aria-hidden>{c.flag}</span>
            <div className="min-w-0"><h3 className="truncate text-xl text-forest">{c.name}</h3><p className="text-xs text-ink-medium">{c.region}</p></div>
          </div>
          {!compact && <p className="mt-3 line-clamp-2 text-sm text-ink-medium">{c.intro}</p>}
          {!compact && c.strengths?.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{c.strengths.slice(0, 4).map((s) => <span key={s} className="rounded-full bg-cream px-2.5 py-1 text-xs text-ink">{s}</span>)}</div>}
          <div className="mt-auto flex items-center justify-between pt-4 text-xs text-ink-medium">
            <span>{c.productCount} product lines{c.sellers ? ` · ${c.sellers} verified sellers` : ''}</span>
            <ArrowRight className="h-4 w-4 text-gold transition group-hover:translate-x-0.5" />
          </div>
        </Link>
      ))}
    </div>
  );
}

