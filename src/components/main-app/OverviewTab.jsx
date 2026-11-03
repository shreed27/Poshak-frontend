import React from 'react';
import { 
  Sparkles, 
  Clock, 
  ArrowRight, 
  Shirt, 
  Flame, 
  Zap, 
  Crown, 
  Footprints, 
  Layers, 
  Check, 
  MapPin, 
  Phone, 
  RotateCw, 
  ShieldCheck,
  Star
} from 'lucide-react';
import { motion } from 'framer-motion';
import { QUICK_SERVICES } from './MainAppData';
import { LAUNDROMATS } from '../../data/mockData';

export const OverviewTab = ({ 
  user, 
  activeOrder, 
  onAdvanceOrderStep, 
  onSelectServiceToBook, 
  onNavigateToTab,
  completedOrdersCount
}) => {
  const getIcon = (iconName) => {
    switch (iconName) {
      case 'Shirt': return <Shirt size={22} />;
      case 'Sparkles': return <Sparkles size={22} />;
      case 'Zap': return <Zap size={22} />;
      case 'Crown': return <Crown size={22} />;
      case 'Flame': return <Flame size={22} />;
      case 'Footprints': return <Footprints size={22} />;
      case 'Layers': return <Layers size={22} />;
      default: return <Sparkles size={22} />;
    }
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="overview-tab-content">
      {/* 1. Personalized Luxury Welcome Banner */}
      <motion.div 
        className="app-welcome-banner"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="welcome-banner-left">
          <div className="welcome-gold-tag">
            <Sparkles size={13} color="#fa5929" />
            <span>POSHAK GOLD CONCIERGE • BENGALURU</span>
          </div>
          <h1 className="welcome-headline">
            {getTimeGreeting()}, {(user?.name || 'Member').split(' ')[0]}!
          </h1>
          <p className="welcome-subtext">
            Your personal garment care hub is live. Pure RO soft water cycles, Italian steam pressing, and zero color bleed are guaranteed for every stitch.
          </p>
        </div>

        {/* Live Quick Statistics */}
        <div className="welcome-banner-stats">
          <div className="welcome-stat-box">
            <div className="stat-value">{activeOrder ? '1' : '0'}</div>
            <div className="stat-label">Active Bags</div>
          </div>
          <div className="welcome-stat-box">
            <div className="stat-value">{completedOrdersCount + 12}</div>
            <div className="stat-label">Garments Care</div>
          </div>
          <div className="welcome-stat-box">
            <div className="stat-value">18 hrs</div>
            <div className="stat-label">Time Saved</div>
          </div>
        </div>
      </motion.div>

      {/* 2. Active Live Order Spotlight Tracker (If Active Order Exists) */}
      {activeOrder && (
        <motion.div 
          className="live-order-spotlight-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <div className="spotlight-top-row">
            <div className="spotlight-status-pill">
              <span className="live-pulse-dot"></span>
              <span>{activeOrder.steps[activeOrder.currentStep]?.label || 'Processing'}</span>
            </div>

            <div className="spotlight-eta-badge">
              <Clock size={16} color="#fa5929" />
              <span>Est. Delivery: <strong>{activeOrder.deliveryEstimate}</strong></span>
            </div>
          </div>

          <div className="spotlight-order-meta">
            <div>
              <div className="meta-order-id">
                Order #{activeOrder.orderId} • <span style={{ color: '#fa5929' }}>{activeOrder.serviceName}</span>
              </div>
              <div className="meta-service-name">
                Partner Studio: <strong>{activeOrder.laundromatName}</strong> ({activeOrder.laundromatArea})
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.82rem', color: '#666' }}>Weight & Items:</div>
              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#111' }}>
                {activeOrder.weightKg} kg ({activeOrder.itemsCount} pieces) • ₹{activeOrder.totalAmount}
              </div>
            </div>
          </div>

          {/* 6-Step Visual Stepper */}
          <div className="spotlight-stepper-container">
            <div className="spotlight-stepper-track">
              {activeOrder.steps.map((st, idx) => {
                const isDone = idx < activeOrder.currentStep;
                const isActive = idx === activeOrder.currentStep;
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

          {/* Bottom Rider & Live Action Bar */}
          <div className="spotlight-bottom-bar">
            {activeOrder.rider && (
              <div className="rider-card-mini">
                <img 
                  src={activeOrder.rider.avatar} 
                  alt={activeOrder.rider.name} 
                  className="rider-avatar-img"
                />
                <div>
                  <div className="rider-details-name">
                    Captain {activeOrder.rider.name} • <span style={{ color: '#fa5929' }}>{activeOrder.rider.rating}</span>
                  </div>
                  <div className="rider-details-sub">
                    {activeOrder.rider.vehicle} • Indiranagar Hub
                  </div>
                </div>
              </div>
            )}

            <div className="spotlight-actions-group">
              <div className="spotlight-otp-pill">
                <span>Pickup OTP:</span>
                <span style={{ letterSpacing: '0.1em', color: '#fa5929', fontWeight: '900' }}>
                  {activeOrder.pickupOtp}
                </span>
              </div>

              {/* Live Step Advance Simulation Button */}
              <button 
                className="simulate-step-btn"
                onClick={() => onAdvanceOrderStep(activeOrder.orderId)}
                title="Click to simulate order progressing to the next stage"
              >
                <RotateCw size={14} />
                <span>Simulate Next Stage</span>
              </button>

              <button 
                onClick={() => onNavigateToTab('orders')}
                style={{
                  background: '#0a0a0a',
                  color: '#ffffff',
                  padding: '0.45rem 1rem',
                  borderRadius: '9999px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer'
                }}
              >
                <span>Live Tracker Map</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* 3. Quick Care Launcher Grid */}
      <div className="section-title-row">
        <div>
          <h2 className="section-main-heading">Book Fabric Care Service</h2>
          <p style={{ fontSize: '0.88rem', color: '#666', marginTop: '0.15rem' }}>
            Doorstep collection across all major Bengaluru pin codes with RO soft water guarantee
          </p>
        </div>
        <button 
          className="section-sublink-btn"
          onClick={() => onNavigateToTab('book')}
        >
          <span>Custom Booking Studio</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="services-cards-grid">
        {QUICK_SERVICES.map((svc) => (
          <motion.div 
            key={svc.id}
            className="service-interactive-card"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectServiceToBook(svc)}
          >
            <div>
              <div className="card-icon-tag-row">
                <div 
                  className="card-service-icon-box"
                  style={{ backgroundColor: `${svc.color}15`, color: svc.color }}
                >
                  {getIcon(svc.icon)}
                </div>
                <span className="card-badge-pill">{svc.badge}</span>
              </div>

              <h3 className="card-service-title">{svc.name}</h3>
              <p className="card-service-desc">{svc.desc}</p>
            </div>

            <div className="card-price-action-row">
              <div>
                <div className="card-price-value">{svc.price}</div>
                <div className="card-turnaround-sub">{svc.turnaround}</div>
              </div>
              <div className="card-book-now-circle">
                <ArrowRight size={16} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 4. Seasonal Monsoon Protection Offer Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        color: '#ffffff',
        borderRadius: '24px',
        padding: '1.75rem 2rem',
        marginBottom: '2.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem',
        boxShadow: '0 8px 24px rgba(2, 132, 199, 0.2)'
      }}>
        <div style={{ maxWidth: '640px' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.35rem', 
            background: 'rgba(255,255,255,0.2)', 
            padding: '0.25rem 0.75rem', 
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: '800',
            marginBottom: '0.65rem'
          }}>
            <ShieldCheck size={13} />
            <span>SPECIAL MONSOON CARE</span>
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.4rem' }}>
            Zero Damp Smell & Anti-Mildew Thermal Drying
          </h3>
          <p style={{ fontSize: '0.88rem', opacity: 0.9, lineHeight: 1.45 }}>
            Bengaluru rains making it impossible to dry clothes? Every batch gets sanitized with commercial Electrolux heat dryers and sealed in waterproof breathable garment covers.
          </p>
        </div>

        <button 
          onClick={() => onSelectServiceToBook(QUICK_SERVICES[0])}
          style={{
            background: '#ffffff',
            color: '#0369a1',
            padding: '0.85rem 1.6rem',
            borderRadius: '9999px',
            fontSize: '0.92rem',
            fontWeight: '800',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
            cursor: 'pointer'
          }}
        >
          Schedule Wash & Dry
        </button>
      </div>

      {/* 5. Verified Neighborhood Studios Preview */}
      <div className="section-title-row">
        <div>
          <h2 className="section-main-heading">Top Neighborhood Studios</h2>
          <p style={{ fontSize: '0.88rem', color: '#666', marginTop: '0.15rem' }}>
            Direct fulfillment from verified commercial laundry and dry clean ateliers
          </p>
        </div>
        <button 
          className="section-sublink-btn"
          onClick={() => onNavigateToTab('studios')}
        >
          <span>View All 50+ Hubs</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1.25rem'
      }}>
        {LAUNDROMATS.slice(0, 3).map((laundromat) => (
          <div 
            key={laundromat.id}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid rgba(10,10,10,0.08)',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ height: '140px', position: 'relative' }}>
              <img 
                src={laundromat.image} 
                alt={laundromat.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: '#ffffff',
                padding: '0.25rem 0.6rem',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.78rem',
                fontWeight: '800',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
              }}>
                <Star size={13} fill="#f59e0b" color="#f59e0b" />
                <span>{laundromat.rating}</span>
                <span style={{ color: '#888', fontWeight: 'normal' }}>({laundromat.reviewsCount})</span>
              </div>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: '800', marginBottom: '0.25rem' }}>
                {laundromat.name}
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#666', marginBottom: '0.85rem' }}>
                <MapPin size={13} color="#fa5929" />
                <span>{laundromat.area} • {laundromat.distance}</span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.15rem' }}>
                {laundromat.specialties.map((spec, i) => (
                  <span 
                    key={i}
                    style={{
                      background: '#f4f5f7',
                      fontSize: '0.72rem',
                      fontWeight: '600',
                      color: '#444',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px'
                    }}
                  >
                    {spec}
                  </span>
                ))}
              </div>

              <button 
                onClick={() => onNavigateToTab('book')}
                style={{
                  width: '100%',
                  background: '#f8f9fa',
                  border: '1.5px solid #e5e7eb',
                  padding: '0.65rem',
                  borderRadius: '12px',
                  fontSize: '0.84rem',
                  fontWeight: '700',
                  color: '#1a1a1a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>Select this Studio</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
