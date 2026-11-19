import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { applyServiceArea } from '../lib/serviceArea';
import { QUICK_SERVICES } from '../components/main-app/MainAppData';

const DEFAULT_WINDOWS = [[7, 9], [9, 11], [11, 13], [13, 15], [15, 17], [17, 19], [19, 21]];
const GENERIC = {
  category: 'Service', turnaround: '48 Hours', rating: '',
  image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=400&q=80',
  desc: 'Doorstep pickup and delivery.'
};

const CatalogContext = createContext(null);

// Prices, discount, slots and service area come from the database (admin-editable); the bundled
// QUICK_SERVICES supply images/descriptions and act as the offline/demo catalogue.
export const CatalogProvider = ({ children }) => {
  const [rates, setRates] = useState(null);
  const [settings, setSettings] = useState({});
  const [version, setVersion] = useState(0);

  const reload = useCallback(async () => {
    if (!supabase) return;
    const [r, s] = await Promise.all([
      supabase.from('service_rates').select('*').order('sort').order('id'),
      supabase.from('app_settings').select('*')
    ]);
    if (!r.error && r.data?.length) setRates(r.data);
    if (!s.error && s.data) {
      const map = Object.fromEntries(s.data.map((x) => [x.key, x.value]));
      setSettings(map);
      applyServiceArea(map.service_area);
    }
    setVersion((v) => v + 1);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const value = useMemo(() => {
    // Priced services are bookable like normal. "Price on request" services (alterations, dry cleaning) are listed separately:
    // they go through the quote flow instead of the cart. Per-quote hidden rows (kind = 'quote') never appear in the catalogue.
    const toService = (x) => {
      const base = QUICK_SERVICES.find((q) => q.id === x.id) || GENERIC;
      if (x.price_on_request) return { ...base, id: x.id, name: x.name, unit: x.unit, unitPrice: 0, price: 'Price on request', onRequest: true };
      const rate = Number(x.rate);
      return { ...base, id: x.id, name: x.name, unit: x.unit, unitPrice: rate, price: `₹${rate}/${x.unit}`, onRequest: false };
    };
    const catalogue = rates
      ? rates.filter((x) => (x.kind ?? 'standard') === 'standard' && (x.active || x.price_on_request)).map(toService)
      : QUICK_SERVICES;
    const services = catalogue.filter((s) => !s.onRequest);
    const quoteServices = catalogue.filter((s) => s.onRequest);
    return {
      services,
      quoteServices,
      minCharge: Number(settings.min_charge ?? 99),
      memberPct: Number(settings.member_discount_pct ?? 0),
      slotWindows: settings.slot_windows || DEFAULT_WINDOWS,
      support: settings.support || {},
      settings,
      version,
      reload
    };
  }, [rates, settings, version, reload]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};

export const useCatalog = () => {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider');
  return ctx;
};
