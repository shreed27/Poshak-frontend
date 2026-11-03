import React, { useState } from 'react';
import { X, Plus, Minus, ArrowRight, MapPin, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export const MobileCartSheet = ({ 
  isOpen, 
  onClose, 
  cartItems, 
  onAddToCart, 
  onRemoveFromCart, 
  activeAddress, 
  onConfirmOrder 
}) => {
  const [selectedSlot, setSelectedSlot] = useState('Today, 6:00 PM - 8:00 PM');
  const [isPlacing, setIsPlacing] = useState(false);

  if (!isOpen) return null;

  const itemsSubtotal = cartItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  const goldDiscount = Math.round(itemsSubtotal * 0.2); // 20% member discount
  const finalTotal = Math.max(0, itemsSubtotal - goldDiscount);

  const handlePlaceOrder = () => {
    setIsPlacing(true);

    try {
      confetti({
        particleCount: 100,
        spread: 70,
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
        laundromatName: 'The White Collar & Co.',
        laundromatArea: 'Koramangala 4th Block',
        itemsCount: cartItems.reduce((acc, i) => acc + i.quantity, 0),
        weightKg: (cartItems.reduce((acc, i) => acc + i.quantity, 0) * 1.5).toFixed(1),
        totalAmount: finalTotal,
        paymentMethod: 'Pay on Delivery (UPI/Cash)',
        paymentStatus: 'Pending Delivery',
        pickupSlot: selectedSlot,
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
        pickupAddress: `${activeAddress.flatBuilding}, ${activeAddress.streetArea}, Bengaluru`,
        specialInstructions: 'Hypoallergenic soft RO water wash.',
        steps: [
          { step: 0, label: 'Order Confirmed', time: 'Just now', desc: 'Partner assigned & tamper-safe bag generated', done: true, active: true },
          { step: 1, label: 'Captain Pickup', time: selectedSlot.split(' - ')[0], desc: 'Digital doorstep weigh-in & tamper seal', done: false },
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
    <div className="mobile-bottom-sheet-backdrop" onClick={onClose}>
      <motion.div 
        className="mobile-bottom-sheet-card"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
      >
        <div className="sheet-handle-pill"></div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111' }}>
              Your Laundry Hamper
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#686b78' }}>
              {cartItems.reduce((acc, i) => acc + i.quantity, 0)} items added
            </span>
          </div>

          <button 
            onClick={onClose}
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f2f4', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Address Card */}
        <div style={{
          background: '#f8f9fa',
          borderRadius: '16px',
          padding: '0.85rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          marginBottom: '1rem'
        }}>
          <MapPin size={18} color="#fa5929" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '800', fontSize: '0.84rem' }}>Pickup: {activeAddress.label}</div>
            <div style={{ fontSize: '0.74rem', color: '#666' }}>{activeAddress.flatBuilding}, {activeAddress.streetArea}</div>
          </div>
        </div>

        {/* Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
          {cartItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#888' }}>
              Your hamper is empty. Add a service to schedule pickup.
            </div>
          ) : (
            cartItems.map((item) => (
              <div 
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid #f0f0f0'
                }}
              >
                <div>
                  <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#111' }}>{item.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#777' }}>{item.price}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#f1f2f4', borderRadius: '9999px', padding: '0.2rem' }}>
                    <button 
                      onClick={() => onRemoveFromCart(item.id)}
                      style={{ width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Minus size={11} />
                    </button>
                    <span style={{ fontWeight: '800', fontSize: '0.82rem', minWidth: '22px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button 
                      onClick={() => onAddToCart(item)}
                      style={{ width: '24px', height: '24px', borderRadius: '50%', border: 'none', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                  <strong style={{ fontSize: '0.92rem', minWidth: '50px', textAlign: 'right' }}>
                    ₹{item.unitPrice * item.quantity}
                  </strong>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Slot Selection */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: '800', marginBottom: '0.45rem' }}>Pickup Window</div>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            {['Today, 6:00 PM - 8:00 PM', 'Tomorrow, 8:00 AM - 10:00 AM', 'Tomorrow, 2:00 PM - 4:00 PM'].map((slot) => (
              <button
                key={slot}
                onClick={() => setSelectedSlot(slot)}
                style={{
                  flex: 1,
                  padding: '0.55rem',
                  borderRadius: '12px',
                  border: '1.5px solid',
                  borderColor: selectedSlot === slot ? '#0a0a0a' : '#e5e7eb',
                  background: selectedSlot === slot ? '#0a0a0a' : '#ffffff',
                  color: selectedSlot === slot ? '#ffffff' : '#444',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>

        {/* Bill Summary */}
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#666', marginBottom: '0.35rem' }}>
            <span>Item Total</span>
            <span>₹{itemsSubtotal}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#16a34a', marginBottom: '0.35rem' }}>
            <span>Gold Member Discount (20%)</span>
            <span>-₹{goldDiscount}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#16a34a', marginBottom: '0.5rem' }}>
            <span>Doorstep Pickup & Delivery</span>
            <span>FREE</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: '900', color: '#111', borderTop: '1.5px solid #111', paddingTop: '0.65rem' }}>
            <span>TO PAY</span>
            <span>₹{finalTotal}</span>
          </div>
        </div>

        {/* Confirm Button */}
        <button 
          className="hero-primary-btn"
          disabled={cartItems.length === 0 || isPlacing}
          onClick={handlePlaceOrder}
          style={{ marginBottom: 0 }}
        >
          <span>{isPlacing ? 'Confirming with Hub...' : `Confirm Doorstep Pickup • ₹${finalTotal}`}</span>
          <ArrowRight size={16} />
        </button>
      </motion.div>
    </div>
  );
};
