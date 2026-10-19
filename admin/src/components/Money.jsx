import { useFx } from '../lib/currency';
import { inr, usd } from '../lib/format';
import { cx } from './ui';

/**
 * Shows an amount in BOTH currencies (Manage shows USD and INR everywhere).
 *   <Money value={1200} />                      → $1,200.00  ₹1,05,600
 *   <Money value={1499} currency="INR" />       → ₹1,499  $17.03
 *   <Money value={o.total} rate={o.fxInrPerUsd} stack />   (order's own historic rate, INR on a second line)
 */
export default function Money({ value, currency = 'USD', rate, digits = 2, stack = false, className, secondaryClassName }) {
  const { inr: live } = useFx();
  const r = rate || live;
  const n = Number(value || 0);
  const [primary, secondary] = currency === 'INR' ? [inr(n, 0), usd(n / r, digits)] : [usd(n, digits), inr(n * r, 0)];
  return (
    <span className={cx(stack ? 'inline-flex flex-col leading-tight' : 'whitespace-nowrap', className)} title={`1 USD = ₹${r.toFixed(2)}`}>
      <span>{primary}</span>
      <span className={cx(stack ? 'mt-0.5 text-[0.62em] font-sans text-ink-medium' : 'ml-1.5 text-[0.82em] font-normal text-ink-medium', secondaryClassName)}>{secondary}</span>
    </span>
  );
}
