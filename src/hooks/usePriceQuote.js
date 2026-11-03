import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCatalog } from '../context/CatalogContext';

// The server is the source of truth for price (prices, member discount, coupons, minimum charge).
// Signed-in users get its quote live; demo mode falls back to the same formula locally (no coupons).
export const usePriceQuote = (items, coupon) => {
  const { services, memberPct, minCharge } = useCatalog();
  const key = JSON.stringify(items);
  const local = useMemo(() => {
    const sub = items.reduce((a, it) => a + (services.find((s) => s.id === it.service_id)?.unitPrice || 0) * it.qty, 0);
    const member = Math.round((sub * memberPct) / 100);
    return { subtotal: sub, member_discount: member, coupon_discount: 0, total: sub > 0 ? Math.max(minCharge, sub - member) : 0, coupon_error: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, services, memberPct, minCharge]);

  const [remote, setRemote] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!supabase || !items.length) { setRemote(null); return undefined; }
    let alive = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc('preview_price', { p_items: items, p_coupon: coupon || null });
      if (!alive) return;
      setRemote(error ? null : data);
      setLoading(false);
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, coupon]);

  const q = remote || local;
  return {
    subtotal: Number(q.subtotal),
    discount: Number(q.member_discount) + Number(q.coupon_discount),
    couponDiscount: Number(q.coupon_discount),
    total: Number(q.total),
    couponError: q.coupon_error,
    couponApplied: Boolean(coupon) && !q.coupon_error && Number(q.coupon_discount) > 0,
    loading,
    fromServer: Boolean(remote)
  };
};
