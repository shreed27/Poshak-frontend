import React, { useState } from 'react';
import { 
  MapPin, 
  ChevronDown, 
  Wallet, 
  Bell, 
  LogOut, 
  ArrowLeft, 
  Sparkles, 
  Check, 
  Plus, 
  ShieldCheck, 
  ExternalLink 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AppHeader = ({ 
  user, 
  logout, 
  onBackToLanding, 
  addresses, 
  activeAddress, 
  onSelectAddress,
  walletBalance,
  onOpenWalletTab,
  onOpenSettingsTab
}) => {
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const notifications = [
    {
      id: 'notif-1',
      title: 'Rider Vikram Dispatched',
      desc: 'Captain is 15 mins away for Indiranagar pickup (#PSK-89241)',
      time: '10m ago',
      unread: true
    },
    {
      id: 'notif-2',
      title: 'Poshak Gold Pass Active',
      desc: 'Enjoy flat 20% OFF on all steam ironing and dry cleans',
      time: '2h ago',
      unread: false
    },
    {
      id: 'notif-3',
      title: '₹150 Welcome Credit Added',
      desc: 'Available for your current or next pickup order',
      time: '1d ago',
      unread: false
    }
  ];

  return (
    <header className="app-header-root">
      <div className="app-header-inner">
        {/* Left Side: Brand Logo & Address Dropdown */}
        <div className="app-header-left">
          <div className="app-brand-logo" onClick={onBackToLanding} title="Return to Landing Page">
            <span>Poshak</span>
            <span className="app-brand-dot"></span>
          </div>

          {/* Delivery Address Switcher */}
          <div className="app-address-selector-wrap">
            <button 
              className="app-address-pill"
              onClick={() => setIsAddressDropdownOpen(!isAddressDropdownOpen)}
              aria-label="Select Delivery Address"
            >
              <MapPin size={15} color="#fa5929" />
              <span className="address-pill-tag">{activeAddress.label}</span>
              <span className="address-pill-text">{activeAddress.streetArea}</span>
              <ChevronDown size={14} color="#666666" />
            </button>

            {/* Address Switcher Dropdown */}
            <AnimatePresence>
              {isAddressDropdownOpen && (
                <motion.div 
                  className="glass-card"
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    position: 'absolute',
                    top: '115%',
                    left: 0,
                    width: '320px',
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '0.75rem',
                    boxShadow: '0 16px 36px rgba(0,0,0,0.12)',
                    border: '1px solid rgba(10,10,10,0.1)',
                    zIndex: 100
                  }}
                >
                  <div style={{ fontSize: '0.76rem', fontWeight: '800', color: '#888', padding: '0.4rem 0.6rem', textTransform: 'uppercase' }}>
                    Select Doorstep Pickup Address
                  </div>
                  {addresses.map((addr) => (
                    <div 
                      key={addr.id}
                      onClick={() => {
                        onSelectAddress(addr);
                        setIsAddressDropdownOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.75rem',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        background: activeAddress.id === addr.id ? 'rgba(250, 89, 41, 0.08)' : 'transparent',
                        marginBottom: '0.25rem'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.86rem', color: '#111' }}>
                          {addr.label}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.3 }}>
                          {addr.flatBuilding}, {addr.streetArea}
                        </div>
                      </div>
                      {activeAddress.id === addr.id && <Check size={16} color="#fa5929" />}
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      setIsAddressDropdownOpen(false);
                      onOpenSettingsTab();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.55rem',
                      marginTop: '0.4rem',
                      borderTop: '1px solid #f0f0f0',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      color: '#fa5929',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} />
                    <span>Manage or Add New Address</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Side: Wallet, Public View Switcher, Notifications, Profile */}
        <div className="app-header-right">
          {/* Exit to Public Website Button */}
          <button 
            className="app-exit-landing-btn"
            onClick={onBackToLanding}
            title="Switch back to landing page view"
          >
            <ArrowLeft size={14} />
            <span>Public Site</span>
          </button>

          {/* Wallet Balance Chip */}
          <button 
            className="app-wallet-pill"
            onClick={onOpenWalletTab}
            title="Open Poshak Wallet & Gold Pass"
          >
            <span className="wallet-pill-icon">
              <Wallet size={14} />
            </span>
            <span>₹{walletBalance}</span>
            <span className="wallet-gold-badge">GOLD</span>
          </button>

          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button 
              className="app-icon-btn-round"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              aria-label="Notifications"
            >
              <Bell size={17} />
              <span className="notification-badge-dot"></span>
            </button>

            {/* Notifications Dropdown */}
            <AnimatePresence>
              {isNotificationsOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    position: 'absolute',
                    top: '125%',
                    right: 0,
                    width: '320px',
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '1rem',
                    boxShadow: '0 16px 36px rgba(0,0,0,0.12)',
                    border: '1px solid rgba(10,10,10,0.1)',
                    zIndex: 100
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <span style={{ fontWeight: '800', fontSize: '0.9rem' }}>Notifications</span>
                    <span style={{ fontSize: '0.72rem', color: '#fa5929', fontWeight: '700' }}>3 New</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {notifications.map((n) => (
                      <div 
                        key={n.id}
                        style={{
                          padding: '0.65rem',
                          borderRadius: '10px',
                          background: n.unread ? 'rgba(250, 89, 41, 0.05)' : '#f9fafb',
                          border: n.unread ? '1px solid rgba(250, 89, 41, 0.2)' : '1px solid #f0f0f0'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: '700', marginBottom: '0.2rem' }}>
                          <span>{n.title}</span>
                          <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 'normal' }}>{n.time}</span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#666', lineHeight: 1.35 }}>
                          {n.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Profile Pill & Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              className="app-user-profile-btn"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              aria-label="User Profile"
            >
              <img 
                src={user?.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                alt={user?.name || 'User'} 
                className="app-user-avatar-img"
              />
              <span className="app-user-name-snippet">
                {(user?.name || 'Member').split(' ')[0]}
              </span>
              <ChevronDown size={14} color="#666666" />
            </button>

            {/* Profile Menu Dropdown */}
            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    position: 'absolute',
                    top: '125%',
                    right: 0,
                    width: '260px',
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '0.85rem',
                    boxShadow: '0 16px 36px rgba(0,0,0,0.12)',
                    border: '1px solid rgba(10,10,10,0.1)',
                    zIndex: 100
                  }}
                >
                  <div style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#0a0a0a' }}>
                      {user?.name || 'Poshak Member'}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#777' }}>
                      {user?.email || 'member@poshak.in'}
                    </div>
                    <div style={{ 
                      marginTop: '0.4rem', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.3rem',
                      background: 'rgba(250, 89, 41, 0.1)',
                      color: '#fa5929',
                      fontSize: '0.7rem',
                      fontWeight: '800',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '9999px'
                    }}>
                      <Sparkles size={11} />
                      <span>Poshak Gold Pass</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <button 
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onOpenSettingsTab();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.55rem 0.65rem',
                        borderRadius: '8px',
                        fontSize: '0.84rem',
                        fontWeight: '600',
                        color: '#333',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <ShieldCheck size={16} />
                      <span>Preferences & Addresses</span>
                    </button>

                    <button 
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onBackToLanding();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.55rem 0.65rem',
                        borderRadius: '8px',
                        fontSize: '0.84rem',
                        fontWeight: '600',
                        color: '#333',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <ExternalLink size={16} />
                      <span>View Marketing Landing Page</span>
                    </button>

                    <button 
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logout();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.55rem 0.65rem',
                        borderRadius: '8px',
                        fontSize: '0.84rem',
                        fontWeight: '700',
                        color: '#ef4444',
                        cursor: 'pointer',
                        textAlign: 'left',
                        marginTop: '0.3rem',
                        borderTop: '1px solid #f0f0f0'
                      }}
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};
