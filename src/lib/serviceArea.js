import { haversineKm } from './geo';

// The only area Poshak serves right now. Widen radiusKm or add areas here as you expand.
export const SERVICE_AREA = {
  name: 'SG Palya & Christ University',
  short: 'SG Palya / Christ Univ.',
  center: { lat: 12.9346, lng: 77.6060 },   // Christ University, Hosur Road
  radiusKm: 3
};

export const distanceFromAreaKm = (pt) => haversineKm(SERVICE_AREA.center, pt);

export const isServiceable = (pt) => Boolean(pt) && distanceFromAreaKm(pt) <= SERVICE_AREA.radiusKm;

// Called when settings load from the database (admin can change the area from the dashboard).
export const applyServiceArea = (a) => {
  if (!a) return;
  SERVICE_AREA.name = a.name || SERVICE_AREA.name;
  SERVICE_AREA.short = a.short || a.name || SERVICE_AREA.short;
  SERVICE_AREA.center = { lat: Number(a.lat), lng: Number(a.lng) };
  SERVICE_AREA.radiusKm = Number(a.radius_km);
};
