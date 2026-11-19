import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Clock, MapPin, Camera, ChevronRight, Plus, Tag } from 'lucide-react';
import { useCatalog } from '../../context/CatalogContext';
import { usePriceQuote } from '../../hooks/usePriceQuote';
import { slotText } from '../../hooks/useSlots';
import { SlotPicker } from './SlotPicker';
import { CouponBox } from './CouponBox';
import { PaymentChoice } from './PaymentChoice';
import { isBackendConfigured } from '../../lib/supabase';
import { useEscape } from '../../lib/useEscape';
import { KgStepper, DEFAULT_KG } from './SwiggyHomeView';

const MAX_PHOTOS = 4;

// Checkout: everything in the cart, pickup window, address, optional notes/photos, coupon, bill and payment.
// The price shown is an estimate; the rider weighs the bag at the door and the server sets the final bill.
export const BookingFlowModal = ({ isOpen, onClose, basket = {}, onSetKg, activeAddress, onChangeAddress, onConfirmOrder }) => {
  useEscape(isOpen, onClose);
  const { services } = useCatalog();
  const [slot, setSlot] = useState(null);
  const [coupon, setCoupon] = useState('');
  const [paymentMode, setPaymentMode] = useState('cod');
  const [notes, setNotes] = useState('');
  const [showExtras, setShowExtras] = useState(false);
  const [photos, setPhotos] = useState([]);           // { id, file, url } — uploaded after the order is saved
  const [placing, setPlacing] = useState(false);
  const fileRef = useRef(null);

  const lines = services.filter((s) => basket[s.id] > 0).map((s) => ({ svc: s, kg: basket[s.id] }));
  const others = services.filter((s) => !(basket[s.id] > 0));
  const totalKg = lines.reduce((a, l) => a + l.kg, 0);
  const items = useMemo(() => lines.map((l) => ({ service_id: l.svc.id, qty: l.kg })), [JSON.stringify(basket), services]); // eslint-disable-line react-hooks/exhaustive-deps
  const quote = usePriceQuote(items, coupon);

  if (!isOpen) return null;

  const addPhotos = (files) => {
    const next = Array.from(files || []).filter((f) => f.type.startsWith('image/')).slice(0, MAX_PHOTOS - photos.length)
      .map((file) => ({ id: `${Date.now()}-${Math.random()}`, file, url: URL.createObjectURL(file) }));
    setPhotos((p) => [...p, ...next]);
  };

  const canPlace = lines.length > 0 && slot && !quote.couponError && !placing;
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
      paymentMethod: paymentMode === 'online' ? 'Pay online (Razorpay)' : 'Pay on delivery (cash / UPI QR)',
      paymentMode,
      paymentStatus: 'Pending',
      landmark: a.landmark || '',
      customerPhone: a.phone || '',
      serviceItems: items,                       // the server prices these; the total above is a preview
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
      attachedPhotos: photos.map((p) => p.url),  // local previews only; the files are uploaded once the order exists
      photoFiles: photos.map((p) => p.file),
      steps: [
        { step: 0, label: 'Order placed', time: 'Just now', desc: 'Finding a rider for your pickup', done: true, active: true },
        { step: 1, label: 'Picked up', time: slotText(slot), desc: 'Weighed at your door', done: false },
        { step: 2, label: 'Washing', time: '', desc: '', done: false },
        { step: 3, label: 'Ready', time: '', desc: '', done: false },
        { step: 4, label: 'Out for delivery', time: '', desc: '', done: false },
        { step: 5, label: 'Delivered', time: '', desc: '', done: false }
      ]
    });
    setPlacing(false);
    onClose();
  };

  return (
    <div className="qc-sheet-back" onClick={onClose}>
      <motion.div
        className="qc-sheet"
        role="dialog"
        aria-label="Checkout"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="qc-sheet-head">
          <div>
            <h3>Checkout</h3>
            <p>{lines.length ? `${lines.length} ${lines.length === 1 ? 'service' : 'services'} · about ${totalKg} kg` : 'Your cart is empty'}</p>
          </div>
          <button type="button" className="qc-iconbtn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="qc-sheet-body">
          {/* Items */}
          <div className="qc-card">
            {lines.length === 0 ? (
              <div className="qc-empty">
                <b>Nothing in your cart yet</b>
                <p>Add a service to schedule a pickup.</p>
              </div>
            ) : lines.map(({ svc, kg }) => (
              <div key={svc.id} className="qc-line-item">
                <img src={svc.image} alt="" />
                <div style={{ minWidth: 0 }}>
                  <b>{svc.name}</b>
                  <span>₹{svc.unitPrice}/{svc.unit} · about {kg} kg</span>
                </div>
                <div className="qc-line-right">
                  <KgStepper kg={kg} onChange={(v) => onSetKg(svc.id, v)} />
                  <em>≈ ₹{Math.round(kg * svc.unitPrice)}</em>
                </div>
              </div>
            ))}
            {others.length > 0 && (
              <div className="qc-more">
                {others.map((s) => (
                  <button type="button" key={s.id} onClick={() => onSetKg(s.id, DEFAULT_KG)}><Plus size={13} /> {s.name} · ₹{s.unitPrice}/{s.unit}</button>
                ))}
              </div>
            )}
            {lines.length > 0 && <p className="qc-note">Weights are your estimate. The rider weighs everything at your door and you pay for the actual weight.</p>}
          </div>

          {/* Pickup window */}
          <div className="qc-card">
            <div className="qc-card-t"><Clock size={16} /> Pickup window<small>{slot ? slotText(slot) : ''}</small></div>
            <SlotPicker value={slot} onChange={setSlot} />
          </div>

          {/* Address */}
          <div className="qc-card">
            <button type="button" className="qc-row" onClick={onChangeAddress}>
              <span className="qc-row-ic"><MapPin size={17} /></span>
              <div style={{ minWidth: 0 }}>
                <b>Pickup from {activeAddress.label}</b>
                <span>{[activeAddress.flatBuilding, activeAddress.streetArea].filter(Boolean).join(', ')}</span>
              </div>
              <em>Change</em>
            </button>
          </div>

          {/* Notes & photos (optional) */}
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
                  {photos.length < MAX_PHOTOS && (
                    <button type="button" className="qc-photo-add" onClick={() => fileRef.current?.click()}><span><Camera size={16} /><br />Add</span></button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
                </div>
              </div>
            )}
          </div>

          {/* Coupon */}
          {quote.fromServer && (
            <div className="qc-card">
              <CouponBox applied={coupon} onApply={setCoupon} quote={quote} enabled />
            </div>
          )}

          {/* Bill */}
          {lines.length > 0 && (
            <div className="qc-card">
              <div className="qc-card-t"><Tag size={16} /> Bill details</div>
              <div className="qc-bill">
                <div><span>Items (about {totalKg} kg)</span><span>₹{quote.subtotal}</span></div>
                <div><span>Pickup & delivery</span><span className="free">Free</span></div>
                {quote.discount > 0 && <div className="save"><span>Discount</span><span>−₹{quote.discount}</span></div>}
                {quote.total > quote.subtotal - quote.discount && <div><span>Minimum order top-up</span><span>₹{quote.total - (quote.subtotal - quote.discount)}</span></div>}
                <div className="total"><span>Estimated total</span><span>₹{quote.total}</span></div>
              </div>
            </div>
          )}

          {/* Payment */}
          <div className="qc-card">
            <div className="qc-card-t">Payment</div>
            <PaymentChoice value={paymentMode} onChange={setPaymentMode} onlineEnabled={isBackendConfigured} />
          </div>
        </div>

        <div className="qc-sheet-foot">
          <div className="qc-foot-l">
            <b>₹{lines.length ? quote.total : 0}</b>
            <span>{paymentMode === 'online' ? 'Estimated · pay online' : 'Estimated · pay after delivery'}</span>
          </div>
          <button type="button" className="qc-primary" disabled={!canPlace} onClick={place}>
            {placing ? 'Placing…' : !lines.length ? 'Add a service' : !slot ? 'Pick a slot' : 'Place order'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
