import React, { useState } from 'react';
import { 
  Package, 
  Clock, 
  MapPin, 
  Check, 
  RotateCw, 
  Phone, 
  Star, 
  ArrowRight, 
  FileText, 
  ShieldCheck, 
  Sparkles,
  ShoppingBag,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const OrdersTrackerTab = ({ 
  orders, 
  onAdvanceOrderStep, 
  onReorder, 
  onNavigateToTab 
}) => {
  const [filterMode, setFilterMode] = useState('active'); // 'active' | 'past'
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);
  const [ratingOrder, setRatingOrder] = useState(null);
  const [userRating, setUserRating] = useState(5);
  const [reviewNote, setReviewNote] = useState('');
  const [ratingSuccess, setRatingSuccess] = useState(false);

  const activeOrders = orders.filter(o => o.status === 'active');
  const pastOrders = orders.filter(o => o.status === 'completed');

  const handleRateSubmit = (e) => {
    e.preventDefault();
    setRatingSuccess(true);
    setTimeout(() => {
      setRatingOrder(null);
      setRatingSuccess(false);
      setReviewNote('');
    }, 1200);
  };

  return (
    <div className="orders-tracker-tab-content">
      {/* Top Filter Buttons & Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h2 className="section-main-heading">Orders & Live Garment Tracker</h2>
          <p style={{ fontSize: '0.88rem', color: '#666', marginTop: '0.2rem' }}>
            Follow your hamper milestones from doorstep weigh-in to pristine delivery
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{
          display: 'flex',
          background: '#e9ecef',
          padding: '0.3rem',
          borderRadius: '9999px',
          gap: '0.25rem'
        }}>
          <button 
            onClick={() => setFilterMode('active')}
            style={{
              padding: '0.45rem 1.15rem',
              borderRadius: '9999px',
              fontSize: '0.84rem',
              fontWeight: '700',
              border: 'none',
              background: filterMode === 'active' ? '#0a0a0a' : 'transparent',
              color: filterMode === 'active' ? '#ffffff' : '#555',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>Active Orders</span>
            <span style={{
              background: filterMode === 'active' ? '#fa5929' : 'rgba(10,10,10,0.15)',
              color: '#ffffff',
              fontSize: '0.68rem',
              padding: '0.1rem 0.4rem',
              borderRadius: '9999px'
            }}>
              {activeOrders.length}
            </span>
          </button>

          <button 
            onClick={() => setFilterMode('past')}
            style={{
              padding: '0.45rem 1.15rem',
              borderRadius: '9999px',
              fontSize: '0.84rem',
              fontWeight: '700',
              border: 'none',
              background: filterMode === 'past' ? '#0a0a0a' : 'transparent',
              color: filterMode === 'past' ? '#ffffff' : '#555',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Past History ({pastOrders.length})
          </button>
        </div>
      </div>

      {/* VIEW 1: ACTIVE ORDERS */}
      {filterMode === 'active' && (
        <div>
          {activeOrders.length === 0 ? (
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              border: '1px solid rgba(10,10,10,0.08)',
              padding: '3rem 2rem',
              textAlign: 'center',
              maxWidth: '540px',
              margin: '2rem auto'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#f4f5f7',
                color: '#fa5929',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem'
              }}>
                <ShoppingBag size={28} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                No active laundry bags right now
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#666', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                Your wardrobe is fresh and up-to-date! Book a quick pickup in 30 seconds for tomorrow morning.
              </p>
              <button 
                onClick={() => onNavigateToTab('book')}
                style={{
                  background: '#fa5929',
                  color: '#ffffff',
                  padding: '0.75rem 1.75rem',
                  borderRadius: '9999px',
                  fontWeight: '700',
                  fontSize: '0.92rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Schedule Pickup Now
              </button>
            </div>
          ) : (
            activeOrders.map((order) => (
              <motion.div 
                key={order.orderId}
                className="live-order-spotlight-card"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: '2rem' }}
              >
                {/* Header Status & Hub */}
                <div className="spotlight-top-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div className="spotlight-status-pill">
                      <span className="live-pulse-dot"></span>
                      <span>{order.steps[order.currentStep]?.label || 'In Progress'}</span>
                    </div>
                    <span style={{ fontSize: '0.82rem', color: '#777' }}>
                      Placed {order.placedAt}
                    </span>
                  </div>

                  <div className="spotlight-eta-badge">
                    <Clock size={16} color="#fa5929" />
                    <span>Est. Delivery: <strong>{order.deliveryEstimate}</strong></span>
                  </div>
                </div>

                <div className="spotlight-order-meta">
                  <div>
                    <div className="meta-order-id">
                      Order #{order.orderId} • <span style={{ color: '#fa5929' }}>{order.serviceName}</span>
                    </div>
                    <div className="meta-service-name">
                      Assigned Studio: <strong>{order.laundromatName}</strong> ({order.laundromatArea})
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>Billed Amount</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0a0a0a' }}>
                      ₹{order.totalAmount}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '700' }}>
                      {order.paymentMethod}
                    </div>
                  </div>
                </div>

                {/* 6-Step Visual Stepper */}
                <div className="spotlight-stepper-container">
                  <div className="spotlight-stepper-track">
                    {order.steps.map((st, idx) => {
                      const isDone = idx < order.currentStep;
                      const isActive = idx === order.currentStep;
                      return (
                        <div 
                          key={idx} 
                          className={`spotlight-step-item ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
                        >
                          <div className="step-node-bubble">
                            {isDone ? <Check size={18} strokeWidth={2.5} /> : idx + 1}
                          </div>
                          <div className="step-node-label">{st.label}</div>
                          <div className="step-node-time">{st.time || '--'}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Garment Details & Special Instructions */}
                <div style={{
                  background: '#f9fafb',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  margin: '1.25rem 0',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '1rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.76rem', fontWeight: '800', color: '#888', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                      Hamper Contents & Weight
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#111' }}>
                      {order.weightKg} kg ({order.itemsCount} garments)
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '0.2rem' }}>
                      {order.itemsList.map(item => `${item.name} (${item.count})`).join(', ')}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.76rem', fontWeight: '800', color: '#888', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                      Delivery Doorstep
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#333', lineHeight: 1.35 }}>
                      {order.pickupAddress}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.76rem', fontWeight: '800', color: '#888', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                      Fabric Instructions
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#555', fontStyle: 'italic' }}>
                      "{order.specialInstructions}"
                    </div>
                  </div>
                </div>

                {/* Bottom Actions & Simulation Control */}
                <div className="spotlight-bottom-bar">
                  {order.rider && (
                    <div className="rider-card-mini">
                      <img 
                        src={order.rider.avatar} 
                        alt={order.rider.name} 
                        className="rider-avatar-img"
                      />
                      <div>
                        <div className="rider-details-name">
                          Captain {order.rider.name} • <span style={{ color: '#fa5929' }}>{order.rider.rating}</span>
                        </div>
                        <div className="rider-details-sub">
                          {order.rider.vehicle}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="spotlight-actions-group">
                    <div className="spotlight-otp-pill">
                      <span>Pickup OTP:</span>
                      <span style={{ letterSpacing: '0.1em', color: '#fa5929', fontWeight: '900' }}>
                        {order.pickupOtp}
                      </span>
                    </div>

                    {/* Step Advance Simulation Trigger */}
                    <button 
                      className="simulate-step-btn"
                      onClick={() => onAdvanceOrderStep(order.orderId)}
                      title="Advance to next laundry stage"
                    >
                      <RotateCw size={14} />
                      <span>Simulate Next Stage</span>
                    </button>

                    <button 
                      onClick={() => setSelectedInvoiceOrder(order)}
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid #d1d5db',
                        color: '#1a1a1a',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '9999px',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        cursor: 'pointer'
                      }}
                    >
                      <FileText size={14} />
                      <span>Invoice</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* VIEW 2: PAST ORDERS HISTORY */}
      {filterMode === 'past' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {pastOrders.map((order) => (
            <div 
              key={order.orderId}
              style={{
                background: '#ffffff',
                border: '1px solid rgba(10,10,10,0.08)',
                borderRadius: '20px',
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.25rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ maxWidth: '480px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
                  <span style={{
                    background: '#ecfdf5',
                    color: '#059669',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '9999px'
                  }}>
                    Delivered
                  </span>
                  <span style={{ fontWeight: '800', fontSize: '1rem', color: '#0a0a0a' }}>
                    #{order.orderId}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#777' }}>
                    • {order.deliveredAt}
                  </span>
                </div>

                <h4 style={{ fontSize: '1.05rem', fontWeight: '800', marginBottom: '0.2rem' }}>
                  {order.serviceName}
                </h4>
                <div style={{ fontSize: '0.82rem', color: '#666' }}>
                  Studio: {order.laundromatName} • {order.itemsCount} garments ({order.weightKg} kg)
                </div>

                {order.reviewText && (
                  <div style={{
                    marginTop: '0.65rem',
                    background: '#f9fafb',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    color: '#444',
                    fontStyle: 'italic',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}>
                    <Star size={13} fill="#f59e0b" color="#f59e0b" />
                    <span>"{order.reviewText}"</span>
                  </div>
                )}
              </div>

              {/* Price & Reorder Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0a0a0a' }}>
                    ₹{order.totalAmount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '700' }}>
                    {order.paymentStatus}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => setRatingOrder(order)}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e5e7eb',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '12px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      color: '#333',
                      cursor: 'pointer'
                    }}
                  >
                    Rate
                  </button>

                  <button 
                    onClick={() => setSelectedInvoiceOrder(order)}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e5e7eb',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '12px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      color: '#333',
                      cursor: 'pointer'
                    }}
                  >
                    Invoice
                  </button>

                  <button 
                    onClick={() => onReorder(order)}
                    style={{
                      background: 'var(--laundy-orange, #fa5929)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.55rem 1.15rem',
                      borderRadius: '12px',
                      fontSize: '0.84rem',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer'
                    }}
                  >
                    <span>Reorder</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* INVOICE MODAL */}
      <AnimatePresence>
        {selectedInvoiceOrder && (
          <div 
            className="laundy-modal-backdrop"
            onClick={() => setSelectedInvoiceOrder(null)}
          >
            <motion.div 
              className="laundy-booking-modal-card"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ maxWidth: '520px', padding: '2rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800' }}>Tax Invoice</div>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>Order #{selectedInvoiceOrder.orderId}</div>
                </div>
                <button 
                  onClick={() => setSelectedInvoiceOrder(null)}
                  style={{ background: '#f0f0f0', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ background: '#f9fafb', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#666' }}>Service Name:</span>
                  <strong style={{ color: '#111' }}>{selectedInvoiceOrder.serviceName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#666' }}>Laundromat Partner:</span>
                  <span>{selectedInvoiceOrder.laundromatName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#666' }}>Delivery Address:</span>
                  <span style={{ textAlign: 'right', maxWidth: '240px' }}>{selectedInvoiceOrder.pickupAddress}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                  <span style={{ color: '#666' }}>Payment Mode:</span>
                  <span>{selectedInvoiceOrder.paymentMethod}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #eee', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                  <span>Garments Laundry Subtotal</span>
                  <span>₹{selectedInvoiceOrder.totalAmount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem', color: '#10b981' }}>
                  <span>Doorstep Concierge Delivery</span>
                  <span>FREE</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: '800', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1.5px solid #111' }}>
                  <span>Total Paid / Payable</span>
                  <span style={{ color: '#fa5929' }}>₹{selectedInvoiceOrder.totalAmount}</span>
                </div>
              </div>

              <button 
                onClick={() => {
                  alert(`Invoice PSK-${selectedInvoiceOrder.orderId}.pdf downloaded successfully.`);
                  setSelectedInvoiceOrder(null);
                }}
                style={{
                  width: '100%',
                  background: '#0a0a0a',
                  color: '#ffffff',
                  padding: '0.85rem',
                  borderRadius: '9999px',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Download Official PDF Receipt
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RATING MODAL */}
      <AnimatePresence>
        {ratingOrder && (
          <div 
            className="laundy-modal-backdrop"
            onClick={() => setRatingOrder(null)}
          >
            <motion.div 
              className="laundy-booking-modal-card"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ maxWidth: '460px', padding: '2rem', textAlign: 'center' }}
            >
              <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.4rem' }}>
                Rate Order #{ratingOrder.orderId}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1.25rem' }}>
                How was your fabric care with {ratingOrder.laundromatName}?
              </p>

              {/* Star selector */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star 
                    key={s} 
                    size={32} 
                    fill={s <= userRating ? '#f59e0b' : 'none'}
                    color={s <= userRating ? '#f59e0b' : '#d1d5db'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setUserRating(s)}
                  />
                ))}
              </div>

              <textarea 
                className="pref-select-field"
                rows={3}
                placeholder="Write a quick comment about the wash, fragrance or rider..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                style={{ marginBottom: '1.25rem' }}
              />

              <button 
                onClick={handleRateSubmit}
                style={{
                  width: '100%',
                  background: 'var(--laundy-orange, #fa5929)',
                  color: '#ffffff',
                  padding: '0.85rem',
                  borderRadius: '9999px',
                  fontWeight: '700',
                  fontSize: '0.92rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {ratingSuccess ? 'Rating Submitted! Thank you.' : 'Submit Feedback'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
