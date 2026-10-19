import { useId } from 'react';
import { Link } from 'react-router-dom';
import { LOTUS, WORDMARK } from './brandPaths';

/**
 * The finalised Ranavista lotus (vector, traced from the approved artwork).
 * - default: brand gold gradient
 * - color="#fff" etc.: single-colour version (used for watermarks)
 */
export function LotusMark({ className = 'h-9 w-12', color }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox={`0 0 ${LOTUS.w} ${LOTUS.h}`} className={className} aria-hidden="true">
      {!color && (
        <defs>
          <linearGradient id={`lg${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#E6CF9F" />
            <stop offset=".5" stopColor="#C6A266" />
            <stop offset="1" stopColor="#9A7743" />
          </linearGradient>
        </defs>
      )}
      <path fill={color || `url(#lg${id})`} fillRule="evenodd" d={LOTUS.d} />
    </svg>
  );
}

/** "RANAVISTA" wordmark exactly as in the approved logo. */
export function Wordmark({ className = 'h-5', color = '#0D3B32' }) {
  return (
    <svg viewBox={`0 0 ${WORDMARK.w} ${WORDMARK.h}`} className={className} role="img" aria-label="Ranavista">
      <path fill={color} fillRule="evenodd" d={WORDMARK.d} />
    </svg>
  );
}

/**
 * Logo lockups.
 *  - horizontal (default): lotus + wordmark (+ optional tagline) — navbar, footer, admin
 *  - stacked: lotus above wordmark — auth screens, hero moments
 */
export default function Logo({ light = false, tagline = true, to = '/', stacked = false, size = 'md' }) {
  const text = light ? '#F7F3EA' : '#0D3B32';
  const big = size === 'lg';
  const small = size === 'sm';
  if (stacked) {
    return (
      <Link to={to} className="group inline-flex flex-col items-center" aria-label="Ranavista home">
        <LotusMark className={big ? 'h-24 w-auto' : 'h-16 w-auto'} />
        <Wordmark className={cxs(big ? 'mt-3 h-9' : 'mt-2.5 h-6', 'w-auto')} color={text} />
        {tagline && <span className={`mt-2 text-[9px] tracking-[0.3em] ${light ? 'text-gold-light/80' : 'text-ink-medium'}`}>SOURCING TODAY FOR A BRIGHTER TOMORROW</span>}
      </Link>
    );
  }
  return (
    <Link to={to} className={cxs('group flex items-center', small ? 'gap-2.5' : 'gap-3')} aria-label="Ranavista home">
      <LotusMark className={cxs(big ? 'h-12' : small ? 'h-8' : 'h-10', 'w-auto shrink-0 transition-transform duration-300 group-hover:scale-105')} />
      <span className="flex flex-col leading-none">
        <Wordmark className={cxs(big ? 'h-[26px]' : small ? 'h-[16px]' : 'h-[21px]', 'w-auto')} color={text} />
        {tagline && <span className={`mt-1.5 whitespace-nowrap text-[7.5px] tracking-[0.26em] ${light ? 'text-gold-light/85' : 'text-ink-medium'}`}>SOURCING TODAY FOR A BRIGHTER TOMORROW</span>}
      </span>
    </Link>
  );
}

const cxs = (...c) => c.filter(Boolean).join(' ');
