import React, { useState, useMemo } from 'react';
import { usePriceQuote } from '../../hooks/usePriceQuote';
import { slotText } from '../../hooks/useSlots';
import { SlotPicker } from './SlotPicker';
import { CouponBox } from './CouponBox';
import { isBackendConfigured } from '../../lib/supabase';
import { PaymentChoice } from './PaymentChoice';
import { 
  X, 
  MapPin, 
  Plus, 
  Minus, 
  Clock, 
  ArrowRight, 
  ShieldCheck, 
  Tag 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export const SwiggyCartDrawer = ({ 
  isOpen, 
  onClose, 
  cartItems, 
  onAddToCart, 
  onRemoveFromCart, 
  activeAddress, 
  onConfirmOrder 
}) => {
  const [paymentMode, setPaymentMode] = useState('cod');
  const [slot, setSlot] = useState(null);
  const [coupon, setCoupon] = useState('');
  const cartLines = useMemo(() => cartItems.map(i => ({ service_id: i.id, qty: i.quantity })), [cartItems]);
  const quote = usePriceQuote(cartLines, coupon);
  const [specialNotes, setSpecialNotes] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);

  if (!isOpen) return null;

  const itemsSubtotal = quote.subtotal;
  const goldDiscount = quote.discount;
  const finalTotal = quote.total;

  const handlePlaceOrder = () => {
    setIsPlacing(true);

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
      const newOrder = {
        orderId: `PSK-${Math.floor(10000 + Math.random() * 90000)}`,
        status: 'active',
        serviceName: cartItems.map(i => i.name).join(', '),
        serviceCategory: cartItems[0]?.id || 'wash-iron',
        laundromatName: 'Poshak Care Facility',
        laundromatArea: 'Direct Doorstep Hub',
        itemsCount: cartItems.reduce((acc, i) => acc + i.quantity, 0),

        weightKg: (cartItems.reduce((acc, i) => acc + i.quantity, 0) * 1.5).toFixed(1),
        totalAmount: finalTotal,
        paymentMethod: paymentMode === 'online' ? 'Pay online (Razorpay)' : 'Pay on delivery (cash / UPI QR)',
        paymentMode,
        paymentStatus: 'Pending',
        landmark: activeAddress.landmark || '',
        customerPhone: activeAddress.phone || '',
        serviceItems: cartItems.map(i => ({ service_id: i.id, qty: i.quantity })),
        pickupSlot: slotText(slot),
        pickupDate: slot?.date,
        pickupWindow: slot?.win,
        couponCode: coupon || null,
        deliveryEstimate: 'Tomorrow by 06:00 PM',
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
        specialInstructions: specialNotes || 'Hypoallergenic soft RO wash. Handled with care.',
        steps: [
          { step: 0, label: 'Order Confirmed', time: 'Just now', desc: 'Partner assigned & tamper-safe bag generated', done: true, active: true },
          { step: 1, label: 'Captain Pickup', time: slotText(slot).split(' - ')[0], desc: 'Digital doorstep weigh-in & tamper seal', done: false },
          { step: 2, label: 'RO Soft Wash & Sanitization', time: 'Pending', desc: 'Zero shrinkage & color lock cycle', done: false },
          { step: 3, label: 'Steam Pressing & Finishing', time: 'Pending', desc: 'Boiler steam press on wooden hangers', done: false },
          { step: 4, label: 'Out for Delivery', time: 'Pending', desc: 'Captain on route to your doorstep', done: false },
          { step: 5, label: 'Delivered', time: 'Pending', desc: 'Fresh crisp garments returned', done: false }
        ],
        itemsList: cartItems.map(item => ({
          name: `${item.name} (${item.quantity} ${item.unit})`,
          count: item.quantity,
          type: item.unit
        }))
      };

      onConfirmOrder(newOrder);
      setIsPlacing(false);
      onClose();
    }, 400);
  };

  return (
    <div className="swiggy-cart-modal-backdrop" onClick={onClose}>
      <motion.div 
        className="swiggy-cart-sheet"
        onClick={(e) => e.stopPropagation()}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        {/* Cart Header */}
        <div className="cart-sheet-header">
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0a0a0a' }}>
              Your Laundry Cart
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#686b78' }}>
              {cartItems.reduce((acc, i) => acc + i.quantity, 0)} items added
            </span>
          </div>

          <button 
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#f1f2f4',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Cart Body */}
        <div className="cart-sheet-body">
          {/* 1. Delivery Address Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #ebebeb',
            borderRadius: '16px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <MapPin size={20} color="#fa5929" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#111' }}>
                Pickup from {activeAddress.label}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#666', lineHeight: 1.3 }}>
                {activeAddress.flatBuilding}, {activeAddress.streetArea}
              </div>
            </div>
          </div>

          {/* 2. Itemized Items List */}
          <div className="cart-items-box">
            {cartItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#888' }}>
                Your cart is empty. Add a service to get started!
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} className="cart-item-row">
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#1a1a1a' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#666' }}>
                      {item.price} • {item.turnaround}
                    </div>
                  </div>

                  {/* Quantity Counter */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      border: '1.5px solid #16a34a',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      background: '#ffffff'
                    }}>
                      <button 
                        onClick={() => onRemoveFromCart(item.id)}
                        style={{ padding: '0.25rem 0.5rem', border: 'none', background: 'transparent', color: '#16a34a', cursor: 'pointer' }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontWeight: '800', fontSize: '0.85rem', color: '#16a34a', minWidth: '18px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button 
                        onClick={() => onAddToCart(item)}
                        style={{ padding: '0.25rem 0.5rem', border: 'none', background: 'transparent', color: '#16a34a', cursor: 'pointer' }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <strong style={{ fontSize: '0.95rem', minWidth: '55px', textAlign: 'right' }}>
                      ₹{item.unitPrice * item.quantity}
                    </strong>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 3. Slot Selector */}
          <SlotPicker value={slot} onChange={setSlot} />

          {/* Special Notes */}
          <div>
            <input 
              type="text" 
              className="swiggy-search-input"
              placeholder="Any laundry notes (e.g. separate whites, ring bell)?"
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              style={{ background: '#f9fafb', border: '1px solid #e5e7eb', paddingLeft: '1rem' }}
            />
          </div>

          <CouponBox applied={coupon} onApply={setCoupon} quote={quote} enabled={quote.fromServer} />

          {/* 4. Bill Details */}
          <div className="cart-bill-card">
            <div style={{ fontSize: '0.84rem', fontWeight: '800', color: '#111', marginBottom: '0.75rem' }}>
              Bill Details
            </div>
            <div className="bill-line">
              <span>Item Total</span>
              <span>₹{itemsSubtotal}</span>
            </div>
            <div className="bill-line">
              <span>Doorstep Pickup & Delivery</span>
              <span style={{ color: '#16a34a', fontWeight: '700' }}>
                <strike style={{ color: '#999', marginRight: '0.3rem' }}>₹49</strike> FREE
              </span>
            </div>
            {goldDiscount > 0 && (
              <div className="bill-line" style={{ color: '#16a34a' }}>
                <span>Discount</span>
                <span>-₹{goldDiscount}</span>
              </div>
            )}
            <div className="bill-line to-pay">
              <span>TO PAY</span>
              <span>₹{finalTotal}</span>
            </div>
          </div>

          <PaymentChoice value={paymentMode} onChange={setPaymentMode} onlineEnabled={isBackendConfigured} />

          {/* Big Orange Submit Button */}
          <button 
            className="swiggy-place-order-btn"
            disabled={cartItems.length === 0 || isPlacing || !slot || Boolean(quote.couponError)}
            onClick={handlePlaceOrder}
          >
            <span>{isPlacing ? 'Assigning Rider...' : `Place Pickup Order • ₹${finalTotal}`}</span>
            <ArrowRight size={17} />
          </button>

          <div style={{ fontSize: '0.72rem', color: '#888', textAlign: 'center', lineHeight: 1.4 }}>
            Zero advance payment. Pay conveniently via UPI or cash upon doorstep handover.
          </div>
        </div>
      </motion.div>
    </div>
  );
};
