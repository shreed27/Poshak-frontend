import { supabase } from './supabase';

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

const loadCheckout = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = CHECKOUT_SRC;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load Razorpay. Check your connection.'));
    document.body.appendChild(s);
  });

// supabase.functions.invoke hides the server's message inside the error context.
const call = async (name, body) => {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let msg = error.message;
    try { msg = (await error.context.json()).error || msg; } catch { /* keep generic message */ }
    throw new Error(msg);
  }
  return data;
};

// Opens Razorpay Checkout for a session from one of the create-* functions.
// Resolves once the server has confirmed the payment; rejects if the customer closes the window.
const checkout = async (session) => {
  await loadCheckout();
  return new Promise((resolve, reject) => {
    const rz = new window.Razorpay({
      key: session.key_id,
      order_id: session.razorpay_order_id,
      amount: session.amount,
      currency: 'INR',
      name: 'Poshak',
      description: session.order_code,
      prefill: { name: session.name, email: session.email },
      theme: { color: '#fa5929' },
      handler: async (res) => {
        try { resolve(await call('verify-payment', res)); } catch (e) { reject(e); }   // webhook also confirms; this makes the UI instant
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) }
    });
    rz.on('payment.failed', (r) => reject(new Error(r.error?.description || 'Payment failed')));
    rz.open();
  });
};

// Pay what is still due on an order.
export const payOnline = async (dbOrderId) => checkout(await call('create-payment', { order_id: dbOrderId }));

// Buy a prepaid wallet pack.
export const buyPlan = async (planId) => checkout(await call('create-intent-payment', { kind: 'plan', plan_id: planId }));

// Tip the captain after delivery.
export const tipCaptain = async (dbOrderId, amount) => checkout(await call('create-intent-payment', { kind: 'tip', order_id: dbOrderId, amount }));

// Captain: single-use UPI QR for exactly what the customer owes.
export const getDeliveryQr = (dbOrderId) => call('delivery-qr', { order_id: dbOrderId });
