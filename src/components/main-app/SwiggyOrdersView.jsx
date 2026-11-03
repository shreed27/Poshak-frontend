import React, { useState } from 'react';
import { Check, Phone, ArrowRight, ShoppingBag, Star, MapPin, Clock, XCircle, ShieldAlert, Scale } from 'lucide-react';
import { motion } from 'framer-motion';
import { getProgress, statusCopy, TOTAL_SECONDS } from '../../lib/orderEngine';
import { LiveTrackingMap } from './LiveTrackingMap';
import { useSignedUrls } from '../../lib/photos';
import { InvoiceButton } from '../InvoiceButton';
import { RescheduleModal } from './RescheduleModal';
import { supabase } from '../../lib/supabase';
import { tipCaptain } from '../../lib/payments';

const Stars = ({ value, onPick }) => (
  <div className="psk-stars">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" onClick={() => onPick?.(n)} disabled={!onPick} aria-label={`${n} star`}>
        <Star size={20} fill={n <= value ? '#f59e0b' : 'none'} color={n <= value ? '#f59e0b' : '#cbd5e1'} />
      </button>
    ))}
  </div>
);

// What the captain recorded at your door: counts, condition notes and photos.
const PickupRecord = ({ order }) => {
  const checks = Object.values(order.checks || {}).filter((c) => c.stage === 'pickup' || c.stage === 'delivery');
  const urls = useSignedUrls(checks.flatMap((c) => c.photos || []));
  if (checks.length === 0) return null;
  return (
    <div className="psk-billbox">
      <h4>Your clothes, on record</h4>
      {checks.map((c) => (
        <div key={c.stage} style={{ marginBottom: '0.5rem' }}>
          <div className="psk-bill-row"><span><b>{c.stage === 'pickup' ? 'At pickup' : 'At delivery'}</b> · {c.piece_count ?? '–'} pieces</span></div>
          {c.checklist?.length > 0 && <p className="psk-bill-note">{c.checklist.map((x) => `${x.count} ${x.type}`).join(' · ')}{c.notes ? ` — ${c.notes}` : ''}</p>}
          <div className="psk-photos">{(c.photos || []).map((p) => urls[p] && <a key={p} href={urls[p]} target="_blank" rel="noreferrer"><img src={urls[p]} alt="" /></a>)}</div>
        </div>
      ))}
    </div>
  );
};

// Estimate → (after pickup weigh-in) final bill, what's paid and what's left.
const BillBox = ({ order, onPayNow }) => {
  const [busy, setBusy] = useState(false);
  if (!order.remote) {
    return (
      <div className="psk-billbox">
        <h4>Bill</h4>
        <div className="psk-bill-row total"><span>Estimated total</span><span>₹{order.totalAmount}</span></div>
        <p className="psk-bill-note">Pay on delivery. The final amount is set when your captain weighs the clothes.</p>
      </div>
    );
  }
  const weighed = order.finalAmount != null;
  const open = order.dbStatus !== 'cancelled' && order.dbStatus !== 'delivered';
  const pay = async () => { setBusy(true); try { await onPayNow(order); } finally { setBusy(false); } };
  return (
    <div className="psk-billbox">
      <h4>{weighed ? 'Final bill' : 'Estimated bill'} {order.paymentStatus === 'paid' ? <span className="psk-paid-pill">PAID</span> : <span className="psk-due-pill">₹{order.dueAmount} DUE</span>}</h4>
      {weighed && order.actualItems ? order.actualItems.map((it, i) => (
        <div key={i} className="psk-bill-row"><span>Weighed: {it.service_id.replace(/-/g, ' ')}</span><span>{it.qty}</span></div>
      )) : null}
      {weighed && <div className="psk-bill-row"><span>Estimated at booking</span><span>₹{order.estimatedAmount}</span></div>}
      <div className="psk-bill-row total"><span>{weighed ? 'Final amount' : 'Estimated amount'}</span><span>₹{order.totalAmount}</span></div>
      {order.paidAmount > 0 && <div className="psk-bill-row"><span>Paid</span><span>−₹{order.paidAmount}</span></div>}
      {order.refundDue > 0 && <div className="psk-bill-row"><span>Refund being processed</span><span>₹{order.refundDue}</span></div>}
      {!weighed && <p className="psk-bill-note"><Scale size={12} style={{ verticalAlign: '-2px' }} /> Your captain weighs the clothes at pickup. The final bill appears here instantly.</p>}
      {open && order.dueAmount > 0 && (
        <>
          <button className="psk-paynow" onClick={pay} disabled={busy}>{busy ? 'Opening…' : `Pay ₹${order.dueAmount} online now`}</button>
          <p className="psk-bill-note">Or pay at delivery: cash, or scan the UPI QR your captain shows.</p>
        </>
      )}
    </div>
  );
};

const ActiveOrderCard = ({ order, now, onCancel, onPayNow, onReport }) => {
  const [resched, setResched] = useState(null);   // 'pickup' | 'delivery'
  const p = getProgress(order, now);
  const copy = statusCopy(order, p);
  const canCancel = p.step === 0 && !p.done;  // DB also enforces: only before pickup
  const overall = p.remote
    ? Math.round((p.step / 3) * 100)
    : Math.min(100, Math.round(((TOTAL_SECONDS - p.totalLeft) / TOTAL_SECONDS) * 100));

  return (
    <motion.div className="psk-active-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="psk-active-top">
        <div>
          <span className="psk-live-pill"><span className="psk-live-dot" /> LIVE · Order #{order.orderId}</span>
          <h3>{copy.title}</h3>
          <p className="psk-eta"><Clock size={14} /> {copy.sub}</p>
        </div>
        {(p.step >= 2 ? order.deliveryOtp : order.pickupOtp) && (
          <div className="psk-otp">
            <span>{p.step >= 2 ? 'DELIVERY OTP' : 'PICKUP OTP'}</span>
            <b>{p.step >= 2 ? order.deliveryOtp : order.pickupOtp}</b>
          </div>
        )}
      </div>

      <div className="psk-overall"><div style={{ width: `${overall}%` }} /></div>

      <LiveTrackingMap order={order} progress={p} />
      {!order.remote && (
        <p className="psk-demo-note">
          Demo mode: stages are time-compressed and the captain is simulated. Connect Supabase for real orders.
        </p>
      )}

      <div className="milestone-steps-track">
        {order.steps.map((st, i) => {
          const isDone = i < p.step;
          const isActive = i === p.step;
          return (
            <div key={i} className={`milestone-step-item ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
              <div className="step-circle">{isDone ? <Check size={13} strokeWidth={3} /> : i + 1}</div>
              <div className="step-label">{st.label}</div>
              {i < order.steps.length - 1 && <div className={`step-connector ${i < p.step ? 'connector-done' : ''}`} />}
            </div>
          );
        })}
      </div>

      <BillBox order={order} onPayNow={onPayNow} />
      <PickupRecord order={order} />

      <div className="psk-handover">
        <ShieldAlert size={15} />
        <span>
          {p.step >= 2
            ? 'Share the delivery OTP only after your captain hands over your clothes. Never share it earlier or over a call.'
            : 'Share the pickup OTP only when your captain is at your door. Never share it over a call or message.'}
        </span>
      </div>

      <div className="psk-order-grid">
        <div className="psk-rider-card">
          {order.rider && (
            <>
              <img src={order.rider.avatar} alt={order.rider.name} className="captain-avatar" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="captain-name">{order.rider.name} <span className="captain-rating-badge">{order.rider.rating}</span></div>
                <div className="captain-vehicle-text">{order.rider.vehicle}</div>
              </div>
              <a className="psk-call-btn" href={`tel:${order.rider.phone.replace(/\s/g, '')}`} aria-label="Call captain">
                <Phone size={16} />
              </a>
            </>
          )}
        </div>
        <div className="psk-detail-card">
          <div className="psk-detail-line"><MapPin size={14} /> <span>{order.pickupAddress}</span></div>
          <div className="psk-detail-line"><ShoppingBag size={14} /> <span>{order.serviceName} · ₹{order.totalAmount}</span></div>
          <div className="psk-detail-line"><Clock size={14} /> <span>Pickup slot: {order.pickupSlot}</span></div>
        </div>
      </div>

      {order.attachedPhotos?.length > 0 && (
        <div className="psk-photos">
          {order.attachedPhotos.map((ph, i) => (
            <img key={i} src={ph.url || ph} alt={`Garment ${i + 1}`} />
          ))}
        </div>
      )}

      {order.remote && order.failedAttempts > 0 && (
        <div className="psk-handover"><ShieldAlert size={15} /><span>We could not complete {order.failedAttempts} attempt(s). {['picked_up', 'cleaning', 'ready'].includes(order.dbStatus) ? 'Please choose a new delivery time.' : 'Please pick a new pickup time.'}</span></div>
      )}
      {order.remote && order.deliverySlot && <p className="psk-small" style={{ marginTop: '0.6rem' }}>Delivery: <b>{order.deliverySlot}</b></p>}
      {order.remote && (
        <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
          {['placed', 'captain_assigned'].includes(order.dbStatus) && <button className="psk-btn-ghost" onClick={() => setResched('pickup')}>Change pickup time</button>}
          {['picked_up', 'cleaning', 'ready', 'out_for_delivery'].includes(order.dbStatus) && <button className="psk-btn-ghost" onClick={() => setResched('delivery')}>{order.deliverySlot ? 'Change' : 'Choose'} delivery time</button>}
          <button className="psk-report-btn" style={{ marginTop: 0 }} onClick={() => onReport(order)}>Report a problem</button>
        </div>
      )}
      {resched && <RescheduleModal order={order} kind={resched} onClose={() => setResched(null)} />}

      {canCancel && (
        <button className="psk-cancel-btn" onClick={() => onCancel(order.orderId)}>
          <XCircle size={15} /> Cancel order (free before pickup)
        </button>
      )}
      {p.step >= 1 && <p className="psk-small">Cancellation closes once your bag is picked up. Need help? Call your captain.</p>}
    </motion.div>
  );
};

// After delivery: rate the captain and (optionally) leave a tip.
const CaptainFeedback = ({ order }) => {
  const [rating, setRating] = useState(order.captainRating || 0);
  const [done, setDone] = useState(Boolean(order.captainRating));
  const [tipped, setTipped] = useState(false);
  const [msg, setMsg] = useState('');
  if (!order.rider) return null;
  const rate = async (n) => {
    setRating(n);
    const { error } = await supabase.rpc('rate_captain', { p_id: order.dbId, p_rating: n, p_feedback: null });
    if (error) setMsg(error.message); else setDone(true);
  };
  const tip = async (amt) => {
    try { await tipCaptain(order.dbId, amt); setTipped(true); setMsg(`Thank you! ₹${amt} sent to ${order.rider.name.split(' ')[0]}.`); }
    catch (e) { if (e.message !== 'Payment cancelled') setMsg(e.message); }
  };
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div className="psk-small">Rate {order.rider.name.split(' ')[0]}</div>
      <Stars value={rating} onPick={done ? undefined : rate} />
      {!tipped && <div className="psk-tipbar"><span>Add a tip:</span>{[20, 50, 100].map((a) => <button key={a} onClick={() => tip(a)}>₹{a}</button>)}</div>}
      {msg && <div className="psk-small" style={{ color: '#15803d' }}>{msg}</div>}
    </div>
  );
};

const RateBlock = ({ order, onRate }) => {
  if (order.rating) return <Stars value={order.rating} />;
  return (
    <div>
      <div className="psk-small" style={{ marginBottom: 2 }}>Rate this order</div>
      <Stars value={0} onPick={(n) => onRate(order.orderId, n)} />
    </div>
  );
};

export const SwiggyOrdersView = ({ orders, now, onCancelOrder, onPayNow, onReport, onRateOrder, onReorder, onStartNewOrder }) => {
  const activeOrders = orders.filter((o) => o.status === 'active');
  const pastOrders = orders.filter((o) => o.status !== 'active');

  return (
    <div className="swiggy-feed-container">
      <h2 className="swiggy-section-heading" style={{ marginBottom: '1.25rem' }}>Your Orders</h2>

      {activeOrders.length === 0 ? (
        <div className="psk-empty-card">
          <ShoppingBag size={40} color="#fa5929" style={{ margin: '0 auto 0.75rem' }} />
          <h3>No active orders right now</h3>
          <p>Book a doorstep pickup and track your captain live on the map.</p>
          <button onClick={onStartNewOrder} className="psk-btn-primary">Book a pickup</button>
        </div>
      ) : (
        activeOrders.map((o) => <ActiveOrderCard key={o.orderId} order={o} now={now} onCancel={onCancelOrder} onPayNow={onPayNow} onReport={onReport} />)
      )}

      <h3 className="psk-past-title">Past orders ({pastOrders.length})</h3>
      {pastOrders.length === 0 && <div className="psk-empty">Completed orders will show up here.</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {pastOrders.map((order) => (
          <div key={order.orderId} className="psk-past-card">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                {order.status === 'cancelled' ? (
                  <span className="psk-tag psk-tag-red">Cancelled</span>
                ) : (
                  <span className="psk-tag psk-tag-green">Delivered</span>
                )}
                <span className="psk-small">#{order.orderId} • {order.status === 'cancelled' ? order.placedAt : order.deliveredAt}</span>
              </div>
              <h4>{order.serviceName}</h4>
              <div className="psk-small">₹{order.totalAmount}</div>
              {order.refundDue > 0 && <div className="psk-small" style={{ color: '#b45309' }}>Refund of ₹{order.refundDue} is being processed</div>}
              {order.status === 'completed' && <RateBlock order={order} onRate={onRateOrder} />}
              {order.status === 'completed' && order.remote && <CaptainFeedback order={order} />}
              {order.remote && <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center', marginTop: '0.4rem' }}>{order.status === 'completed' && <InvoiceButton orderId={order.dbId} />}<button className="psk-report-btn" style={{ marginTop: 0 }} onClick={() => onReport(order)}>Report a problem</button></div>}
            </div>
            <button onClick={() => onReorder(order)} className="psk-reorder-btn">
              <span>Reorder</span> <ArrowRight size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
