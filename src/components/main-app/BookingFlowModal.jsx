import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronDown, ChevronRight, ChevronUp, Camera, X, Plus, Minus, Trash2, Smartphone, CreditCard, Landmark, Wallet, Banknote, Check, Ticket, Clock } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext';
import { usePriceQuote } from '../../hooks/usePriceQuote';
import { slotText } from '../../hooks/useSlots';
import { SlotPicker } from './SlotPicker';
import { CouponBox } from './CouponBox';
import { usePaymentsLive } from '../../lib/payments';
import { isBackendConfigured } from '../../lib/supabase';
import { useEscape } from '../../lib/useEscape';
import { DEFAULT_KG, MAX_KG } from './SwiggyHomeView';

const MAX_PHOTOS = 4;

// How the customer can pay. Online ones open Razorpay directly on that method; COD is settled with the rider.
export const PAY_METHODS = [
  { id: 'upi', group: 'Pay by UPI', label: 'UPI', sub: 'Google Pay, PhonePe, Paytm, BHIM or any UPI app', Icon: Smartphone, rz: 'upi' },
  { id: 'card', group: 'Cards', label: 'Credit or debit card', sub: 'Visa, Mastercard, RuPay', Icon: CreditCard, rz: 'card' },
  { id: 'netbanking', group: 'Netbanking', label: 'Netbanking', sub: 'SBI, HDFC, ICICI, Axis and all major banks', Icon: Landmark, rz: 'netbanking' },
  { id: 'wallet', group: 'Wallets', label: 'Wallets', sub: 'Amazon Pay, PhonePe, Mobikwik and more', Icon: Wallet, rz: 'wallet' },
  { id: 'cod', group: 'Pay on delivery', label: 'Pay on delivery', sub: 'Cash or UPI to the rider when your clothes come back', Icon: Banknote }
];

// Compact outlined stepper used inside the cart (− 4 kg +).
const CartStepper = ({ kg, onChange }) => (
  <div className="qc-ostep" role="group" aria-label="Estimated weight">
    <button type="button" onClick={() => onChange(kg - 1)} aria-label={kg <= 1 ? 'Remove' : 'Less'}>{kg <= 1 ? <Trash2 size={13} /> : <Minus size={14} strokeWidth={3} />}</button>
    <span>{kg} kg</span>
    <button type="button" onClick={() => onChange(Math.min(MAX_KG, kg + 1))} disabled={kg >= MAX_KG} aria-label="More"><Plus size={14} strokeWidth={3} /></button>
  </div>
);

// Checkout page (full screen on phones). Price is an estimate; the rider weighs at the door and the server bills the real weight.
export const BookingFlowModal = ({ isOpen, onClose, basket = {}, onSetKg, onClearBasket, activeAddress, onChangeAddress, onConfirmOrder }) => {
  const { services } = useCatalog();
  const paymentsLive = usePaymentsLive() && isBackendConfigured;
  const [slot, setSlot] = useState(null);
  const [coupon, setCoupon] = useState('');
  const [method, setMethod] = useState(null);          // null = default (UPI when online works, else COD)
  const [payOpen, setPayOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [showExtras, setShowExtras] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [placing, setPlacing] = useState(false);
  const fileRef = useRef(null);
  useEscape(isOpen && !payOpen, onClose);
  useEscape(payOpen, () => setPayOpen(false));

  const lines = services.filter((s) => basket[s.id] > 0).map((s) => ({ svc: s, kg: basket[s.id] }));
  const others = services.filter((s) => !(basket[s.id] > 0));
  const totalKg = lines.reduce((a, l) => a + l.kg, 0);
  const items = useMemo(() => lines.map((l) => ({ service_id: l.svc.id, qty: l.kg })), [JSON.stringify(basket), services]); // eslint-disable-line react-hooks/exhaustive-deps
  const quote = usePriceQuote(items, coupon);

  if (!isOpen) return null;

  const chosen = PAY_METHODS.find((m) => m.id === (method || (paymentsLive ? 'upi' : 'cod')));
  const online = chosen.id !== 'cod';
  const usable = !online || paymentsLive;
  const minTopUp = Math.max(0, quote.total - (quote.subtotal - quote.discount));

  const addPhotos = (files) => {
    const next = Array.from(files || []).filter((f) => f.type.startsWith('image/')).slice(0, MAX_PHOTOS - photos.length)
      .map((file) => ({ id: `${Date.now()}-${Math.random()}`, file, url: URL.createObjectURL(file) }));
    setPhotos((p) => [...p, ...next]);
  };

  const canPlace = lines.length > 0 && slot && !quote.couponError && !placing && usable;
  const place = () => {
    if (!canPlace) return;
    setPlacing(true);
    const a = activeAddress;
    onConfirmOrder({
      orderId: `PSK-${Math.floor(10000 + Math.random() * 90000)}`,
      status: 'active',
      serviceName: lines.map((l) => l.svc.name).join(' + '),
      serviceCategory: lines[0].svc.id,
      laundromatName: 'Poshak',
      laundromatArea: '',
      itemsCount: Math.round(totalKg * 2.5),
      weightKg: totalKg.toFixed(1),
      totalAmount: quote.total,
      paymentMethod: online ? `Online (${chosen.label})` : 'Pay on delivery (cash / UPI)',
      paymentMode: online ? 'online' : 'cod',
      payMethod: chosen.rz || null,
      paymentStatus: 'Pending',
      landmark: a.landmark || '',
      customerPhone: a.phone || '',
      serviceItems: items,
      pickupSlot: slotText(slot),
      pickupDate: slot?.date,
      pickupWindow: slot?.win,
      couponCode: coupon || null,
      deliveryEstimate: '',
      placedAt: 'Just now',
      currentStep: 0,
      pickupOtp: `${Math.floor(1000 + Math.random() * 9000)}`,
      deliveryOtp: `${Math.floor(1000 + Math.random() * 9000)}`,
      pickupAddress: [a.flatBuilding, a.streetArea, a.city].filter(Boolean).join(', ') + (a.pincode ? ` - ${a.pincode}` : ''),
      specialInstructions: notes.trim(),
      attachedPhotos: photos.map((p) => p.url),
      photoFiles: photos.map((p) => p.file),
      steps: [
        { step: 0, label: 'Order placed', time: 'Just now', desc: '', done: true, active: true },
        { step: 1, label: 'Picked up', time: slotText(slot), desc: '', done: false },
        { step: 2, label: 'Washing', time: '', desc: '', done: false },
        { step: 3, label: 'Ready', time: '', desc: '', done: false },
        { step: 4, label: 'Out for delivery', time: '', desc: '', done: false },
        { step: 5, label: 'Delivered', time: '', desc: '', done: false }
      ]
    });
    setPlacing(false);
    onClose();
  };

  const cta = placing ? 'Placing…'
    : !lines.length ? 'Add a service'
    : !slot ? 'Pick a pickup slot'
    : !usable ? 'Choose another way to pay'
    : online ? `Pay ₹${quote.total}` : `Place order · ₹${quote.total}`;

  return (
    <div className="qc-sheet-back qc-checkout-back" onClick={onClose}>
      <motion.div
        className="qc-sheet qc-checkout"
        role="dialog"
        aria-label="Checkout"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {/* Header: when and where, like "5 Minutes · Home" in delivery apps */}
        <div className="qc-co-head">
          <button type="button" className="qc-iconbtn" onClick={onClose} aria-label="Back"><ArrowLeft size={18} /></button>
          <button type="button" className="qc-co-where" onClick={onChangeAddress}>
            <b>{slot ? `Pickup ${slotText(slot).replace(', ', ' · ')}` : 'Choose a pickup slot'}</b>
            <span><em>{activeAddress.label}</em> · {[activeAddress.flatBuilding, activeAddress.streetArea].filter(Boolean).join(', ')} <ChevronDown size={14} /></span>
          </button>
        </div>
        <div className="qc-co-strip">Free pickup & delivery on this order</div>

        <div className="qc-sheet-body">
          {/* Items */}
          <div className="qc-card">
            <div className="qc-card-t">{lines.length ? `${lines.length} ${lines.length === 1 ? 'service' : 'services'} · about ${totalKg} kg` : 'Your cart'}
              {lines.length > 0 && onClearBasket && <button type="button" className="qc-link-muted" onClick={onClearBasket}>Clear</button>}
            </div>
            {lines.length === 0 ? (
              <div className="qc-empty"><b>Nothing in your cart yet</b><p>Add a service below to schedule a pickup.</p></div>
            ) : lines.map(({ svc, kg }) => (
              <div key={svc.id} className="qc-cart-row">
                <img src={svc.image} alt="" />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b>{svc.name}</b>
                  <span>₹{svc.unitPrice}/{svc.unit} · weighed at your door</span>
                </div>
                <em>₹{Math.round(kg * svc.unitPrice)}</em>
                <CartStepper kg={kg} onChange={(v) => onSetKg(svc.id, v)} />
              </div>
            ))}
          </div>

          {/* Add more */}
          {others.length > 0 && (
            <div className="qc-card">
              <div className="qc-card-t">Add to this pickup</div>
              <div className="qc-addmore">
                {others.map((s) => (
                  <div key={s.id} className="qc-addmore-item">
                    <div className="qc-addmore-img"><img src={s.image} alt="" /><button type="button" className="qc-add sm" onClick={() => onSetKg(s.id, DEFAULT_KG)}>ADD</button></div>
                    <b>{s.name}</b>
                    <span>₹{s.unitPrice}/{s.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pickup window */}
          <div className="qc-card">
            <div className="qc-card-t"><Clock size={16} /> Pickup slot</div>
            <SlotPicker value={slot} onChange={setSlot} />
          </div>

          {/* Notes & photos */}
          <div className="qc-card">
            <button type="button" className="qc-row" onClick={() => setShowExtras((v) => !v)} aria-expanded={showExtras}>
              <span className="qc-row-ic"><Camera size={17} /></span>
              <div style={{ minWidth: 0 }}>
                <b>Instructions & photos</b>
                <span>{notes.trim() || photos.length ? [notes.trim() && 'Note added', photos.length && `${photos.length} photo${photos.length > 1 ? 's' : ''}`].filter(Boolean).join(' · ') : 'Optional: stains, delicate items, where to leave the bag'}</span>
              </div>
              <ChevronRight size={18} style={{ marginLeft: 'auto', transform: showExtras ? 'rotate(90deg)' : 'none', transition: 'transform .15s', color: 'var(--qc-ink-3)' }} />
            </button>
            {showExtras && (
              <div style={{ marginTop: 12 }}>
                <textarea className="qc-input" rows={2} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Coffee stain on the white shirt. Leave the bag with security." />
                <div className="qc-photos">
                  {photos.map((p) => (
                    <div key={p.id} className="qc-photo">
                      <img src={p.url} alt="" />
                      <button type="button" aria-label="Remove photo" onClick={() => setPhotos((all) => all.filter((x) => x.id !== p.id))}><X size={12} /></button>
                    </div>
                  ))}
                  {photos.length < MAX_PHOTOS && <button type="button" className="qc-photo-add" onClick={() => fileRef.current?.click()}><span><Camera size={16} /><br />Add</span></button>}
                  <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
                </div>
              </div>
            )}
          </div>

          {/* Coupon */}
          {quote.fromServer && (
            <div className="qc-card">
              {coupon || showCoupon ? (
                <CouponBox applied={coupon} onApply={setCoupon} quote={quote} enabled />
              ) : (
                <button type="button" className="qc-row" onClick={() => setShowCoupon(true)}>
                  <span className="qc-row-ic"><Ticket size={17} /></span>
                  <div><b>Apply coupon</b><span>Have a code? Add it here</span></div>
                  <ChevronRight size={18} style={{ marginLeft: 'auto', color: 'var(--qc-ink-3)' }} />
                </button>
              )}
            </div>
          )}

          {/* Bill */}
          {lines.length > 0 && (
            <div className="qc-card qc-billcard">
              <div className="qc-bill">
                <div><span>Item total (about {totalKg} kg)</span><span>₹{quote.subtotal}</span></div>
                <div><span>Pickup & delivery</span><span className="free">FREE</span></div>
                {quote.discount > 0 && <div className="save"><span>Discount</span><span>−₹{quote.discount}</span></div>}
                {minTopUp > 0 && <div><span>Minimum order top-up</span><span>₹{minTopUp}</span></div>}
                <div className="total"><span>To pay (estimate)</span><span>₹{quote.total}</span></div>
              </div>
              {quote.discount > 0 && <div className="qc-saved">You save ₹{quote.discount} on this order</div>}
            </div>
          )}

          <div className="qc-terms">
            <b>Good to know</b>
            <ul>
              <li>The rider weighs your clothes at pickup. Your final bill is for the actual weight.</li>
              <li>If you pay online now, any difference after weighing is settled at delivery.</li>
              <li>Cancel free any time before pickup from the Orders tab.</li>
            </ul>
          </div>
        </div>

        {/* Pay bar: method on the left (tap to change), amount button on the right */}
        <div className="qc-paybar">
          <button type="button" className="qc-paywith" onClick={() => setPayOpen(true)}>
            <span>Pay using <ChevronUp size={13} /></span>
            <b><chosen.Icon size={15} /> {chosen.label}</b>
          </button>
          <button type="button" className="qc-primary" disabled={!canPlace} onClick={place}>{cta}</button>
        </div>

        {/* Payment options sheet */}
        <AnimatePresence>
          {payOpen && (
            <motion.div className="qc-paysheet-back" onClick={() => setPayOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="qc-paysheet" onClick={(e) => e.stopPropagation()} initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ duration: 0.18 }}>
                <div className="qc-paysheet-head">
                  <div><b>Select payment option</b><span>Order amount ₹{quote.total} (estimate)</span></div>
                  <button type="button" className="qc-iconbtn" onClick={() => setPayOpen(false)} aria-label="Close"><X size={18} /></button>
                </div>
                {!paymentsLive && <p className="qc-paynote">Online payments are being switched on. You can pay on delivery today.</p>}
                <div className="qc-paylist">
                  {PAY_METHODS.map((m) => {
                    const off = m.id !== 'cod' && !paymentsLive;
                    const on = chosen.id === m.id;
                    return (
                      <div key={m.id}>
                        <div className="qc-paygroup">{m.group}</div>
                        <button type="button" className={`qc-payopt ${on ? 'on' : ''}`} disabled={off} onClick={() => { setMethod(m.id); setPayOpen(false); }}>
                          <span className="qc-row-ic"><m.Icon size={18} /></span>
                          <span className="qc-acc-txt"><b>{m.label}</b><span>{off ? 'Available soon' : m.sub}</span></span>
                          <span className={`qc-radio ${on ? 'on' : ''}`}>{on && <Check size={12} strokeWidth={3.5} />}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
                <p className="qc-paynote muted">Online payments are processed securely by Razorpay. We never see your card or UPI PIN.</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
