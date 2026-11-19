// Business identity. Admin → Prices & settings → Support overrides the phone if one is saved there.
export const BRAND = {
  name: 'Poshak',
  phone: '+91 91610 91144',
};
export const telHref = (p) => `tel:${String(p).replace(/[^+\d]/g, '')}`;
export const supportPhone = (support) => (support?.phone || '').trim() || BRAND.phone;
