import { supabase } from './supabase';
import { STATUS_STEP, STATUS_LABEL } from './orderStatus';
import { STEP_LABELS, STEP_DESCS } from './orderEngine';

const SELECT = '*, order_events(status, created_at)';

const clock = (iso) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const dateTime = (iso) =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// DB row → the order shape every customer-facing component already uses.
export const fromRow = (r, secret, checks = {}) => {
  const step = STATUS_STEP[r.status] ?? 0;
  const events = [...(r.order_events || [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const when = (status) => events.find((e) => e.status === status)?.created_at;
  const stepStatuses = [['placed'], ['picked_up'], ['out_for_delivery'], ['delivered']];
  const steps = STEP_LABELS.map((label, i) => {
    const at = when(stepStatuses[i][0]);
    return {
      step: i,
      label,
      desc: STEP_DESCS[i],
      done: r.status !== 'cancelled' && i <= step,
      active: r.status !== 'cancelled' && i === step && step < 3,
      time: at ? clock(at) : 'Pending'
    };
  });
  const estimated = Number(r.estimated_amount);
  const final = r.final_amount != null ? Number(r.final_amount) : null;
  const billable = final ?? estimated;
  const paid = Number(r.paid_amount);
  const refunded = Number(r.refunded_amount);
  const overpaid = r.status === 'cancelled' ? paid : Math.max(0, paid - billable);
  return {
    remote: true,
    dbId: r.id,
    orderId: r.order_code,
    dbStatus: r.status,
    status: r.status === 'delivered' ? 'completed' : r.status === 'cancelled' ? 'cancelled' : 'active',
    currentStep: step,
    steps,
    serviceName: r.service_name,
    bookedItems: r.items || [],
    actualItems: r.actual_items || null,
    captainRating: r.captain_rating,
    piecesPickedUp: r.pieces_picked_up,
    assignment: r.assignment,
    offeredAt: r.offered_at,
    failedAttempts: r.failed_attempts || 0,
    rescheduleCount: r.reschedule_count || 0,
    deliverySlot: r.delivery_slot,
    pickupDate: r.pickup_date,
    checks,                                   // { pickup, delivery, cleaner_in, cleaner_out } — customers see pickup & delivery
    couponCode: r.coupon_code,
    discountAmount: Number(r.discount_amount || 0),
    subtotalAmount: r.subtotal_amount != null ? Number(r.subtotal_amount) : null,
    estimatedAmount: estimated,
    finalAmount: final,
    totalAmount: billable,
    paidAmount: paid,
    dueAmount: Math.max(0, billable - paid),
    refundDue: Math.max(0, overpaid - refunded),
    refundedAmount: refunded,
    paidOnline: !!r.razorpay_order_id || r.payment_mode === 'online',
    paymentMode: r.payment_mode,
    paymentStatus: r.payment_status,
    pickupSlot: r.pickup_slot,
    pickupAddress: r.pickup_address,
    landmark: r.landmark,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    customerPhone: r.customer_phone,
    specialInstructions: r.special_instructions,
    attachedPhotos: r.photo_urls || [],
    customerLocation: { lat: r.pickup_lat, lng: r.pickup_lng },
    captainLocation: r.captain_lat != null ? { lat: r.captain_lat, lng: r.captain_lng } : null,
    captainId: r.captain_id,
    rider: r.captain_name
      ? {
          name: r.captain_name,
          phone: /^\d{10}$/.test(r.captain_phone || '') ? `+91${r.captain_phone}` : (r.captain_phone || ''),
          vehicle: r.captain_vehicle || 'Poshak delivery partner',
          rating: '★',
          avatar: `https://ui-avatars.com/api/?background=fa5929&color=fff&name=${encodeURIComponent(r.captain_name)}`
        }
      : null,
    // Only the customer (and admin) can read these; captains get undefined.
    pickupOtp: secret?.pickup_otp,
    deliveryOtp: secret?.delivery_otp,
    rating: r.rating,
    placedAt: dateTime(r.created_at),
    deliveredAt: r.status === 'delivered' ? dateTime(r.delivered_at || when('delivered') || r.updated_at) : undefined,
    createdAtIso: r.created_at,
    updatedAtIso: r.updated_at,
    statusLabel: STATUS_LABEL[r.status]
  };
};

// UI order (from the booking flows) → DB row. Prices are NOT sent: the server prices the items itself.
export const toRow = (order, user) => ({
  order_code: order.orderId,
  customer_id: user.id,
  customer_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
  customer_email: user.email,
  customer_phone: order.customerPhone || null,
  service_name: order.serviceName,
  items: order.serviceItems,
  payment_mode: order.paymentMode || 'cod',
  special_instructions: order.specialInstructions,
  // data: URLs are far too large for a row; only keep hosted images.
  photo_urls: (order.attachedPhotos || []).map((p) => p.url || p).filter((u) => /^https?:/.test(u)),
  pickup_slot: order.pickupSlot,
  pickup_date: order.pickupDate || null,
  pickup_window: order.pickupWindow || null,
  coupon_code: order.couponCode || null,
  pickup_address: order.pickupAddress,
  landmark: order.landmark || null,
  pickup_lat: order.customerLocation.lat,
  pickup_lng: order.customerLocation.lng,
  status: 'placed'
});

export const withSecrets = async (rows) => {
  const [{ data: secrets }, { data: checks }] = await Promise.all([
    supabase.from('order_secrets').select('*'),
    supabase.from('order_checks').select('*')
  ]);
  const byOrder = new Map((secrets || []).map((s) => [s.order_id, s]));
  const checksBy = {};
  (checks || []).forEach((c) => { (checksBy[c.order_id] ||= {})[c.stage] = c; });
  return rows.map((r) => fromRow(r, byOrder.get(r.id), checksBy[r.id] || {}));
};

export const placeOrder = async (order, user) => {
  const { data, error } = await supabase.from('orders').insert(toRow(order, user)).select(SELECT).single();
  if (error) throw error;
  return (await withSecrets([data]))[0];
};

export const fetchMyOrders = async () => {
  const { data, error } = await supabase.from('orders').select(SELECT).order('created_at', { ascending: false });
  if (error) throw error;
  return withSecrets(data);
};

export const cancelMyOrder = async (dbId) => {
  const { error } = await supabase.rpc('cancel_my_order', { p_id: dbId });
  if (error) throw error;
};

export const rateMyOrder = async (dbId, rating) => {
  const { error } = await supabase.rpc('rate_my_order', { p_id: dbId, p_rating: rating });
  if (error) throw error;
};

// Calls onChange whenever any visible order row changes (RLS scopes what arrives).
export const subscribeOrders = (key, onChange) => {
  const ch = supabase
    .channel(`orders-${key}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
    .subscribe();
  return () => supabase.removeChannel(ch);
};
