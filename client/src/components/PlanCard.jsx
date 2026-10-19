import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { planPrice } from '../lib/format';
import { cx } from './ui';

const SHOW = 7;

/**
 * One subscription plan card — used on the public Pricing page and in the dashboard "Plan & billing" page.
 * `action` is the CTA element (a Link or a Button) rendered under the price.
 */
export default function PlanCard({ plan: p, action, current, emphasis }) {
  const [all, setAll] = useState(false);
  const price = planPrice(p);
  const features = all ? p.features : p.features.slice(0, SHOW);
  const hot = p.highlighted && !current;
  return (
    <div className={cx(
      'relative flex flex-col rounded-[1.4rem] border bg-white p-6 transition duration-200 sm:p-7',
      current ? 'border-forest ring-2 ring-forest/15' : emphasis ? 'border-gold ring-2 ring-gold/30' : hot ? 'border-gold/70 shadow-lift lg:-translate-y-2' : 'border-beige shadow-soft hover:-translate-y-0.5 hover:shadow-lift',
    )}>
      {hot && <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-gold-dark to-gold px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white shadow-sm">Most popular</span>}
      {current && <span className="absolute -top-3 left-6 rounded-full bg-forest px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white">Your plan</span>}

      {p.audienceNote && <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gold-dark">{p.audienceNote}</p>}
      <h3 className="mt-1.5 text-2xl text-forest">{p.name}</h3>
      <p className="mt-1 min-h-[3.75rem] text-sm leading-snug text-ink-medium">{p.tagline}</p>

      <div className="mt-5 border-t border-mist pt-5">
        <p className="flex flex-wrap items-baseline gap-x-2">
          {price.compareAt && <span className="text-lg text-ink-medium line-through decoration-gold/70">{price.compareAt}</span>}
          <span className="font-serif text-[2.6rem] leading-none text-ink">{price.main}</span>
          {price.suffix && !p.customPricing && p.price > 0 && <span className="text-sm text-ink-medium">{price.suffix}</span>}
        </p>
        <p className="mt-2 min-h-[1.25rem] text-xs text-ink-medium">
          {p.customPricing ? price.suffix : p.price > 0 ? (p.priceNote || (p.billingPeriod === 'quarter' ? 'Billed every 3 months' : p.billingPeriod === 'year' ? 'Billed yearly' : 'Billed monthly · cancel anytime')) : (p.priceNote || 'No card required')}
        </p>
      </div>

      <div className="mt-5">{action}</div>

      <ul className="mt-6 flex-1 space-y-2.5 text-sm">
        {features.map((f) => (
          <li key={f} className="flex gap-2.5">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-forest/10"><Check className="h-3 w-3 text-forest" strokeWidth={3} /></span>
            <span className={cx(/^Everything in/i.test(f) && 'font-medium text-forest')}>{f}</span>
          </li>
        ))}
      </ul>
      {p.features.length > SHOW && (
        <button type="button" onClick={() => setAll(!all)} className="mt-4 inline-flex items-center gap-1 self-start text-sm font-medium text-forest hover:text-gold-dark">
          {all ? 'Show less' : `See all ${p.features.length} features`} <ChevronDown className={cx('h-4 w-4 transition', all && 'rotate-180')} />
        </button>
      )}
    </div>
  );
}
