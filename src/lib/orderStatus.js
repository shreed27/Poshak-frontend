// DB status → customer-facing step (4 steps: confirmed, picked up & cleaned, out for delivery, delivered).
export const STATUS_STEP = {
  placed: 0,
  captain_assigned: 0,
  picked_up: 1,
  cleaning: 1,
  ready: 1,
  out_for_delivery: 2,
  delivered: 3,
  cancelled: 0
};

export const STATUS_LABEL = {
  placed: 'New order',
  captain_assigned: 'Captain on the way',
  picked_up: 'Picked up',
  cleaning: 'Being cleaned',
  ready: 'Ready for delivery',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

export const FLOW = ['placed', 'captain_assigned', 'picked_up', 'cleaning', 'ready', 'out_for_delivery', 'delivered'];

export const nextStatus = (s) => {
  const i = FLOW.indexOf(s);
  return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null;
};

export const ACTIVE_STATUSES = FLOW.slice(0, -1);

// Can the captain start the delivery run? Strict mode waits for the laundry to mark "ready".
export const canStartDelivery = (status, strict) => status === 'ready' || (!strict && (status === 'picked_up' || status === 'cleaning'));
