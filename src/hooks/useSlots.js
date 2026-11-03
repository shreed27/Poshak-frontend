import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCatalog } from '../context/CatalogContext';

const h12 = (h) => `${((h + 11) % 12) + 1}:00 ${h >= 12 ? 'PM' : 'AM'}`;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayLabel = (d, i) => (i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }));

export const DAYS_AHEAD = 3;

// Next few days of pickup windows, with live "full" flags from the server.
export const useSlots = () => {
  const { slotWindows, version } = useCatalog();
  const [avail, setAvail] = useState({});      // { 'YYYY-MM-DD': { '17-19': { booked, capacity } } }

  const dates = useMemo(() => Array.from({ length: DAYS_AHEAD }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; }), []);

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    Promise.all(dates.map((d) => supabase.rpc('slot_availability', { p_date: iso(d) }))).then((res) => {
      if (!alive) return;
      const next = {};
      res.forEach((r, i) => {
        if (r.error || !Array.isArray(r.data)) return;
        next[iso(dates[i])] = Object.fromEntries(r.data.map((x) => [x.win, x]));
      });
      setAvail(next);
    });
    return () => { alive = false; };
  }, [dates, version]);

  return useMemo(() => {
    const now = new Date();
    const nowH = now.getHours() + now.getMinutes() / 60;
    return dates.map((d, i) => {
      const date = iso(d);
      const slots = slotWindows
        .filter(([, e]) => i > 0 || e - 1 > nowH)            // a window stays bookable while ≥1 h of it is ahead
        .map(([s, e]) => {
          const win = `${s}-${e}`;
          const a = avail[date]?.[win];
          const left = a ? Math.max(0, a.capacity - a.booked) : null;
          return { date, win, label: `${h12(s)} - ${h12(e)}`, day: dayLabel(d, i), full: left === 0, left };
        });
      return { date, label: dayLabel(d, i), slots };
    });
  }, [dates, slotWindows, avail]);
};

export const slotText = (slot) => (slot ? `${slot.day}, ${slot.label}` : '');
