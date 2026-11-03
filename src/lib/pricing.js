import { QUICK_SERVICES } from '../components/main-app/MainAppData';

// Preview only — the server's price_order() decides the real bill. `services` comes from useCatalog().
export const priceItems = (items, services = QUICK_SERVICES, { memberPct = 0, minCharge = 99 } = {}) => {
  const subtotal = (items || []).reduce((sum, it) => {
    const svc = services.find((s) => s.id === it.service_id);
    return sum + (svc ? svc.unitPrice * Number(it.qty || 0) : 0);
  }, 0);
  return Math.max(minCharge, Math.round(subtotal - (subtotal * memberPct) / 100));
};

export const serviceInfo = (id, services = QUICK_SERVICES) => services.find((s) => s.id === id);
