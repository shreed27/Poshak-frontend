// Shared constants + helpers for rider / laundromat management and their own dashboards.
export const STATUSES = [
  ['active', 'Active', 'good'], ['onboarding', 'Onboarding', 'info'], ['paused', 'Paused', 'warn'], ['suspended', 'Suspended', 'bad'], ['offboarded', 'Offboarded', '']
];
export const statusMeta = (s) => STATUSES.find((x) => x[0] === (s || 'active')) || STATUSES[0];
export const KYC = [['pending', 'KYC pending', 'warn'], ['verified', 'KYC verified', 'good'], ['rejected', 'KYC rejected', 'bad']];
export const kycMeta = (s) => KYC.find((x) => x[0] === (s || 'pending')) || KYC[0];
export const ID_TYPES = [['aadhaar', 'Aadhaar (last 4 digits only)'], ['pan', 'PAN'], ['driving_licence', 'Driving licence'], ['voter_id', 'Voter ID'], ['passport', 'Passport']];
export const VEHICLES = [['bicycle', 'Bicycle'], ['scooter', 'Scooter'], ['motorcycle', 'Motorcycle'], ['ev_scooter', 'Electric scooter'], ['car', 'Car']];
export const PAYOUT_CYCLES = [['daily', 'Daily'], ['weekly', 'Weekly'], ['fortnightly', 'Every 2 weeks'], ['monthly', 'Monthly']];
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const initials = (n) => (n || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
export const dayStr = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const hhmm = (t) => {
  if (!t) return '—';
  const [h, m] = String(t).split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

// Document expiry → badge info.
export const expiry = (d) => {
  if (!d) return null;
  const days = Math.ceil((new Date(d + 'T23:59:59') - Date.now()) / 86400000);
  if (days < 0) return { days, cls: 'bad', label: `Expired ${-days} d ago` };
  if (days <= 30) return { days, cls: 'warn', label: `Expires in ${days} d` };
  return { days, cls: 'good', label: `Valid till ${dayStr(d)}` };
};

export const emptyPartner = (role) => ({
  email: '', name: '', phone: '', status: role === 'admin' ? 'active' : 'onboarding', alt_phone: '', address: '', city: '', pincode: '', zone: '', dob: '',
  emergency_name: '', emergency_phone: '', blood_group: '', id_type: '', id_number: '', kyc_status: 'pending', kyc_notes: '',
  bank_holder: '', bank_account: '', bank_ifsc: '', upi_id: '', payout_cycle: 'weekly', joined_on: new Date().toISOString().slice(0, 10), contract_end: '',
  shift_start: '', shift_end: '', work_days: [0, 1, 2, 3, 4, 5, 6], max_active_jobs: '', notes: '', tags: '',
  vehicle_type: '', vehicle_model: '', vehicle_number: '', license_number: '', license_expiry: '', insurance_expiry: '',
  uniform_issued: false, bag_issued: false, helmet_issued: false, fee_override: '',
  business_name: '', owner_name: '', gstin: '', pan: '', trade_license: '', lat: '', lng: '', capacity_kg_per_day: '', machines: '', services: [],
  turnaround_hours: '', open_time: '', close_time: '', payout_per_kg: '', payout_per_order: '', payout_per_piece: ''
});

// DB row(s) → form state.
export const toForm = (staff, prof) => {
  const base = emptyPartner(staff.role);
  const f = { ...base, email: staff.email, name: staff.name || '', phone: staff.phone || '' };
  Object.keys(base).forEach((k) => {
    if (['email', 'name', 'phone'].includes(k) || !prof || prof[k] == null) return;
    f[k] = Array.isArray(prof[k]) ? (k === 'tags' ? prof[k].join(', ') : prof[k]) : typeof prof[k] === 'string' && /^\d\d:\d\d:\d\d$/.test(prof[k]) ? prof[k].slice(0, 5) : prof[k];
  });
  return f;
};

const NUM = ['capacity_kg_per_day', 'machines', 'turnaround_hours', 'payout_per_kg', 'payout_per_order', 'payout_per_piece', 'fee_override', 'max_active_jobs', 'lat', 'lng'];
const TXT = ['name', 'phone', 'status', 'alt_phone', 'address', 'city', 'pincode', 'zone', 'dob', 'emergency_name', 'emergency_phone', 'blood_group', 'id_type', 'id_number', 'kyc_status', 'kyc_notes',
  'bank_holder', 'bank_account', 'bank_ifsc', 'upi_id', 'payout_cycle', 'joined_on', 'contract_end', 'shift_start', 'shift_end', 'notes', 'vehicle_type', 'vehicle_model', 'vehicle_number',
  'license_number', 'license_expiry', 'insurance_expiry', 'business_name', 'owner_name', 'gstin', 'pan', 'trade_license', 'open_time', 'close_time'];
// form state → what admin_save_partner expects (empty strings become null; numbers become numbers).
export const toPayload = (f) => {
  const o = {};
  TXT.forEach((k) => { const v = typeof f[k] === 'string' ? f[k].trim() : f[k]; o[k] = v === '' || v == null ? null : v; });
  NUM.forEach((k) => { o[k] = f[k] === '' || f[k] == null ? null : Number(f[k]); });
  o.work_days = f.work_days || [];
  o.services = f.services || [];
  o.tags = String(f.tags || '').split(',').map((x) => x.trim()).filter(Boolean);
  ['uniform_issued', 'bag_issued', 'helmet_issued'].forEach((k) => { o[k] = !!f[k]; });
  return o;
};
