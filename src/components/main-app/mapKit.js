import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export { L };

export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const pin = (html, cls = '') =>
  L.divIcon({ className: `psk-marker ${cls}`, html, iconSize: [40, 40], iconAnchor: [20, 38] });

export const homeIcon = () =>
  pin('<div class="psk-pin psk-pin-home"><span>🏠</span></div>');

export const hubIcon = () =>
  pin('<div class="psk-pin psk-pin-hub"><span>🧺</span></div>');

export const pickerIcon = () =>
  pin('<div class="psk-pin psk-pin-picker"><span></span></div>');

export const riderIcon = () =>
  L.divIcon({
    className: 'psk-marker',
    html: '<div class="psk-rider"><span>🛵</span></div>',
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  });

export const createMap = (el, center, zoom = 15, opts = {}) => {
  const map = L.map(el, { zoomControl: false, attributionControl: true, ...opts }).setView(
    [center.lat, center.lng],
    zoom
  );
  L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  // Modals mount before layout settles; without this tiles render grey.
  setTimeout(() => map.invalidateSize(), 120);
  return map;
};
