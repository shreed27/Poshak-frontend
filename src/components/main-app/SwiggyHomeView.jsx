import React from 'react';
import { 
  Sparkles, 
  Clock, 
  MapPin, 
  ArrowRight, 
  ShieldCheck, 
  Camera, 
  Truck, 
  CheckCircle2,
  Calendar,
  Check,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCatalog } from '../../context/CatalogContext';
import { getProgress, statusCopy } from '../../lib/orderEngine';

export const SwiggyHomeView = ({ 
  activeOrder,
  onNavigateToOrders,
  selectedServiceIds = ['wash-iron'],
  onToggleService,
  onBookDirect,
  onOpenBookingFlow,
  hasCartItems = false,
  now = Date.now()
}) => {

  const { services } = useCatalog();
  const selectedServicesList = services.filter(s => selectedServiceIds.includes(s.id));

  return (
    <div className="swiggy-feed-container">
      {/* 1. Live Active Order Strip (If user has an active ongoing order) */}
      {activeOrder && (
        <motion.div 
          className="swiggy-live-order-strip"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onNavigateToOrders}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="strip-status-dot"></span>
            <div>
              <div style={{ fontWeight: '800', fontSize: '0.9rem' }}>
                Order #{activeOrder.orderId} • {statusCopy(activeOrder, getProgress(activeOrder, now)).title}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.75)' }}>
                {statusCopy(activeOrder, getProgress(activeOrder, now)).sub} • Captain {activeOrder.rider?.name}
              </div>
            </div>
          </div>

          <button className="strip-track-btn">
            <span>Track Live</span>
            <ArrowRight size={13} />
          </button>
        </motion.div>
      )}

      {/* 2. Promo Banners Carousel */}
      <div className="swiggy-promo-carousel">
        <div 
          className="swiggy-banner-card banner-orange"
          onClick={() => onBookDirect('wash-iron')}
          style={{ cursor: 'pointer' }}
        >
          <div>
            <div className="banner-pill">
              <Sparkles size={11} />
              <span>FLAT 20% OFF WITH POSHAK GOLD</span>
            </div>
            <h3 className="banner-title">Doorstep Laundry & Steam Iron</h3>
            <p className="banner-sub">
              Upload clothes photos, get digital doorstep weigh-in, and zero advance payment.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.04em' }}>
              USE CODE: POSHAKGOLD
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', textDecoration: 'underline' }}>
              Book Now →
            </span>
          </div>
        </div>

        <div 
          className="swiggy-banner-card banner-blue"
          onClick={() => onBookDirect('express-6h')}
          style={{ cursor: 'pointer' }}
        >
          <div>
            <div className="banner-pill">
              <Clock size={11} />
              <span>EXPRESS DELIVERY</span>
            </div>
            <h3 className="banner-title">6-Hour Blitz Turnaround</h3>
            <p className="banner-sub">
              Picked up in 20 minutes, sanitized soft RO wash & delivered crisp before dinner.
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.04em' }}>
              AT YOUR NEAREST HUB
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', textDecoration: 'underline' }}>
              Book Blitz →
            </span>
          </div>
        </div>
      </div>

      {/* 3. Our Services Catalogue (Direct Selection & 1-Click Booking) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 className="swiggy-section-heading" style={{ margin: 0 }}>
            Our Laundry & Care Services
          </h2>
          <p style={{ fontSize: '0.84rem', color: '#686b78', margin: '0.2rem 0 0' }}>
            Select any service to book instant doorstep pickup
          </p>
        </div>

        <button 
          onClick={onOpenBookingFlow}
          style={{
            background: '#fa5929',
            color: '#ffffff',
            border: 'none',
            padding: '0.55rem 1.25rem',
            borderRadius: '9999px',
            fontSize: '0.84rem',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 4px 14px rgba(250, 89, 41, 0.25)'
          }}
        >
          <span>Schedule Pickup ({selectedServiceIds.length})</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="dashboard-services-grid">
        {services.map((svc) => {
          const isSelected = selectedServiceIds.includes(svc.id);
          return (
            <div 
              key={svc.id} 
              className={`dashboard-service-card ${isSelected ? 'is-selected' : ''}`}
              onClick={() => onToggleService(svc.id)}
            >
              <div className="dashboard-service-img-wrap">
                <img src={svc.image} alt={svc.name} className="dashboard-service-img" />
                <div className="dashboard-service-price-chip">
                  {svc.price}
                </div>

                {isSelected && (
                  <div className="service-selected-pill-badge">
                    <Check size={12} strokeWidth={3} />
                    <span>Selected</span>
                  </div>
                )}
              </div>

              <div className="dashboard-service-body">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span className="dashboard-veg-pill">
                    <span className="veg-dot"></span>
                    <span>Pure RO Soft Water</span>
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: '700' }}>
                    {svc.turnaround}
                  </span>
                </div>

                <h3 className="dashboard-service-title">{svc.name}</h3>
                <p className="dashboard-service-desc">{svc.desc}</p>

                {/* Direct Action Buttons: 1-Click Book or Toggle */}
                <div className="service-card-action-bar">
                  <button 
                    type="button"
                    className={`service-select-toggle-btn ${isSelected ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleService(svc.id);
                    }}
                    title={isSelected ? 'Remove from booking' : 'Add to booking'}
                  >
                    {isSelected ? (
                      <>
                        <Check size={13} strokeWidth={3} />
                        <span>Selected</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        <span>Select</span>
                      </>
                    )}
                  </button>

                  <button 
                    type="button"
                    className="service-book-direct-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBookDirect(svc.id);
                    }}
                    title="Book this service immediately"
                  >
                    <span>Book Now</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Selected Services Bar (When 1+ services selected and cart is empty) */}
      <AnimatePresence>
        {selectedServicesList.length > 0 && !hasCartItems && (
          <motion.div 

            className="services-selected-float-bar"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            onClick={onOpenBookingFlow}
          >
            <div className="selected-float-info">
              <div className="selected-float-badge">
                {selectedServicesList.length} {selectedServicesList.length === 1 ? 'Service' : 'Services'} Ready to Book
              </div>
              <div className="selected-float-title">
                {selectedServicesList.map(s => s.name).join(' • ')}
              </div>
            </div>

            <button className="selected-float-cta-btn">
              <span>Book Doorstep Pickup</span>
              <ArrowRight size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>


      {/* 4. How Poshak Works (Simple 3 steps) */}
      <div className="how-it-works-strip">
        <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0a0a0a', marginBottom: '1.25rem' }}>
          How Doorstep Laundry Ordering Works
        </h3>

        <div className="how-steps-row">
          <div className="how-step-card">
            <div className="how-step-icon-bubble">1</div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '800', margin: '0.5rem 0 0.2rem' }}>
              Choose Service & Snap Photos
            </h4>
            <p style={{ fontSize: '0.78rem', color: '#686b78', margin: 0, lineHeight: 1.4 }}>
              Select care packages and upload quick pictures of your clothes or laundry bag.
            </p>
          </div>

          <div className="how-step-card">
            <div className="how-step-icon-bubble">2</div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '800', margin: '0.5rem 0 0.2rem' }}>
              Doorstep Scale Weigh-in
            </h4>
            <p style={{ fontSize: '0.78rem', color: '#686b78', margin: 0, lineHeight: 1.4 }}>
              Captain arrives with a certified digital scale, tags your tamper bag & zero advance needed.
            </p>
          </div>

          <div className="how-step-card">
            <div className="how-step-icon-bubble">3</div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '800', margin: '0.5rem 0 0.2rem' }}>
              Delivered Crisp on Hangers
            </h4>
            <p style={{ fontSize: '0.78rem', color: '#686b78', margin: 0, lineHeight: 1.4 }}>
              Boiler steam pressed, folded or hung, delivered fresh right back to your door.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
