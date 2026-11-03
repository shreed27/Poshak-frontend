import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { usePriceQuote } from '../../hooks/usePriceQuote';
import { slotText } from '../../hooks/useSlots';
import { SlotPicker } from './SlotPicker';
import { CouponBox } from './CouponBox';
import { isBackendConfigured } from '../../lib/supabase';
import { PaymentChoice } from './PaymentChoice';
import { 
  X, 
  ArrowRight, 
  Check, 
  Camera, 
  Upload, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Plus, 
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export const BookingFlowModal = ({ 
  isOpen, 
  onClose, 
  selectedServiceIds = ['wash-iron'],
  onToggleService,
  activeAddress, 
  addresses, 
  onSelectAddress, 
  onConfirmOrder 
}) => {
  // Local state for active services in checkout
  const [activeServices, setActiveServices] = useState(
    selectedServiceIds.length > 0 ? selectedServiceIds : ['wash-iron']
  );

  useEffect(() => {
    if (selectedServiceIds && selectedServiceIds.length > 0) {
      setActiveServices(selectedServiceIds);
    }
  }, [selectedServiceIds]);

  // Expandable service toggle menu
  const [showAddServices, setShowAddServices] = useState(false);

  // Uploaded Photos & Care Notes
  const [uploadedPhotos, setUploadedPhotos] = useState([
    {
      id: 'sample-default-1',
      url: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=400&q=80',
      name: 'laundry_bag.jpg'
    }
  ]);
  const [loadWeightKg, setLoadWeightKg] = useState(4); // 4 kg
  const [specialNotes, setSpecialNotes] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Slot & Address
  const { services } = useCatalog();
  const [slot, setSlot] = useState(null);
  const [coupon, setCoupon] = useState('');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentMode, setPaymentMode] = useState('cod');

  const selectedServices = services.filter(s => activeServices.includes(s.id));
  const bookItems = useMemo(
    () => selectedServices.map(s => ({ service_id: s.id, qty: Number((loadWeightKg / Math.max(1, selectedServices.length)).toFixed(2)) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeServices, services, loadWeightKg]
  );
  const quote = usePriceQuote(bookItems, coupon);   // server-priced: rates, member discount, coupon, minimum charge

  if (!isOpen) return null;

  // Toggle service selection in modal
  const handleToggle = (svcId) => {
    let next;
    if (activeServices.includes(svcId)) {
      next = activeServices.length > 1 ? activeServices.filter(id => id !== svcId) : activeServices;
    } else {
      next = [...activeServices, svcId];
    }
    setActiveServices(next);
    if (onToggleService) {
      onToggleService(svcId);
    }
  };

  // Real File Upload
  const handleFiles = (files) => {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedPhotos(prev => [
          ...prev,
          {
            id: `photo-${Date.now()}-${Math.random()}`,
            url: e.target.result,
            name: file.name
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileInputChange = (e) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemovePhoto = (photoId) => {
    setUploadedPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  // 1-Click Sample Photo testing helper
  const handleAddSamplePhoto = () => {
    const samples = [
      'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=400&q=80'
    ];
    const randomUrl = samples[uploadedPhotos.length % samples.length];
    setUploadedPhotos(prev => [
      ...prev,
      {
        id: `sample-${Date.now()}`,
        url: randomUrl,
        name: `garment_${prev.length + 1}.jpg`
      }
    ]);
  };

  const goldDiscount = quote.discount;
  const finalTotal = quote.total;

  // Place Order handler
  const handlePlaceOrder = () => {
    setIsPlacingOrder(true);

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
        serviceName: selectedServices.map(s => s.name).join(' + '),
        serviceCategory: selectedServices[0]?.id || 'wash-iron',
        laundromatName: 'Poshak Care Facility',
        laundromatArea: 'Direct Doorstep Hub',
        itemsCount: Math.round(loadWeightKg * 2.5),
        weightKg: loadWeightKg.toFixed(1),
        totalAmount: finalTotal,
        paymentMethod: paymentMode === 'online' ? 'Pay online (Razorpay)' : 'Pay on delivery (cash / UPI QR)',
        paymentMode,
        paymentStatus: 'Pending',
        landmark: activeAddress.landmark || '',
        customerPhone: activeAddress.phone || '',
        // The server prices these; the customer's number above is only a preview.
        serviceItems: selectedServices.map(s => ({ service_id: s.id, qty: Number((loadWeightKg / selectedServices.length).toFixed(2)) })),
        pickupSlot: slotText(slot),
        pickupDate: slot?.date,
        pickupWindow: slot?.win,
        couponCode: coupon || null,
        deliveryEstimate: activeServices.includes('express-6h') 
          ? 'Today, within 6 Hours' 
          : 'Tomorrow by 06:00 PM',
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
        attachedPhotos: uploadedPhotos,
        steps: [
          { step: 0, label: 'Order Confirmed', time: 'Just now', desc: 'Partner assigned & tamper-safe bag generated', done: true, active: true },
          { step: 1, label: 'Captain Pickup', time: slotText(slot).split(' - ')[0], desc: 'Doorstep weigh-in with digital scale & photo verification', done: false },
          { step: 2, label: 'RO Soft Wash & Sanitization', time: 'Pending', desc: 'Zero shrinkage & color lock cycle', done: false },
          { step: 3, label: 'Steam Pressing & Finishing', time: 'Pending', desc: 'Boiler steam press on wooden hangers', done: false },
          { step: 4, label: 'Out for Delivery', time: 'Pending', desc: 'Captain on route to your doorstep', done: false },
          { step: 5, label: 'Delivered', time: 'Pending', desc: 'Fresh crisp garments returned', done: false }
        ]
      };

      onConfirmOrder(newOrder);
      setIsPlacingOrder(false);
      onClose();
    }, 450);
  };

  return (
    <div className="swiggy-cart-modal-backdrop" onClick={onClose} style={{ padding: '1rem', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div 
        className="booking-wizard-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
      >
        {/* =========================================================================
           STREAMLINED MODAL HEADER (Zero Hassle, Instant Checkout)
           ========================================================================= */}
        <div className="wizard-top-header">
          <div>
            <h3 style={{ fontSize: '1.18rem', fontWeight: '800', color: '#111', margin: 0 }}>
              Doorstep Pickup & Booking
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#686b78', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
              <ShieldCheck size={13} color="#16a34a" />
              <span>Zero Advance Payment • Digital Scale at Doorstep</span>
            </span>
          </div>

          <button 
            type="button"
            className="wizard-close-btn"
            onClick={onClose}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* =========================================================================
           UNIFIED SINGLE-SCREEN QUICK CHECKOUT BODY
           ========================================================================= */}
        <div className="wizard-step-body" style={{ maxHeight: 'calc(88vh - 140px)', overflowY: 'auto' }}>
          
          {/* 1. SELECTED SERVICES BAR & 1-TAP ADD MORE */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #fed7aa',
            borderRadius: '16px',
            padding: '1rem',
            marginBottom: '1.25rem',
            boxShadow: '0 2px 8px rgba(250, 89, 41, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#111' }}>
                Selected Services ({selectedServices.length})
              </div>
              <button
                type="button"
                onClick={() => setShowAddServices(!showAddServices)}
                style={{
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  color: '#ea580c',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  cursor: 'pointer'
                }}
              >
                <span>{showAddServices ? 'Done' : '+ Add / Modify Services'}</span>
                <ChevronDown size={13} style={{ transform: showAddServices ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
            </div>

            {/* Selected Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: showAddServices ? '0.85rem' : 0 }}>
              {selectedServices.map(svc => (
                <div 
                  key={svc.id}
                  style={{
                    background: '#fa5929',
                    color: '#ffffff',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    fontWeight: '800',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem'
                  }}
                >
                  <span>✓ {svc.name}</span>
                  <span style={{ opacity: 0.9, fontSize: '0.74rem', fontWeight: '700' }}>({svc.price})</span>
                </div>
              ))}
            </div>

            {/* Expandable Menu to Add other services in 1 click */}
            <AnimatePresence>
              {showAddServices && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden', paddingTop: '0.5rem', borderTop: '1px dashed #fed7aa' }}
                >
                  <p style={{ fontSize: '0.75rem', color: '#686b78', margin: '0 0 0.5rem' }}>
                    Tap any service below to add or remove it from this booking:
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                    {services.map(svc => {
                      const isSel = activeServices.includes(svc.id);
                      return (
                        <div
                          key={svc.id}
                          onClick={() => handleToggle(svc.id)}
                          style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: '10px',
                            border: '1.5px solid',
                            borderColor: isSel ? '#fa5929' : '#e5e7eb',
                            background: isSel ? '#fff7ed' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.78rem'
                          }}
                        >
                          <div>
                            <strong style={{ color: isSel ? '#ea580c' : '#111' }}>{svc.name}</strong>
                            <div style={{ color: '#686b78', fontSize: '0.72rem' }}>{svc.price}</div>
                          </div>
                          {isSel ? <Check size={14} color="#ea580c" strokeWidth={3} /> : <Plus size={14} color="#9ca3af" />}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 2. PICKUP WINDOW (live availability) */}
          <SlotPicker value={slot} onChange={setSlot} />

          {/* 3. PICKUP ADDRESS CARD */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #ebebeb',
            borderRadius: '14px',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <MapPin size={20} color="#fa5929" />
              <div>
                <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#111' }}>
                  Pickup Address: {activeAddress.label}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#686b78' }}>
                  {activeAddress.flatBuilding}, {activeAddress.streetArea}, {activeAddress.city} - {activeAddress.pincode}
                </div>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => setIsAddressModalOpen(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fa5929',
                fontSize: '0.8rem',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              Change
            </button>
          </div>

          {/* 4. CLOTHES PHOTOS (OPTIONAL & FRICTIONLESS) */}
          <div style={{
            background: '#f9fafb',
            border: '1px solid #ebebeb',
            borderRadius: '16px',
            padding: '1.15rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Camera size={16} color="#fa5929" />
                <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#111' }}>
                  Clothes Photos (Optional)
                </span>
              </div>
              <button 
                type="button"
                onClick={handleAddSamplePhoto}
                style={{
                  background: '#ffffff',
                  border: '1px solid #fed7aa',
                  color: '#ea580c',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  cursor: 'pointer'
                }}
              >
                + Add Sample Photo
              </button>
            </div>

            <p style={{ fontSize: '0.76rem', color: '#686b78', margin: '0 0 0.85rem', lineHeight: 1.35 }}>
              Upload photos of your clothes or specific stains. Our captain also weighs and inspects garments at your doorstep.
            </p>

            {/* Hidden Input */}
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*"
              multiple
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />

            {/* Thumbnails row */}
            <div className="uploaded-photos-grid" style={{ marginBottom: '0.85rem' }}>
              {uploadedPhotos.map((photo) => (
                <div key={photo.id} className="uploaded-photo-item" style={{ width: '74px', height: '74px' }}>
                  <img src={photo.url} alt={photo.name} />
                  <button 
                    type="button"
                    className="photo-delete-btn"
                    onClick={() => handleRemovePhoto(photo.id)}
                    title="Remove"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              <div 
                className="add-more-photos-box"
                style={{ width: '74px', height: '74px' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus size={16} />
                <span style={{ fontSize: '0.7rem' }}>Add Photo</span>
              </div>
            </div>

            {/* Weight Chips */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {[
                { kg: 3, label: '~3-4 kg (Light)' },
                { kg: 5, label: '~5-6 kg (Standard)' },
                { kg: 8, label: '~8+ kg (Family)' }
              ].map(opt => (
                <button
                  key={opt.kg}
                  type="button"
                  onClick={() => setLoadWeightKg(opt.kg)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '10px',
                    border: '1.5px solid',
                    borderColor: loadWeightKg === opt.kg ? '#fa5929' : '#e5e7eb',
                    background: loadWeightKg === opt.kg ? '#fff7ed' : '#ffffff',
                    color: loadWeightKg === opt.kg ? '#ea580c' : '#4b5563',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Notes input */}
            <input 
              type="text" 
              className="swiggy-search-input"
              placeholder="Special instructions (e.g. gentle wash for silk saree)..."
              value={specialNotes}
              onChange={(e) => setSpecialNotes(e.target.value)}
              style={{ background: '#ffffff', border: '1px solid #e5e7eb', paddingLeft: '0.85rem', fontSize: '0.8rem' }}
            />
          </div>

          <CouponBox applied={coupon} onApply={setCoupon} quote={quote} enabled={quote.fromServer} />

          {/* 5. BILL DETAILS & ZERO ADVANCE ASSURANCE */}
          <div className="cart-bill-card" style={{ background: '#ffffff', padding: '1.15rem', borderRadius: '16px', border: '1px solid #ebebeb', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.86rem', fontWeight: '800', color: '#111', marginBottom: '0.65rem' }}>
              Order Bill Estimate
            </div>
            <div className="bill-line">
              <span>Selected Services</span>
              <span>{selectedServices.map(s => s.name).join(', ')}</span>
            </div>
            <div className="bill-line">
              <span>Estimated Weight</span>
              <span>~{loadWeightKg} kg ({Math.round(loadWeightKg * 2.5)} garments)</span>
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
              <span>ESTIMATED TO PAY</span>
              <span>₹{finalTotal}</span>
            </div>
          </div>

          <PaymentChoice value={paymentMode} onChange={setPaymentMode} onlineEnabled={isBackendConfigured} />

          {/* Zero Advance Digital Scale Assurance */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            background: 'rgba(22, 163, 74, 0.08)',
            border: '1px solid rgba(22, 163, 74, 0.2)',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            fontSize: '0.78rem',
            color: '#15803d',
            lineHeight: 1.4
          }}>
            <ShieldCheck size={18} style={{ flexShrink: 0 }} />
            <span>
              <strong>Zero Advance Payment:</strong> Captain Vikram brings a certified digital scale to weigh your garments and provides an OTP sealed bag receipt at your doorstep. Pay on delivery.
            </span>
          </div>

        </div>

        {/* =========================================================================
           STICKY BOTTOM CONFIRM ACTION BUTTON (1-Click Instant Booking)
           ========================================================================= */}
        <div className="wizard-bottom-actions" style={{ padding: '0.85rem 1.5rem', background: '#ffffff', borderTop: '1px solid #f0f0f0' }}>
          <button 
            type="button"
            className="wizard-primary-next-btn"
            onClick={handlePlaceOrder}
            disabled={isPlacingOrder || !slot || Boolean(quote.couponError)}
            style={{
              width: '100%',
              justifyContent: 'center',
              background: '#fa5929',
              padding: '0.95rem 1.5rem',
              fontSize: '1rem',
              boxShadow: '0 6px 20px rgba(250, 89, 41, 0.35)'
            }}
          >
            <span>{isPlacingOrder ? 'Confirming Booking...' : `Confirm Doorstep Booking • ₹${finalTotal}`}</span>
            <ArrowRight size={17} />
          </button>
        </div>

        {/* Address Switcher Sub-Modal */}
        <AnimatePresence>
          {isAddressModalOpen && (
            <div 
              className="swiggy-cart-modal-backdrop"
              onClick={() => setIsAddressModalOpen(false)}
              style={{ justifyContent: 'center', alignItems: 'center', padding: '1rem', zIndex: 1100 }}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: 'min(100%, 380px)',
                  background: '#ffffff',
                  borderRadius: '24px',
                  padding: '1.5rem',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '800' }}>Select Delivery Address</h3>
                  <button 
                    onClick={() => setIsAddressModalOpen(false)}
                    style={{ background: '#f0f0f0', border: 'none', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <X size={15} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {addresses.map((addr) => (
                    <div 
                      key={addr.id}
                      onClick={() => {
                        onSelectAddress(addr);
                        setIsAddressModalOpen(false);
                      }}
                      style={{
                        border: '1.5px solid',
                        borderColor: activeAddress.id === addr.id ? '#fa5929' : '#e5e7eb',
                        background: activeAddress.id === addr.id ? 'rgba(250, 89, 41, 0.04)' : '#ffffff',
                        borderRadius: '14px',
                        padding: '0.85rem 1rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#111' }}>
                          {addr.label}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '0.15rem' }}>
                          {addr.flatBuilding}, {addr.streetArea}
                        </div>
                      </div>
                      {activeAddress.id === addr.id && <Check size={18} color="#fa5929" />}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
