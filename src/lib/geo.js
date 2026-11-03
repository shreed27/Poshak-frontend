// Geo helpers: distance maths, reverse/forward geocoding (OpenStreetMap Nominatim),
// and routing (OSRM public demo server).
// All endpoints are keyless. For production, swap them for a paid provider
// (Google Maps / Mapbox / Ola Maps) — public servers are rate limited.

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OSRM = 'https://router.project-osrm.org';

const toRad = (d) => (d * Math.PI) / 180;

export const haversineKm = (a, b) => {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

export const formatDistance = (km) =>
  km < 1 ? `${Math.max(50, Math.round((km * 1000) / 10) * 10)} m` : `${km.toFixed(1)} km`;

// Rough city riding speed used when a routed ETA is not available.
export const estimateMinutes = (km, kmh = 22) => Math.max(3, Math.round((km / kmh) * 60));

const fetchJson = async (url, { timeout = 9000, signal } = {}) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  if (signal) signal.addEventListener('abort', () => ctrl.abort());
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

// Turn a Nominatim result into the address shape used across the app.
const parseNominatim = (r) => {
  const a = r.address || {};
  const area =
    a.neighbourhood || a.suburb || a.city_district || a.quarter || a.village || a.hamlet || '';
  const road = a.road || a.pedestrian || a.residential || '';
  const city = a.city || a.town || a.municipality || a.county || a.state_district || a.state || '';
  const streetArea = [road, area].filter(Boolean).join(', ') || (r.display_name || '').split(',').slice(0, 2).join(',').trim();
  return {
    lat: Number(r.lat),
    lng: Number(r.lon),
    streetArea,
    shortName: area || road || city || 'Selected location',
    city,
    pincode: a.postcode || '',
    state: a.state || '',
    displayName: r.display_name || streetArea
  };
};

export const reverseGeocode = async (lat, lng, signal) => {
  const data = await fetchJson(
    `${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`,
    { signal }
  );
  if (!data || data.error) throw new Error('No address found');
  return { ...parseNominatim(data), lat, lng };
};

export const searchPlaces = async (query, near, signal) => {
  const q = encodeURIComponent(query);
  // Restrict results to a box (~±5 km) around `near`, so only nearby places come back.
  const view = near
    ? `&bounded=1&viewbox=${near.lng - 0.05},${near.lat + 0.05},${near.lng + 0.05},${near.lat - 0.05}`
    : '';
  const data = await fetchJson(
    `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=in${view}&q=${q}`,
    { signal }
  );
  return (data || []).map(parseNominatim);
};

// Road route between two points. Returns { points: [[lat,lng]...], km, minutes, routed }.
// Falls back to a straight line when OSRM is unreachable so tracking still works offline.
export const getRoute = async (from, to) => {
  try {
    const data = await fetchJson(
      `${OSRM}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`,
      { timeout: 8000 }
    );
    const route = data?.routes?.[0];
    if (!route) throw new Error('no route');
    const raw = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    return {
      points: simplify(raw, 160),
      km: route.distance / 1000,
      minutes: Math.max(2, Math.round(route.duration / 60)),
      routed: true
    };
  } catch {
    const km = haversineKm(from, to);
    return {
      points: [[from.lat, from.lng], [to.lat, to.lng]],
      km,
      minutes: estimateMinutes(km),
      routed: false
    };
  }
};

// Keep at most `max` evenly spaced points so persisted orders stay small.
const simplify = (pts, max) => {
  if (pts.length <= max) return pts;
  const step = (pts.length - 1) / (max - 1);
  const out = [];
  for (let i = 0; i < max; i++) out.push(pts[Math.round(i * step)]);
  return out;
};

// Position at fraction t (0..1) along a polyline, plus heading in degrees.
export const pointAlong = (points, t) => {
  if (!points || points.length === 0) return null;
  if (points.length === 1 || t <= 0) return { lat: points[0][0], lng: points[0][1], bearing: 0 };
  const segs = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = haversineKm(
      { lat: points[i - 1][0], lng: points[i - 1][1] },
      { lat: points[i][0], lng: points[i][1] }
    );
    segs.push(d);
    total += d;
  }
  const last = points[points.length - 1];
  if (t >= 1 || total === 0) return { lat: last[0], lng: last[1], bearing: 0 };
  let target = t * total;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i]) {
      const f = segs[i] === 0 ? 0 : target / segs[i];
      const [aLat, aLng] = points[i];
      const [bLat, bLng] = points[i + 1];
      const y = Math.sin(toRad(bLng - aLng)) * Math.cos(toRad(bLat));
      const x =
        Math.cos(toRad(aLat)) * Math.sin(toRad(bLat)) -
        Math.sin(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.cos(toRad(bLng - aLng));
      return {
        lat: aLat + (bLat - aLat) * f,
        lng: aLng + (bLng - aLng) * f,
        bearing: ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
      };
    }
    target -= segs[i];
  }
  return { lat: last[0], lng: last[1], bearing: 0 };
};
