import { haversineKm } from './geo';
import { tr } from '../i18n';

// Time-driven order lifecycle for DEMO MODE (no backend). Progress is derived from
// `order.startedAt` so it survives reloads. Real orders (Supabase) follow the DB status instead.
// Stages are compressed to seconds so the live map can be watched end to end.

export const STAGES = [
  { step: 0, seconds: 70, leg: 'pickup' },    // captain rides to the customer
  { step: 1, seconds: 60, leg: null },        // clothes picked up, being cleaned
  { step: 2, seconds: 70, leg: 'delivery' }   // captain rides back with the clothes
];
export const TOTAL_SECONDS = STAGES.reduce((a, s) => a + s.seconds, 0);
export const FINAL_STEP = 3;

export const STEP_LABELS = ['Order Confirmed', 'Picked Up & Being Cleaned', 'Out for Delivery', 'Delivered'];
export const STEP_DESCS = [
  'Captain is on the way to your doorstep',
  'Clothes collected and being cleaned',
  'Captain is bringing your clothes back',
  'Fresh clothes delivered'
];

const remoteProgress = (order) => {
  const step = order.currentStep ?? 0;
  const leg = step === 0 ? 'pickup' : step === 2 ? 'delivery' : null;
  let secondsLeft = 0;
  if (order.eta?.minutes != null && leg) {
    secondsLeft = order.eta.minutes * 60;                       // road-routed ETA from the rider's phone (or the server estimate)
  } else if (order.captainLocation && order.customerLocation && leg) {
    secondsLeft = Math.round((haversineKm(order.captainLocation, order.customerLocation) / 22) * 3600);
  }
  return { remote: true, step, leg, legProgress: 0, secondsLeft, totalLeft: 0, done: order.status === 'completed' };
};

export const getProgress = (order, now = Date.now()) => {
  if (order.remote || order.pendingSave) return remoteProgress(order);
  if (!order.startedAt) {
    return { step: order.currentStep ?? 0, legProgress: 0, leg: null, secondsLeft: 0, totalLeft: 0, done: order.status === 'completed' };
  }
  const elapsed = Math.max(0, (now - order.startedAt) / 1000);
  let acc = 0;
  for (const st of STAGES) {
    if (elapsed < acc + st.seconds) {
      const into = elapsed - acc;
      return {
        step: st.step, leg: st.leg, legProgress: into / st.seconds,
        secondsLeft: Math.ceil(st.seconds - into), totalLeft: Math.ceil(TOTAL_SECONDS - elapsed), done: false
      };
    }
    acc += st.seconds;
  }
  return { step: FINAL_STEP, leg: null, legProgress: 1, secondsLeft: 0, totalLeft: 0, done: true };
};

const clock = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export const applyStep = (order, step, now = Date.now()) => {
  const stageStart = (s) => order.startedAt + STAGES.slice(0, s).reduce((a, x) => a + x.seconds, 0) * 1000;
  const steps = STEP_LABELS.map((label, i) => ({
    step: i, label, desc: STEP_DESCS[i],
    done: i <= step, active: i === step && step < FINAL_STEP,
    time: i <= step ? clock(i === FINAL_STEP ? now : stageStart(i)) : 'Pending'
  }));
  const completed = step >= FINAL_STEP;
  return {
    ...order,
    currentStep: step,
    steps,
    status: completed ? 'completed' : order.status === 'cancelled' ? 'cancelled' : 'active',
    ...(completed ? {
      deliveredAt: new Date(now).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      paymentStatus: 'Paid'
    } : {})
  };
};

export const formatCountdown = (sec) => {
  if (sec <= 0) return 'any moment';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
};

export const statusCopy = (order, p) => {
  const name = order.rider?.name?.split(' ')[0] || tr('captain');
  if (p.remote || order.pendingSave) {
    const eta = '';   // no live ETA shown: the rider calls the customer to coordinate
    switch (order.dbStatus) {
      case 'placed': return { title: tr('status.placed.title'), sub: tr('status.placed.sub') };
      case 'captain_assigned': return { title: tr('status.assigned.title', { name }), sub: eta || tr('status.assigned.sub') };
      case 'picked_up': return { title: tr('status.pickedup.title'), sub: tr('status.pickedup.sub') };
      case 'cleaning': return { title: tr('status.cleaning.title'), sub: tr('status.cleaning.sub') };
      case 'ready': return { title: tr('status.ready.title'), sub: tr('status.ready.sub') };
      case 'out_for_delivery': return { title: tr('status.out.title', { name }), sub: eta || tr('status.out.sub') };
      case 'delivered': return { title: tr('status.delivered.title'), sub: tr('status.delivered.sub') };
      default: return { title: tr('status.cancelled.title'), sub: '' };
    }
  }
  switch (p.step) {
    case 0: return { title: tr('status.assigned.title', { name }), sub: `Arriving in ${formatCountdown(p.secondsLeft)}` };
    case 1: return { title: tr('status.pickedup.title'), sub: `Ready for delivery in ${formatCountdown(p.secondsLeft)}` };
    case 2: return { title: tr('status.out.title', { name }), sub: `Arriving in ${formatCountdown(p.secondsLeft)}` };
    default: return { title: tr('status.delivered.title'), sub: tr('status.delivered.sub') };
  }
};

// ---- Pickup slots that respect the current time ------------------------------
const WINDOWS = [[7, 9], [9, 11], [11, 13], [13, 15], [15, 17], [17, 19], [19, 21]];
const h12 = (h) => `${((h + 11) % 12) + 1}:00 ${h >= 12 ? 'PM' : 'AM'}`;

export const getPickupSlots = (now = new Date()) => {
  const slots = [];
  const nowH = now.getHours() + now.getMinutes() / 60;
  WINDOWS.forEach(([s, e]) => { if (e - 1 > nowH) slots.push(`Today, ${h12(s)} - ${h12(e)}`); });
  [[8, 10], [13, 15], [17, 19]].forEach(([s, e]) => slots.push(`Tomorrow, ${h12(s)} - ${h12(e)}`));
  return slots;
};

// ---- Demo-mode captains and order enrichment ------------------------------
export const RIDERS = [
  { name: 'Vikram Singh', phone: '+91 98765 43210', vehicle: 'Poshak EV-12', rating: '4.9 ★', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80' },
  { name: 'Imran Khan', phone: '+91 98450 11223', vehicle: 'Poshak EV-07', rating: '4.8 ★', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' },
  { name: 'Suresh Kumar', phone: '+91 99001 55667', vehicle: 'Poshak EV-21', rating: '4.9 ★', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80' }
];

// Where the simulated captain starts from: ~1 km from the customer.
export const demoCaptainStart = (a) => ({ lat: a.lat + 0.007, lng: a.lng + 0.006 });

export const enrichOrder = (order, { address, route }) => {
  const now = Date.now();
  const rider = RIDERS[Math.floor(Math.random() * RIDERS.length)];
  return applyStep({
    ...order,
    startedAt: now,
    createdAt: now,
    rider: { ...rider, vehicle: `${rider.vehicle} (${order.orderId.slice(-4)})` },
    placedAt: new Date(now).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    customerLocation: address?.lat != null ? { lat: address.lat, lng: address.lng } : null,
    route: route?.points || null
  }, 0, now);
};
