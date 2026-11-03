import React from 'react';
import { 
  Package, 
  Clock, 
  MapPin, 
  Check, 
  RotateCw, 
  Phone, 
  ArrowRight, 
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

export const MobileOrdersView = ({ 
  orders, 
  onAdvanceOrderStep, 
  onReorder,
  onNavigateHome 
}) => {
  const activeOrders = orders.filter(o => o.status === 'active');
  const pastOrders = orders.filter(o => o.status === 'completed');

  return (
    <div>
      <h1 className="mobile-hero-title" style={{ marginBottom: '1.25rem' }}>
        Live Orders &<br />Tracking
      </h1>

      {/* 1. Active Order Section */}
      {activeOrders.length === 0 ? (
        <div style={{
          background: 'var(--pastel-blue-hero)',
          borderRadius: '26px',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          marginBottom: '1.5rem'
        }}>
          <ShoppingBag size={36} color="#fa5929" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', marginBottom: '0.35rem' }}>
            No active laundry right now
          </h3>
          <p style={{ fontSize: '0.84rem', color: '#686b78', marginBottom: '1.25rem' }}>
            Schedule an express pickup today in 30 seconds.
          </p>
          <button 
            className="hero-primary-btn"
            onClick={onNavigateHome}
            style={{ width: 'auto', padding: '0.75rem 1.75rem', margin: '0 auto' }}
          >
            Schedule Pickup
          </button>
        </div>
      ) : (
        activeOrders.map((order) => (
          <div 
            key={order.orderId}
            style={{
              background: 'var(--pastel-blue-hero)',
              borderRadius: '26px',
              padding: '1.35rem 1.25rem',
              marginBottom: '1.5rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <span style={{
                background: '#ffffff',
                color: '#fa5929',
                fontSize: '0.74rem',
                fontWeight: '800',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                textTransform: 'uppercase'
              }}>
                ● {order.steps[order.currentStep]?.label || 'Processing'}
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#555' }}>
                Est. {order.deliveryEstimate}
              </span>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#111', marginBottom: '0.2rem' }}>
              {order.serviceName}
            </h3>
            <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '1rem' }}>
              {order.laundromatName} • {order.itemsCount} garments ({order.weightKg} kg) • ₹{order.totalAmount}
            </div>

            {/* Step Progress Line */}
            <div className="hero-progress-track">
              <div 
                className="hero-progress-fill" 
                style={{ width: `${(order.currentStep + 1) * 20}%` }}
              ></div>
            </div>

            {/* Rider & Step simulation */}
            <div style={{
              background: '#ffffff',
              borderRadius: '18px',
              padding: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.85rem'
            }}>
              {order.rider && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <img 
                    src={order.rider.avatar} 
                    alt={order.rider.name} 
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '0.84rem' }}>
                      {order.rider.name} ({order.rider.rating})
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#777' }}>
                      OTP: <strong style={{ color: '#fa5929' }}>{order.pickupOtp}</strong>
                    </div>
                  </div>
                </div>
              )}

              <button 
                onClick={() => onAdvanceOrderStep(order.orderId)}
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #16a34a',
                  color: '#16a34a',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.76rem',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  cursor: 'pointer'
                }}
              >
                <RotateCw size={12} />
                <span>Advance</span>
              </button>
            </div>
          </div>
        ))
      )}

      {/* 2. Past Orders List */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.85rem', color: '#111' }}>
        Past Orders
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {pastOrders.map((order) => (
          <div 
            key={order.orderId}
            style={{
              background: '#ffffff',
              border: '1px solid var(--mobile-border-light)',
              borderRadius: '20px',
              padding: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: '800', marginBottom: '0.2rem' }}>
                Delivered • #{order.orderId}
              </div>
              <h4 style={{ fontSize: '0.94rem', fontWeight: '800', color: '#111' }}>
                {order.serviceName}
              </h4>
              <div style={{ fontSize: '0.78rem', color: '#666' }}>
                ₹{order.totalAmount} • {order.deliveredAt}
              </div>
            </div>

            <button 
              onClick={() => onReorder(order)}
              style={{
                background: 'var(--mobile-accent-black)',
                color: '#ffffff',
                border: 'none',
                padding: '0.45rem 0.95rem',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer'
              }}
            >
              <span>Reorder</span>
              <ArrowRight size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
