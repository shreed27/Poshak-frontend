import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Phone, Radio, LogOut, KeyRound, Scale, Banknote, QrCode, CheckCircle2, Loader2, Wallet, UserX, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { fromRow, subscribeOrders } from '../../lib/ordersApi';
import { STATUS_LABEL } from '../../lib/orderStatus';
import { serviceInfo } from '../../lib/pricing';
import { useCatalog } from '../../context/CatalogContext';
import { getDeliveryQr } from '../../lib/payments';
import { OpsGate } from './OpsGate';
import { SosButton, EarningsTab } from './CaptainExtras';
import { RiderStrip, RiderWarnings, RiderHistory } from './RiderExtras';
import { PartnerProfile, StatusBanner, useMyProfile } from './PartnerProfile';
import './ops2.css';
import { NotificationBell } from '../NotificationBell';
import { PhotoCapture, GarmentChecklist, checklistFrom, totalPieces } from './PhotoCapture';
import { canStartDelivery } from '../../lib/orderStatus';

const SELECT = '*, order_events(status, created_at)';
const PUSH_EVERY_MS = 4000;

// Customer unavailable: records the attempt, tells the customer, alerts ops.
const NoShowButton = ({ o, stage, run }) => (
  <button className="ops-btn ops-btn-danger ops-wide" style={{ marginTop: '0.6rem' }} onClick={() => {
    const note = window.prompt('Customer not available — add a note (optional):', '');
    if (note === null) return;
    run(() => supabase.rpc('captain_report_no_show', { p_id: o.dbId, p_stage: stage, p_note: note || null }));
  }}><UserX size={15} /> Customer not available</button>
);

// A new assignment waits for the captain's answer; unanswered offers go back to the queue.
const OfferPanel = ({ o, run, timeoutMin }) => {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.round((new Date(o.offeredAt).getTime() + timeoutMin * 60000 - Date.now()) / 1000)));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [o.offeredAt, timeoutMin]);
  return (
    <div className="cap-panel cap-offer">
      <b>New job offer</b>
      <span>Respond within {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} or it goes to another captain.</span>
      <div className="cap-pay-actions">
        <button className="ops-btn" onClick={() => { const why = window.prompt('Why are you declining? (optional)', '') ; if (why !== null) run(() => supabase.rpc('captain_decline_job', { p_id: o.dbId, p_reason: why || null })); }}><X size={15} /> Decline</button>
        <button className="ops-btn ops-btn-primary" onClick={() => run(() => supabase.rpc('captain_accept_job', { p_id: o.dbId }))}><Check size={15} /> Accept</button>
      </div>
    </div>
  );
};

const Steps = ({ status }) => {
  const labels = ['Pickup', 'Cleaning', 'Delivery', 'Done'];
  const idx = { captain_assigned: 0, picked_up: 1, cleaning: 1, ready: 1, out_for_delivery: 2, delivered: 3 }[status] ?? 0;
  return (
    <div className="cap-steps">
      {labels.map((l, i) => <span key={l} className={i < idx ? 'done' : i === idx ? 'now' : ''}>{l}</span>)}
    </div>
  );
};

// ---- Step 1: at the customer's door — OTP, weigh, fix the bill ---------------------------------
const PickupPanel = ({ o, run }) => {
  const [otp, setOtp] = useState('');
  const [counts, setCounts] = useState({});
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const { settings } = useCatalog();
  const needPhotos = settings.require_photos !== false;
  const pieces = totalPieces(counts);
  const [qty, setQty] = useState(() => Object.fromEntries(o.bookedItems.map((it) => [it.service_id, String(it.qty)])));
  const { services } = useCatalog();
  const items = o.bookedItems.map((it) => ({ service_id: it.service_id, qty: Number(qty[it.service_id]) || 0 }));
  const valid = items.every((it) => it.qty > 0) && otp.length === 4 && (!needPhotos || (pieces > 0 && photos.length > 0));
  const [serverBill, setServerBill] = useState(null);
  // Ask the server what this weigh-in costs (same coupon as booked), so the number shown is the number charged.
  useEffect(() => {
    if (!items.every((it) => it.qty > 0)) return undefined;
    const timer = setTimeout(async () => {
      const { data } = await supabase.rpc('preview_price_for_order', { p_id: o.dbId, p_items: items });
      if (data != null) setServerBill(Number(data));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items)]);
  const bill = serverBill ?? Math.max(1, Math.round(items.reduce((a, it) => a + (serviceInfo(it.service_id, services)?.unitPrice || 0) * it.qty, 0)));

  return (
    <div className="cap-panel">
      <h4><Scale size={15} /> Weigh & confirm pickup</h4>
      {o.bookedItems.map((it) => {
        const svc = serviceInfo(it.service_id, services);
        return (
          <div key={it.service_id} className="cap-weigh">
            <div>
              <b>{svc?.name || it.service_id}</b>
              <span>Customer estimated {it.qty} {svc?.unit}</span>
            </div>
            <input inputMode="decimal" value={qty[it.service_id]}
              onChange={(e) => setQty({ ...qty, [it.service_id]: e.target.value.replace(/[^\d.]/g, '') })} />
            <em>{svc?.unit}</em>
          </div>
        );
      })}
      <h4 style={{ marginTop: '0.9rem' }}>Count the garments <small className="ops-muted">({pieces} pieces)</small></h4>
      <GarmentChecklist counts={counts} onChange={setCounts} />
      <input className="ops-inline" style={{ marginTop: '0.5rem' }} placeholder="Condition notes (stains, tears, missing buttons…)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <h4 style={{ marginTop: '0.9rem' }}>Photo of the clothes {needPhotos && <small className="ops-muted">(required)</small>}</h4>
      <PhotoCapture orderId={o.dbId} label="pickup" value={photos} onChange={setPhotos} />
      <div className="cap-bill">
        <span>Final bill</span><b>₹{bill}</b>
        <small>{bill !== o.estimatedAmount ? `Estimate was ₹${o.estimatedAmount}` : 'Matches the estimate'}</small>
      </div>
      <div className="ops-otp">
        <KeyRound size={15} />
        <input inputMode="numeric" maxLength={4} placeholder="Customer's pickup OTP" value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
      </div>
      <button className="ops-btn ops-btn-primary ops-wide" disabled={!valid}
        onClick={() => run(() => supabase.rpc('confirm_pickup', { p_id: o.dbId, p_otp: otp, p_items: items, p_pieces: pieces || null, p_checklist: checklistFrom(counts), p_notes: notes || null, p_photos: photos.map((p) => p.path) }))}>
        Confirm pickup · fix bill ₹{bill}
      </button>
      <p className="ops-muted">Ask the customer to read the 4-digit code from their app. Don't accept it by message.</p>
      <NoShowButton o={o} stage="pickup" run={run} />
    </div>
  );
};

// ---- Step 3: payment + handover ------------------------------------------------------------------
const DeliveryPanel = ({ o, run }) => {
  const [otp, setOtp] = useState('');
  const [pieces, setPieces] = useState(o.piecesPickedUp || 0);
  const [photos, setPhotos] = useState([]);
  const { settings } = useCatalog();
  const needPhotos = settings.require_photos !== false;
  const [qr, setQr] = useState(null);
  const [qrBusy, setQrBusy] = useState(false);
  const [qrError, setQrError] = useState('');
  const paid = o.dueAmount <= 0;

  // Once the webhook marks the order paid the realtime refetch lands here — drop the QR.
  useEffect(() => { if (paid) setQr(null); }, [paid]);

  const showQr = async () => {
    setQrBusy(true); setQrError('');
    try { setQr(await getDeliveryQr(o.dbId)); } catch (e) { setQrError(e.message); }
    setQrBusy(false);
  };

  return (
    <div className="cap-panel">
      <div className={`cap-pay ${paid ? 'paid' : ''}`}>
        {paid ? <><CheckCircle2 size={18} /> <b>Payment received</b> <span>₹{o.paidAmount} paid</span></>
          : <><Banknote size={18} /> <b>Collect ₹{o.dueAmount}</b> <span>{o.paymentMode === 'online' ? 'Balance after weighing' : 'Pay on delivery'}</span></>}
      </div>

      {!paid && (
        <div className="cap-pay-actions">
          <button className="ops-btn" onClick={() => run(() => supabase.rpc('collect_cash', { p_id: o.dbId }))}>
            <Banknote size={15} /> Cash received ₹{o.dueAmount}
          </button>
          <button className="ops-btn ops-btn-primary" onClick={showQr} disabled={qrBusy}>
            {qrBusy ? <Loader2 size={15} className="psk-spin" /> : <QrCode size={15} />} Show UPI QR
          </button>
        </div>
      )}
      {qrError && <div className="ops-error" style={{ margin: '0.5rem 0 0' }}>{qrError}</div>}
      {qr && !paid && (
        <div className="cap-qr">
          <img src={qr.image_url} alt="UPI QR" />
          <b>Scan to pay ₹{qr.amount}</b>
          <span><Loader2 size={12} className="psk-spin" /> Waiting for payment… this screen updates by itself</span>
        </div>
      )}

      {paid && (
        <>
          <h4 style={{ marginTop: '0.9rem' }}>Handover check</h4>
          <div className="cap-weigh">
            <div><b>Garments handed over</b><span>{o.piecesPickedUp ? `You picked up ${o.piecesPickedUp}` : 'Count them with the customer'}</span></div>
            <input inputMode="numeric" value={pieces || ''} onChange={(e) => setPieces(Number(e.target.value.replace(/\D/g, '')) || 0)} />
          </div>
          {o.piecesPickedUp && pieces && pieces !== o.piecesPickedUp && <div className="ops-error" style={{ margin: '0 0 0.5rem' }}>Count differs from pickup ({o.piecesPickedUp}). Admin will be alerted.</div>}
          <PhotoCapture orderId={o.dbId} label="delivery" value={photos} onChange={setPhotos} />
        </>
      )}

      <div className="ops-otp" style={{ marginTop: '0.9rem' }}>
        <KeyRound size={15} />
        <input inputMode="numeric" maxLength={4} placeholder="Customer's delivery OTP" value={otp} disabled={!paid}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
      </div>
      <button className="ops-btn ops-btn-primary ops-wide" disabled={!paid || otp.length !== 4 || (needPhotos && (!pieces || photos.length === 0))}
        onClick={() => run(() => supabase.rpc('confirm_delivery', { p_id: o.dbId, p_otp: otp, p_pieces: pieces || null, p_photos: photos.map((p) => p.path) }))}>
        Complete delivery
      </button>
      {!paid && <p className="ops-muted">Delivery unlocks after payment is received.</p>}
      <NoShowButton o={o} stage="delivery" run={run} />
    </div>
  );
};

const Captain = () => {
  const { session, logout } = useAuth();
  const { settings } = useCatalog();
  const uid = session.user.id;
  const [orders, setOrders] = useState([]);
  const [cash, setCash] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [lastFix, setLastFix] = useState(null);
  const [error, setError] = useState('');
  const [me, setMe] = useState(null);
  const [sum, setSum] = useState(null);
  const [profile, reloadProfile] = useMyProfile();
  const [tab, setTab] = useState('jobs');
  const watchId = useRef(null);
  const lastPush = useRef(0);

  const load = useCallback(async () => {
    const [{ data, error: err }, { data: pay }, { data: sm }] = await Promise.all([
      supabase.from('orders').select(SELECT).eq('captain_id', uid).order('created_at', { ascending: false }),
      supabase.from('payments').select('amount').eq('collected_by', uid).eq('method', 'cash').eq('deposited', false),
      supabase.rpc('captain_summary')
    ]);
    setSum(sm || null);
    if (err) { setError(err.message); return; }
    setOrders(data.map((r) => fromRow(r)));   // captains get no OTPs: they never exist client-side
    setCash((pay || []).reduce((a, p) => a + Number(p.amount), 0));
  }, [uid]);

  useEffect(() => {
    supabase.from('profiles').select('name, phone, vehicle').eq('id', uid).maybeSingle().then(({ data }) => setMe(data));
    load();
    return subscribeOrders(`captain-${uid}`, load);
  }, [load, uid]);

  const active = orders.filter((o) => o.status === 'active');
  const done = orders.filter((o) => o.status !== 'active').slice(0, 5);

  // One place for every action: call the server function, show its message if it refuses, refresh.
  const run = async (fn) => {
    const { error: err } = await fn();
    if (err) setError(err.message); else { setError(''); await load(); }
  };

  const stopSharing = useCallback(() => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setSharing(false);
    supabase.rpc('captain_set_online', { p_online: false });
  }, []);

  const startSharing = () => {
    if (!('geolocation' in navigator)) { setGpsError('This device has no GPS access.'); return; }
    setGpsError('');
    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLastFix({ lat, lng, at: Date.now() });
        if (Date.now() - lastPush.current < PUSH_EVERY_MS) return;
        lastPush.current = Date.now();
        const { error: err } = await supabase.rpc('captain_update_location', { p_lat: lat, p_lng: lng });
        if (err) setGpsError(err.message);
      },
      (err) => {
        setGpsError(err.code === err.PERMISSION_DENIED ? 'Location permission denied. Allow it so customers can track you.' : 'Could not read GPS. Retrying…');
        if (err.code === err.PERMISSION_DENIED) stopSharing();
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );
    setSharing(true);
    supabase.rpc('captain_set_online', { p_online: true });
  };
  useEffect(() => () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current); }, []);

  return (
    <div className="ops-root ops-captain">
      <header className="ops-top">
        <div className="ops-brand">Poshak <span>Rider</span></div>
        <div className="ops-top-right">
          <SosButton activeOrderId={orders.find((o) => o.status === 'active')?.dbId} />
          <NotificationBell userId={uid} onNew={() => { try { navigator.vibrate?.(200); } catch { /* ignore */ } }} />
          <button className="ops-icon" onClick={() => { logout(); window.location.hash = '#/rider'; }}><LogOut size={16} /></button>
        </div>
      </header>

      {me?.name && (
        <div className="cap-me">
          <b>{me.name}</b>
          <span>{me.phone ? `+91 ${me.phone}` : ''}{me.vehicle ? ` · ${me.vehicle}` : ''}</span>
          <small>This is what customers see. Wrong details? Ask the admin to update them.</small>
        </div>
      )}

      <StatusBanner profile={profile} />
      <RiderWarnings profile={profile} />
      <RiderStrip s={sum} cash={cash} />

      <div className={`ops-share ${sharing ? 'on' : ''}`}>
        <Radio size={18} />
        <div>
          <b>{sharing ? 'Sharing live location' : 'Location sharing is off'}</b>
          <span>{sharing && lastFix ? `Last fix ${new Date(lastFix.at).toLocaleTimeString()}` : 'Customers see you on their map while this is on'}</span>
        </div>
        <button className="ops-btn ops-btn-primary" onClick={sharing ? stopSharing : startSharing}>{sharing ? 'Stop' : 'Go online'}</button>
      </div>

      <div className="cap-cash"><Wallet size={16} /> Cash in hand to deposit <b>₹{cash}</b></div>

      {gpsError && <div className="ops-error">{gpsError}</div>}
      {error && <div className="ops-error">{error}</div>}

      <div className="cap-tabs">{[['jobs', `Jobs${active.length ? ` (${active.length})` : ''}`], ['earn', 'Earnings'], ['history', 'History'], ['profile', 'Profile']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'earn' && <EarningsTab />}
      {tab === 'history' && <RiderHistory orders={orders} />}
      {tab === 'profile' && <PartnerProfile role="captain" profile={profile} reload={reloadProfile} />}
      {tab === 'jobs' && <>
      <h3 className="ops-h">My jobs ({active.length})</h3>
      {active.length === 0 && <div className="ops-card ops-empty">Nothing assigned yet. New jobs appear here instantly.</div>}

      {active.map((o) => (
        <div key={o.dbId} className="ops-card">
          <div className="ops-order-top">
            <h3>#{o.orderId}</h3>
            <span className={`ops-badge b-${o.dbStatus}`}>{STATUS_LABEL[o.dbStatus]}</span>
          </div>
          <Steps status={o.dbStatus} />

          <p className="ops-line"><b>{o.customerName}</b></p>
          <p className="ops-line"><MapPin size={14} /> {o.pickupAddress}{o.landmark ? ` · Near ${o.landmark}` : ''}</p>
          <p className="ops-line">Slot: {o.pickupSlot} · {o.paymentMode === 'online' ? 'Prepaid (online)' : 'Pay on delivery'}</p>
          {o.deliverySlot && <p className="ops-line"><b>Deliver:</b> {o.deliverySlot}</p>}
          {o.failedAttempts > 0 && <p className="ops-line" style={{ color: '#b45309' }}>{o.failedAttempts} failed attempt(s) so far</p>}
          {o.specialInstructions && <p className="ops-line">Note: {o.specialInstructions}</p>}
          <div className="ops-actions">
            <a className="ops-btn" target="_blank" rel="noreferrer"
              href={`https://www.google.com/maps/dir/?api=1&destination=${o.customerLocation.lat},${o.customerLocation.lng}&travelmode=driving`}>
              <Navigation size={14} /> Navigate
            </a>
            {o.customerPhone && <a className="ops-btn" href={`tel:+91${o.customerPhone}`}><Phone size={14} /> Call</a>}
          </div>

          {o.dbStatus === 'captain_assigned' && o.assignment === 'offered' && <OfferPanel o={o} run={run} timeoutMin={Number(settings.offer_timeout_min ?? 5)} />}
          {o.dbStatus === 'captain_assigned' && o.assignment !== 'offered' && <PickupPanel o={o} run={run} />}
          {['picked_up', 'cleaning', 'ready'].includes(o.dbStatus) && (
            <div className="cap-panel">
              <p className="ops-line">
                Clothes collected · final bill <b>₹{o.finalAmount}</b> · <b>{STATUS_LABEL[o.dbStatus]}</b>.
              </p>
              {canStartDelivery(o.dbStatus, settings.require_cleaner_step === true) ? (
                <button className="ops-btn ops-btn-primary ops-wide" onClick={() => run(() => supabase.rpc('start_delivery', { p_id: o.dbId }))}>
                  Start delivery
                </button>
              ) : <p className="ops-muted">Waiting for the laundry to mark this order ready. You will be able to start delivery then.</p>}
            </div>
          )}
          {o.dbStatus === 'out_for_delivery' && <DeliveryPanel o={o} run={run} />}
        </div>
      ))}

      {done.length > 0 && (
        <>
          <h3 className="ops-h">Recent</h3>
          {done.map((o) => (
            <div key={o.dbId} className="ops-card ops-muted">#{o.orderId} · {STATUS_LABEL[o.dbStatus]} · ₹{o.totalAmount}</div>
          ))}
        </>
      )}
      </>}
    </div>
  );
};

export const CaptainApp = () => (
  <OpsGate title="Poshak Rider" roles={['captain']} kind="rider">
    <Captain />
  </OpsGate>
);
