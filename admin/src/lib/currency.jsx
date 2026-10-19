import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from './api';
import { setFxRates } from './format';

const Ctx = createContext({ inr: 88, rates: { USD: 1, INR: 88 }, data: null, reload: () => {} });

/** Loads live currency rates once for the whole admin panel (refreshes every 30 min). */
export function CurrencyProvider({ children }) {
  const [data, setData] = useState(null);
  const load = useCallback(async () => {
    try {
      const { data: d } = await api.get('/admin/fx?days=30');
      setFxRates(d.rates);
      setData(d);
    } catch { /* keep fallback */ }
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);
  const value = useMemo(() => ({ inr: data?.rates?.INR || 88, rates: data?.rates || { USD: 1, INR: 88 }, data, reload: load, setData: (d) => { setFxRates(d.rates); setData(d); } }), [data, load]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useFx = () => useContext(Ctx);
