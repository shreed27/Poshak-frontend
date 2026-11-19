import { useEffect, useRef, useState } from 'react';
import { getRoute, haversineKm } from './geo';

// ---- ETA maths -------------------------------------------------------------------------------------------------
// Routing servers return free-flow driving time; real city riding is slower. Admin tunes this in Prices & settings.
export const tuneMinutes = (rawMinutes, { factor = 1.3, buffer = 2 } = {}) => Math.max(1, Math.ceil(rawMinutes * Math.max(1, factor) + Math.max(0, buffer)));
export const trackingSettings = (settings = {}) => ({ factor: Number(settings.eta_traffic_factor ?? 1.3), buffer: Number(settings.eta_buffer_min ?? 2) });

export const fmtMin = (m) => (m == null ? '—' : m <= 1 ? '1 min' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim());
export const arrivalClock = (minutes) => new Date(Date.now() + minutes * 60000).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
export const kmText = (km) => (km == null ? '' : km < 1 ? `${Math.max(50, Math.round((km * 1000) / 10) * 10)} m` : `${km.toFixed(1)} km`);

// How fresh is the rider's last GPS ping?  live < 40 s · delayed < 3 min · stale after that.
export const freshness = (iso, now = Date.now()) => {
  if (!iso) return { state: 'none', secs: null };
  const secs = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  return { state: secs < 40 ? 'live' : secs < 180 ? 'delayed' : 'stale', secs };
};
export const agoText = (secs) => (secs == null ? '' : secs < 60 ? `${secs}s ago` : secs < 3600 ? `${Math.round(secs / 60)} min ago` : `${Math.round(secs / 3600)} h ago`);

// Part of the route still ahead of the rider (from the vertex nearest to them).
export const remainingRoute = (points, pos) => {
  if (!points?.length || !pos) return points || [];
  let best = 0, bd = Infinity;
  points.forEach((p, i) => { const d = haversineKm(pos, { lat: p[0], lng: p[1] }); if (d < bd) { bd = d; best = i; } });
  return [[pos.lat, pos.lng], ...points.slice(Math.min(best + 1, points.length - 1))];
};

// ---- route hook (shared cache so several viewers/cards don't hammer the routing server) ---------------------------
const cache = new Map();            // "lat,lng>lat,lng" → { at, route }
const key = (a, b) => `${a.lat.toFixed(4)},${a.lng.toFixed(4)}>${b.lat.toFixed(4)},${b.lng.toFixed(4)}`;
const inflight = new Map();         // identical requests share one network call
export const cachedRoute = (from, to) => {
  const k = key(from, to);
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < 40000) return Promise.resolve(hit.route);
  if (inflight.has(k)) return inflight.get(k);
  const p = getRoute(from, to)
    .then((route) => { cache.set(k, { at: Date.now(), route }); if (cache.size > 60) cache.delete(cache.keys().next().value); return route; })
    .finally(() => inflight.delete(k));
  inflight.set(k, p);
  return p;
};

// Road route from `from` → `to`, refreshed when the origin moves > 150 m or every 45 s. Falls back to a straight line.
export const useLiveRoute = (from, to, { enabled = true } = {}) => {
  const [route, setRoute] = useState(null);
  const last = useRef({ from: null, at: 0, to: null });
  const token = useRef(0);
  const fLat = from?.lat, fLng = from?.lng, tLat = to?.lat, tLng = to?.lng;

  useEffect(() => {
    if (!enabled || fLat == null || tLat == null) { setRoute(null); return; }
    const dest = `${tLat},${tLng}`;
    const moved = last.current.from ? haversineKm(last.current.from, { lat: fLat, lng: fLng }) : Infinity;
    const stale = Date.now() - last.current.at > 45000 || last.current.to !== dest;
    if (moved < 0.15 && !stale) return;
    const mine = ++token.current;                      // only the newest request may update the state
    cachedRoute({ lat: fLat, lng: fLng }, { lat: tLat, lng: tLng }).then((r) => {
      if (mine !== token.current) return;
      last.current = { from: { lat: fLat, lng: fLng }, at: Date.now(), to: dest };
      setRoute(r);
    });
  }, [enabled, fLat, fLng, tLat, tLng]);
  return route;
};
