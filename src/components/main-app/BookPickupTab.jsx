import React, { useState } from 'react';
import { 
  Sparkles, 
  Clock, 
  MapPin, 
  Calendar, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Plus, 
  Minus, 
  Tag, 
  Wallet,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QUICK_SERVICES, TIME_SLOTS, PROMO_CODES } from './MainAppData';

export const BookPickupTab = ({ 
  user, 
  activeAddress, 
  walletBalance, 
  onCreateNewOrder, 
  selectedServicePreload,
  onNavigateToTab 
}) => {
  // Booking Form State
  const [selectedService, setSelectedService] = useState(
    selectedServicePreload || QUICK_SERVICES[1] // Default Wash & Steam Iron
  );
  const [quantity, setQuantity] = useState(4); // 4kg or 4 pcs
  const [selectedDate, setSelectedDate] = useState('Today (Express)');
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[2]); // Afternoon
  const [starchLevel, setStarchLevel] = useState('Mild Starch');
  const [detergentType, setDetergentType] = useState('Gentle Bio-Enzymes (RO Water)');
  const [packagingType, setPackagingType] = useState('Wooden Hangers (Steam Press)');
  const [doorstepNotes, setDoorstepNotes] = useState('');
  const [paymentChoice, setPaymentChoice] = useState('pod'); // 'pod' | 'wallet'
  
  // Promo code
  const [promoInput, setPromoInput] = useState('POSHAKGOLD');
  const [appliedPromo, setAppliedPromo] = useState(PROMO_CODES[0]);
  const [promoMessage, setPromoMessage] = useState('Poshak Gold 20% discount applied!');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Price calculations
  const baseSubtotal = selectedService.unitPrice * quantity;
  let discountAmount = 0;
  if (appliedPromo) {
    if (appliedPromo.type === 'percent') {
      discountAmount = Math.round((baseSubtotal * appliedPromo.discount) / 100);
    } else if (appliedPromo.type === 'flat') {
      discountAmount = Math.min(baseSubtotal, appliedPromo.discount);
    }
  }
  const deliveryFee = 0; // Free for Gold members
  const finalTotal = Math.max(0, baseSubtotal - discountAmount + deliveryFee);

  const handleApplyPromo = (e) => {
    e.preventDefault();
    const found = PROMO_CODES.find(p => p.code.toLowerCase() === promoInput.trim().toLowerCase());
    if (found) {
      setAppliedPromo(found);
      setPromoMessage(`Code ${found.code} applied: ${found.desc}`);
    } else {
      setAppliedPromo(null);
      setPromoMessage('Invalid coupon code. Try POSHAKGOLD or BENGALURU150');
    }
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    setTimeout(() => {
      const orderRef = `PSK-${Math.floor(10000 + Math.random() * 90000)}`;
      const newOrder = {
        orderId: orderRef,
        status: 'active',
        serviceName: selectedService.name,
        serviceCategory: selectedService.id,
        laundromatName: 'The White Collar & Co.',
        laundromatArea: 'Koramangala 4th Block',
        itemsCount: Math.round(quantity * 2),
        weightKg: selectedService.unit === 'kg' ? quantity : (quantity * 0.4).toFixed(1),
        totalAmount: finalTotal,
        paymentMethod: paymentChoice === 'wallet' ? 'Poshak Wallet' : 'Pay on Delivery (UPI/Cash)',
        paymentStatus: paymentChoice === 'wallet' ? 'Paid via Wallet' : 'Pending Delivery',
        pickupSlot: `${selectedDate}, ${selectedSlot.time}`,
        deliveryEstimate: selectedService.id === 'express-6h' ? 'Today, in 6 Hours' : 'Tomorrow by 06:00 PM',
        placedAt: 'Just now',
        currentStep: 0,
        pickupOtp: `${Math.floor(1000 + Math.random() * 9000)}`,
        deliveryOtp: `${Math.floor(1000 + Math.random() * 9000)}`,
        rider: {
          name: 'Vikram Singh',
          phone: '+91 98765 43210',
          vehicle: 'Poshak EV-12 (KA-01-EQ-9812)',
          rating: '4.9 ★',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
        },
        pickupAddress: `${activeAddress.flatBuilding}, ${activeAddress.streetArea}, ${activeAddress.city} - ${activeAddress.pincode}`,
        specialInstructions: `${starchLevel}, ${detergentType}, ${packagingType}. ${doorstepNotes}`,
        steps: [
          { step: 0, label: 'Order Confirmed', time: 'Just now', desc: 'Partner assigned & digital hamper bag generated', done: true, active: true },
          { step: 1, label: 'Captain Pickup', time: selectedSlot.time.split(' - ')[0], desc: 'Doorstep weigh-in with digital tamper lock scale', done: false },
          { step: 2, label: 'RO Soft Wash & Sanitization', time: 'Pending', desc: 'Hypoallergenic bio-enzymes & zero color bleed cycle', done: false },
          { step: 3, label: 'Italian Steam Pressing', time: 'Pending', desc: 'Vacuum boiler steam press on wooden hangers', done: false },
          { step: 4, label: 'Out for Delivery', time: 'Pending', desc: 'Captain on route to doorstep', done: false },
          { step: 5, label: 'Delivered Fresh & Crispy', time: 'Pending', desc: 'Fresh wardrobe ready for wear!', done: false }
        ],
        itemsList: [
          { name: `${selectedService.name} (${quantity} ${selectedService.unit})`, count: quantity, type: selectedService.unit }
        ]
      };

      onCreateNewOrder(newOrder, paymentChoice === 'wallet' ? finalTotal : 0);
      setIsSubmitting(false);
      onNavigateToTab('orders');
    }, 400);
  };

  return (
    <div className="booking-engine-wrapper">
      <div className="booking-split-grid">
        {/* Left Column: Multi-step Pickup Form */}
        <form onSubmit={handleBookingSubmit} className="booking-form-panel">
          {/* Step 1: Select Care Service */}
          <div className="booking-fieldset">
            <div className="fieldset-legend">
              <Sparkles size={18} color="#fa5929" />
              <span>1. Choose Service & Garment Quantity</span>
            </div>

            <div className="booking-services-picker-grid">
              {QUICK_SERVICES.map((svc) => (
                <div 
                  key={svc.id}
                  className={`service-radio-card ${selectedService.id === svc.id ? 'selected' : ''}`}
                  onClick={() => setSelectedService(svc)}
                >
                  <div className="radio-card-top">
                    <span className="radio-title">{svc.name}</span>
                    <span className="radio-price">{svc.price}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#666', lineHeight: 1.35 }}>
                    {svc.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* Quantity / Weight Stepper */}
            <div className="weight-counter-box">
              <div className="weight-info-col">
                <h4>
                  Estimated {selectedService.unit === 'kg' ? 'Bag Weight' : 'Items Count'}
                </h4>
                <p>
                  {selectedService.unit === 'kg' 
                    ? 'Our rider brings a digital scale to verify the exact weight at your doorstep.'
                    : 'Count of pieces (suits, shoes, sarees, or duvets) for this batch.'}
                </p>
              </div>

              <div className="counter-btns-group">
                <button 
                  type="button" 
                  className="counter-btn"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <span className="counter-display-value">
                  {quantity} {selectedService.unit}
                </span>
                <button 
                  type="button" 
                  className="counter-btn"
                  onClick={() => setQuantity(quantity + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Pickup Scheduling */}
          <div className="booking-fieldset">
            <div className="fieldset-legend">
              <Calendar size={18} color="#fa5929" />
              <span>2. Select Pickup Date & Slot</span>
            </div>

            {/* Date Selector */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {['Today (Express)', 'Tomorrow', 'Day After'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    border: '1.5px solid',
                    borderColor: selectedDate === d ? '#0a0a0a' : '#e5e7eb',
                    background: selectedDate === d ? '#0a0a0a' : '#f9fafb',
                    color: selectedDate === d ? '#ffffff' : '#333',
                    cursor: 'pointer'
                  }}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Time Slots */}
            <div className="slots-chips-grid">
              {TIME_SLOTS.map((slot) => (
                <div 
                  key={slot.id}
                  className={`slot-chip-btn ${selectedSlot.id === slot.id ? 'selected' : ''}`}
                  onClick={() => setSelectedSlot(slot)}
                >
                  <span className="slot-time-text">{slot.time}</span>
                  <span className="slot-badge-sub">{slot.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Fabric Preferences & Instructions */}
          <div className="booking-fieldset">
            <div className="fieldset-legend">
              <ShieldCheck size={18} color="#fa5929" />
              <span>3. Fabric Care Preferences</span>
            </div>

            <div className="prefs-row-grid">
              <div className="pref-input-group">
                <label>Starch Finishing</label>
                <select 
                  className="pref-select-field"
                  value={starchLevel} 
                  onChange={(e) => setStarchLevel(e.target.value)}
                >
                  <option>No Starch (Soft Feel)</option>
                  <option>Mild Starch (Natural Crisp)</option>
                  <option>Medium Starch (Crisp Workwear)</option>
                  <option>Stiff Hotel Starch (Heavy Cotton)</option>
                </select>
              </div>

              <div className="pref-input-group">
                <label>Detergent & Softener</label>
                <select 
                  className="pref-select-field"
                  value={detergentType} 
                  onChange={(e) => setDetergentType(e.target.value)}
                >
                  <option>Gentle Bio-Enzymes (RO Water)</option>
                  <option>Hypoallergenic & Baby Safe</option>
                  <option>Fragrance-Free Sensitive</option>
                  <option>Alpine Lavender Infusion</option>
                </select>
              </div>

              <div className="pref-input-group">
                <label>Packaging Delivery</label>
                <select 
                  className="pref-select-field"
                  value={packagingType} 
                  onChange={(e) => setPackagingType(e.target.value)}
                >
                  <option>Wooden Hangers (Steam Press)</option>
                  <option>Vacuum Compact Fold</option>
                  <option>Eco Cotton Fabric Hamper</option>
                </select>
              </div>
            </div>

            {/* Doorstep notes */}
            <div style={{ marginTop: '0.5rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#444', display: 'block', marginBottom: '0.4rem' }}>
                Special Notes for Rider & Master Washer (Optional)
              </label>
              <textarea 
                className="pref-select-field"
                rows={2}
                placeholder="e.g. Separate white linen shirt from colored towels; Gate pass code #402"
                value={doorstepNotes}
                onChange={(e) => setDoorstepNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Step 4: Collection Address Preview */}
          <div style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(250, 89, 41, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fa5929'
              }}>
                <MapPin size={18} />
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#111' }}>
                  Pickup from {activeAddress.label}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#666' }}>
                  {activeAddress.flatBuilding}, {activeAddress.streetArea}, Bengaluru
                </div>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => onNavigateToTab('settings')}
              style={{
                fontSize: '0.82rem',
                fontWeight: '700',
                color: '#fa5929',
                background: 'transparent',
                cursor: 'pointer'
              }}
            >
              Change Address
            </button>
          </div>
        </form>

        {/* Right Column: Sticky Live Bill & Checkout Card */}
        <div className="booking-summary-sticky-card">
          <div className="summary-card-title">
            <span>Pickup Summary</span>
            <span style={{ fontSize: '0.76rem', color: '#fa5929', fontWeight: '700' }}>
              {selectedDate}
            </span>
          </div>

          <div className="summary-items-list">
            <div className="summary-row">
              <span>{selectedService.name}</span>
              <span>₹{selectedService.unitPrice} × {quantity} {selectedService.unit}</span>
            </div>

            <div className="summary-row">
              <span>Base Subtotal</span>
              <span>₹{baseSubtotal}</span>
            </div>

            {appliedPromo && (
              <div className="summary-row discount">
                <span>Coupon ({appliedPromo.code})</span>
                <span>-₹{discountAmount}</span>
              </div>
            )}

            <div className="summary-row">
              <span>Doorstep Pickup & Delivery</span>
              <span style={{ color: '#34d399', fontWeight: '700' }}>FREE (Gold Pass)</span>
            </div>

            <div className="summary-row total-row">
              <span>Final Total</span>
              <span style={{ color: '#ffffff' }}>₹{finalTotal}</span>
            </div>
          </div>

          {/* Promo Code Input */}
          <div style={{ margin: '1rem 0' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginBottom: '0.3rem' }}>
              Have a Promo Voucher?
            </div>
            <div className="promo-input-wrapper">
              <input 
                type="text" 
                className="promo-text-field"
                placeholder="PROMO CODE"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
              />
              <button type="button" className="promo-apply-btn" onClick={handleApplyPromo}>
                Apply
              </button>
            </div>
            {promoMessage && (
              <div style={{ fontSize: '0.72rem', color: appliedPromo ? '#34d399' : '#f87171' }}>
                {promoMessage}
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginBottom: '0.45rem' }}>
              Payment Method
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '10px',
                  background: paymentChoice === 'pod' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  fontSize: '0.82rem'
                }}
              >
                <input 
                  type="radio" 
                  name="paymentMode" 
                  checked={paymentChoice === 'pod'} 
                  onChange={() => setPaymentChoice('pod')}
                />
                <span>Pay on Delivery (UPI / Cash to Captain)</span>
              </label>

              <label 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '10px',
                  background: paymentChoice === 'wallet' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  fontSize: '0.82rem'
                }}
              >
                <input 
                  type="radio" 
                  name="paymentMode" 
                  checked={paymentChoice === 'wallet'} 
                  onChange={() => setPaymentChoice('wallet')}
                />
                <span>Poshak Wallet Balance (₹{walletBalance} available)</span>
              </label>
            </div>
          </div>

          {/* Final Submit Button */}
          <button 
            type="button"
            className="booking-confirm-submit-btn"
            onClick={handleBookingSubmit}
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'Confirming with Hub...' : 'Confirm Doorstep Pickup'}</span>
            <ArrowRight size={17} />
          </button>

          <div style={{
            fontSize: '0.72rem',
            color: 'rgba(255,255,255,0.6)',
            textAlign: 'center',
            marginTop: '0.85rem',
            lineHeight: 1.4
          }}>
            Zero advance charges. Covered under Poshak ₹5,000 Fabric Replacement Guarantee.
          </div>
        </div>
      </div>
    </div>
  );
};
