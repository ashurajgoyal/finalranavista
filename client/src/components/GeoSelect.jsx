import { useEffect, useState } from 'react';
import api from '../lib/api';
import { COUNTRIES } from '../lib/format';
import { Field, Input, Select } from './ui';

let countriesCache = null;
const statesCache = {};
const citiesCache = {};

async function loadCountries() {
  if (!countriesCache) countriesCache = api.get('/public/geo/countries').then((r) => r.data).catch(() => []);
  return countriesCache;
}

/**
 * Country → State → City dropdowns (data from the API). Values are plain names.
 * Falls back to free-text inputs when the lists aren't available. Renders three grid cells.
 */
export default function GeoSelect({ value = {}, onChange, required = false, labels = {} }) {
  const v = { country: '', state: '', city: '', ...value };
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [otherCity, setOtherCity] = useState(false);

  useEffect(() => { loadCountries().then(setCountries); }, []);
  const cCode = countries.find((c) => c.name === v.country)?.code;
  useEffect(() => {
    if (!cCode) { setStates([]); return; }
    statesCache[cCode] ||= api.get('/public/geo/states', { params: { country: cCode } }).then((r) => r.data).catch(() => []);
    statesCache[cCode].then(setStates);
  }, [cCode]);
  const sCode = states.find((s) => s.name === v.state)?.code;
  useEffect(() => {
    if (!cCode || !sCode) { setCities([]); return; }
    const key = `${cCode}-${sCode}`;
    citiesCache[key] ||= api.get('/public/geo/cities', { params: { country: cCode, state: sCode } }).then((r) => r.data).catch(() => []);
    citiesCache[key].then((list) => { setCities(list); setOtherCity(!!v.city && list.length > 0 && !list.includes(v.city)); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cCode, sCode]);

  const set = (patch) => onChange({ ...v, ...patch });
  const countryOpts = countries.length ? countries.map((c) => ({ value: c.name, label: `${c.flag || ''} ${c.name}`.trim() })) : COUNTRIES;

  return (
    <>
      <Field label={labels.country || 'Country'}>
        <Select required={required} value={v.country} onChange={(e) => set({ country: e.target.value, state: '', city: '' })} options={countryOpts} placeholder="Select country" autoComplete="country-name" />
      </Field>
      <Field label={labels.state || 'State / province'}>
        {states.length ? (
          <Select required={required} value={v.state} onChange={(e) => set({ state: e.target.value, city: '' })} options={states.map((s) => s.name)} placeholder={v.country ? 'Select state' : 'Choose a country first'} disabled={!v.country} />
        ) : <Input required={required} value={v.state} onChange={(e) => set({ state: e.target.value })} placeholder={v.country ? 'State / province' : 'Choose a country first'} disabled={!v.country} autoComplete="address-level1" />}
      </Field>
      <Field label={labels.city || 'City'}>
        {cities.length && !otherCity ? (
          <Select required={required} value={v.city} onChange={(e) => (e.target.value === '__other' ? (setOtherCity(true), set({ city: '' })) : set({ city: e.target.value }))}
            options={[...cities, { value: '__other', label: 'Other (type it)' }]} placeholder="Select city" />
        ) : (
          <div className="flex gap-2">
            <Input required={required} value={v.city} onChange={(e) => set({ city: e.target.value })} placeholder={v.state ? 'City' : 'Choose a state first'} disabled={!v.state && states.length > 0} autoComplete="address-level2" />
            {otherCity && <button type="button" onClick={() => { setOtherCity(false); set({ city: '' }); }} className="shrink-0 text-xs text-muted underline">List</button>}
          </div>
        )}
      </Field>
    </>
  );
}
