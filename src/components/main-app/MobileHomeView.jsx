import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  MapPin, 
  Sparkles, 
  Clock, 
  Check, 
  X, 
  Plus, 
  Minus, 
  ShoppingBag,
  ShieldCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QUICK_SERVICES } from './MainAppData';

export const MobileHomeView = ({ 
  user, 
  activeOrder, 
  walletBalance, 
  onAddToCart, 
  onOpenCart, 
  onNavigateToTab 
}) => {
  const [selectedServiceForSheet, setSelectedServiceForSheet] = useState(null);
  const [sheetQty, setSheetQty] = useState(2);

  const cardsData = [
    {
      id: 'wash-fold',
      service: QUICK_SERVICES[0],
      letter: 'W',
      colorClass: 'card-pink',
      badge: 'Popular',
      title: 'Wash & Fold',
      sub: 'From ₹49/kg • 24h Clean'
    },
    {
      id: 'steam-press',
      service: QUICK_SERVICES[4],
      letter: 'S',
      colorClass: 'card-lavender',
      badge: 'Crisp',
      title: 'Steam Press Only',
      sub: 'From ₹19/pc • Hanger Pack'
    },
    {
      id: 'express-6h',
      service: QUICK_SERVICES[2],
      letter: 'B',
      colorClass: 'card-mint',
      badge: '6h Blitz',
      title: '6-Hour Blitz Wash',
      sub: 'From ₹99/kg • 20m pickup'
    },
    {
      id: 'dry-clean',
      service: QUICK_SERVICES[3],
      letter: 'D',
      colorClass: 'card-peach',
      badge: 'Luxury',
      title: 'Suits & Silk Care',
      sub: 'From ₹199/pc • Zero bleed'
    },
    {
      id: 'shoe-spa',
      service: QUICK_SERVICES[5],
      letter: 'K',
      colorClass: 'card-lilac',
      badge: 'Trending',
      title: 'Sneaker & Shoe Spa',
      sub: 'From ₹249/pair • Deep scrub'
    },
    {
      id: 'heavy-home',
      service: QUICK_SERVICES[6],
      letter: 'Q',
      colorClass: 'card-cyan',
      badge: 'Home Care',
      title: 'Duvets & Quilts',
      sub: 'From ₹199/pc • Thermal dry'
    }
  ];

  const handleOpenCard = (item) => {
    setSelectedServiceForSheet(item.service);
    setSheetQty(2);
  };

  const handleAddAndClose = () => {
    if (selectedServiceForSheet) {
      for (let i = 0; i < sheetQty; i++) {
        onAddToCart(selectedServiceForSheet);
      }
      setSelectedServiceForSheet(null);
      onOpenCart();
    }
  };

  return (
    <div>
      {/* 1. Top Avatar & Reward/Streak Chip Row */}
      <div className="mobile-top-row">
        <div 
          className="mobile-user-avatar-wrap"
          onClick={() => onNavigateToTab('account')}
          title="Profile & Settings"
        >
          <img 
            src={user?.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
            alt={user?.name || 'Member'} 
            className="mobile-user-avatar-img"
          />
        </div>

        <button 
          className="mobile-reward-chip"
          onClick={() => onNavigateToTab('account')}
        >
          <span>🔥</span>
          <span>₹{walletBalance}</span>
        </button>
      </div>

      {/* 2. Bold Headline (Exact Screenshot Match) */}
      <h1 className="mobile-hero-title">
        Get Started with<br />Poshak
      </h1>

      {/* 3. Ice-Blue Featured Hero Card (Exact Screenshot Match) */}
      <div className="mobile-hero-card">
        <div className="hero-card-header-row">
          <div className="hero-pack-tag">
            <span>📖</span>
            <span>{activeOrder ? 'Active Pickup' : 'Express Care Pack'}</span>
          </div>
          <button 
            className="hero-arrow-btn"
            onClick={() => onNavigateToTab(activeOrder ? 'orders' : 'search')}
            aria-label="View Details"
          >
            <ArrowUpRight size={17} />
          </button>
        </div>

        <div className="hero-sub-pill">
          <span>👔</span>
          <span>{activeOrder ? `Order #${activeOrder.orderId}` : 'Wash & Steam Iron • 24h'}</span>
        </div>

        {/* Sleek Progress Slider (Screenshot Match) */}
        <div className="hero-progress-track">
          <div 
            className="hero-progress-fill" 
            style={{ width: activeOrder ? `${(activeOrder.currentStep + 1) * 20}%` : '65%' }}
          ></div>
        </div>

        {/* Primary Solid Black Pill Button */}
        <button 
          className="hero-primary-btn"
          onClick={() => {
            if (activeOrder) {
              onNavigateToTab('orders');
            } else {
              handleOpenCard(cardsData[0]);
            }
          }}
        >
          <span>{activeOrder ? 'Track Live Delivery' : 'Continue'}</span>
        </button>

        {/* Secondary White Pill Button */}
        <button 
          className="hero-secondary-btn"
          onClick={() => onNavigateToTab('search')}
        >
          <span>Explore Partner Studios</span>
        </button>
      </div>

      {/* 4. 2-Column Pastel Squircle Cards Grid (Exact Screenshot Match) */}
      <div className="mobile-cards-grid">
        {cardsData.map((item) => (
          <motion.div 
            key={item.id}
            className={`pastel-squircle-card ${item.colorClass}`}
            onClick={() => handleOpenCard(item)}
            whileTap={{ scale: 0.96 }}
          >
            <div className="card-top-row">
              <div className="card-circle-icon">{item.letter}</div>
              <span className="card-badge-pill">{item.badge}</span>
            </div>

            <div>
              <div className="card-title-text">{item.title}</div>
              <div className="card-sub-text">{item.sub}</div>
            </div>

            {/* Decorative subtle circle */}
            <div className="card-bg-deco" style={{ background: '#000000' }}></div>
          </motion.div>
        ))}
      </div>

      {/* Slide-Up Bottom Sheet for Selected Card */}
      <AnimatePresence>
        {selectedServiceForSheet && (
          <div 
            className="mobile-bottom-sheet-backdrop"
            onClick={() => setSelectedServiceForSheet(null)}
          >
            <motion.div 
              className="mobile-bottom-sheet-card"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            >
              <div className="sheet-handle-pill"></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#111' }}>
                    {selectedServiceForSheet.name}
                  </h3>
                  <div style={{ fontSize: '0.86rem', color: '#fa5929', fontWeight: '800', marginTop: '0.2rem' }}>
                    {selectedServiceForSheet.price} • {selectedServiceForSheet.turnaround}
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedServiceForSheet(null)}
                  style={{ background: '#f1f2f4', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              <p style={{ fontSize: '0.84rem', color: '#686b78', lineHeight: 1.45, marginBottom: '1.25rem' }}>
                {selectedServiceForSheet.desc}
              </p>

              {/* Quantity Stepper */}
              <div style={{
                background: '#f8f9fa',
                borderRadius: '16px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem'
              }}>
                <span style={{ fontWeight: '800', fontSize: '0.88rem' }}>
                  Estimated Quantity
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <button 
                    onClick={() => setSheetQty(Math.max(1, sheetQty - 1))}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #d1d5db', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ fontWeight: '800', fontSize: '1.1rem', minWidth: '40px', textAlign: 'center' }}>
                    {sheetQty} {selectedServiceForSheet.unit}
                  </span>
                  <button 
                    onClick={() => setSheetQty(sheetQty + 1)}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #d1d5db', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Add to Hamper Button */}
              <button 
                className="hero-primary-btn"
                onClick={handleAddAndClose}
              >
                <span>Add to Hamper • ₹{selectedServiceForSheet.unitPrice * sheetQty}</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
