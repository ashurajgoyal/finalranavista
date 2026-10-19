import { COUNTRIES, US_STATES } from '../lib/format';
import { Field, Input, Select } from './ui';

/**
 * Country-aware address block (renders grid cells — place inside a `sm:grid-cols-2` grid).
 * United States → state dropdown + ZIP; everywhere else → free-text state/province + postal code.
 */
export default function AddressFields({ value = {}, onChange, street = false, prefix = '' }) {
  const v = { line1: '', city: '', state: '', zip: '', country: 'United States', ...value };
  const set = (k) => (e) => {
    const next = { ...v, [k]: e.target.value };
    if (k === 'country' && e.target.value !== v.country) next.state = '';
    onChange(next);
  };
  const us = v.country === 'United States';
  return (
    <>
      <Field label={`${prefix}Country`}><Select value={v.country} onChange={set('country')} options={COUNTRIES} autoComplete="country-name" /></Field>
      <Field label={`${prefix}City`}><Input value={v.city} onChange={set('city')} autoComplete="address-level2" /></Field>
      {street && <Field label="Street address" className="sm:col-span-2"><Input value={v.line1} onChange={set('line1')} autoComplete="street-address" /></Field>}
      <div className="grid grid-cols-2 gap-3 sm:col-span-2">
        {us
          ? <Field label="State"><Select value={v.state} onChange={set('state')} options={US_STATES} placeholder="—" /></Field>
          : <Field label="State / province"><Input value={v.state} onChange={set('state')} autoComplete="address-level1" /></Field>}
        <Field label={us ? 'ZIP code' : 'Postal code'}><Input value={v.zip} onChange={set('zip')} maxLength={12} autoComplete="postal-code" /></Field>
      </div>
    </>
  );
}
