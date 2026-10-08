import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight, ArrowUpRight, Sparkles, User, LogOut, Clock, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LaundyNavbar = ({ activeTab, setActiveTab, onOpenBooking }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [timeString, setTimeString] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isAuthenticated, logout, openLoginModal } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      setTimeString(formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'services', label: 'Services' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'faq', label: 'FAQ' }
  ];

  const handleNavClick = (id) => {
    if (id === 'pricing' && !isAuthenticated) {
      setIsMenuOpen(false);
      onOpenBooking({ name: 'Pricing & Transparent Rates' });
      return;
    }
    setActiveTab(id);
    setIsMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header 
        className={`laundy-header-fixed-root ${isScrolled ? 'is-scrolled' : ''}`}
      >
        <motion.div 
          className="laundy-header-pill"
          initial={false}
          animate={{
            width: isScrolled ? 'min(92%, 640px)' : '100%',
            maxWidth: isScrolled ? '640px' : '1320px',
            backgroundColor: isScrolled ? 'rgba(255, 255, 255, 0.94)' : 'rgba(0, 0, 0, 0)',
            backdropFilter: isScrolled ? 'blur(20px) saturate(180%)' : 'blur(0px)',
            WebkitBackdropFilter: isScrolled ? 'blur(20px) saturate(180%)' : 'blur(0px)',
            borderRadius: isScrolled ? '9999px' : '0px',
            borderWidth: isScrolled ? '1.5px' : '0px',
            borderColor: isScrolled ? 'rgba(10, 10, 10, 0.12)' : 'rgba(0, 0, 0, 0)',
            borderStyle: 'solid',
            boxShadow: isScrolled ? '0 12px 36px rgba(0, 0, 0, 0.12)' : '0 0px 0px rgba(0, 0, 0, 0)',
            paddingTop: isScrolled ? '0.35rem' : '1.25rem',
            paddingBottom: isScrolled ? '0.35rem' : '1.25rem',
            paddingLeft: isScrolled ? '1rem' : '2rem',
            paddingRight: isScrolled ? '1rem' : '2rem',
            y: isScrolled ? 12 : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 280,
            damping: 26,
            mass: 0.8
          }}
        >
          <div className="laundy-header-container">
            {/* Brand Wordmark */}
            <motion.a 
              href="#home" 
              className="laundy-brand-logo"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('home');
              }}
              initial={false}
              animate={{
                fontSize: isScrolled ? '1.45rem' : '2.1rem',
                color: isScrolled ? '#0a0a0a' : '#ffffff'
              }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              Poshak
            </motion.a>

            {/* Center Location & Live Time */}
            <motion.div 
              className="laundy-location-time"
              initial={false}
              animate={{
                opacity: isScrolled ? 0.85 : 1,
                scale: isScrolled ? 0.88 : 1,
                color: isScrolled ? '#0a0a0a' : '#ffffff'
              }}
              transition={{ duration: 0.2 }}
            >
              {!isScrolled && <span className="laundy-location-text">Bengaluru, India</span>}
              <span className="laundy-time-text">{timeString || '11:46 PM'}</span>
            </motion.div>

            {/* Right Menu & Booking Actions */}
            <div className="laundy-header-right">
              {/* Quick Booking CTA */}
              <motion.button 
                className="laundy-quick-book-btn"
                onClick={onOpenBooking}
                initial={false}
                animate={{
                  paddingTop: isScrolled ? '0.35rem' : '0.55rem',
                  paddingBottom: isScrolled ? '0.35rem' : '0.55rem',
                  paddingLeft: isScrolled ? '0.75rem' : '1.15rem',
                  paddingRight: isScrolled ? '0.75rem' : '1.15rem',
                  fontSize: isScrolled ? '0.76rem' : '0.85rem',
                  backgroundColor: isScrolled ? '#0a0a0a' : 'rgba(255, 255, 255, 0.18)',
                  color: '#ffffff'
                }}
                transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                whileHover={{ scale: 1.04, backgroundColor: '#fa5929' }}
                whileTap={{ scale: 0.96 }}
              >
                <span>Schedule Pickup</span>
                <ArrowRight size={13} />
              </motion.button>

              {/* Official Google Sign In Button */}
              {isAuthenticated ? (
                <motion.button 
                  className="laundy-google-user-pill" 
                  onClick={openLoginModal}
                  initial={false}
                  animate={{
                    backgroundColor: isScrolled ? 'rgba(10, 10, 10, 0.08)' : 'rgba(255, 255, 255, 0.2)',
                    color: isScrolled ? '#0a0a0a' : '#ffffff'
                  }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <img src={user.picture} alt={user.name} className="laundy-user-avatar" />
                  <span className="laundy-user-name">{user.name.split(' ')[0]}</span>
                </motion.button>
              ) : (
                <motion.button 
                  className="laundy-google-login-btn" 
                  onClick={() => onOpenBooking()}
                  initial={false}
                  animate={{
                    backgroundColor: isScrolled ? '#ffffff' : 'rgba(255, 255, 255, 0.95)',
                    color: '#0a0a0a',
                    paddingTop: isScrolled ? '0.35rem' : '0.5rem',
                    paddingBottom: isScrolled ? '0.35rem' : '0.5rem',
                    paddingLeft: isScrolled ? '0.75rem' : '0.95rem',
                    paddingRight: isScrolled ? '0.75rem' : '0.95rem',
                    fontSize: isScrolled ? '0.76rem' : '0.82rem',
                  }}
                  transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                  whileHover={{ scale: 1.04, boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }}
                  whileTap={{ scale: 0.96 }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Google Login</span>
                </motion.button>
              )}

              {/* Circular Hamburger Menu Button */}
              <motion.button 
                className="laundy-menu-toggle-btn"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle Navigation Menu"
                initial={false}
                animate={{
                  width: isScrolled ? '34px' : '44px',
                  height: isScrolled ? '34px' : '44px',
                  backgroundColor: '#0a0a0a',
                  color: '#ffffff'
                }}
                transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
              >
                {isMenuOpen ? <X size={isScrolled ? 16 : 20} /> : <Menu size={isScrolled ? 16 : 20} />}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </header>

      {/* Fullscreen Sliding Navigation Overlay with Framer Motion AnimatePresence */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            className="laundy-nav-overlay" 
            onClick={() => setIsMenuOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className="laundy-nav-drawer" 
              onClick={(e) => e.stopPropagation()}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="laundy-drawer-top">
                <span className="drawer-brand">Poshak</span>
                <motion.button 
                  className="drawer-close-btn" 
                  onClick={() => setIsMenuOpen(false)}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={22} />
                </motion.button>
              </div>

              <div className="laundy-drawer-grid">
                <div className="drawer-links-col">
                  <span className="drawer-section-label">Navigation</span>
                  <nav className="drawer-nav-list">
                    {navLinks.map((link, idx) => (
                      <motion.button
                        key={link.id}
                        className={`drawer-nav-item ${activeTab === link.id ? 'active' : ''}`}
                        onClick={() => handleNavClick(link.id)}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + idx * 0.05 }}
                        whileHover={{ x: 8, color: '#fa5929' }}
                      >
                        <span>{link.label}</span>
                        <ArrowUpRight size={18} className="drawer-arrow" />
                      </motion.button>
                    ))}
                  </nav>
                </div>

                <div className="drawer-info-col">
                  <div className="drawer-info-block">
                    <span className="drawer-info-label">General Inquiries:</span>
                    <a href="mailto:care@poshak.in" className="drawer-info-val">care@poshak.in</a>
                  </div>

                  <div className="drawer-info-block">
                    <span className="drawer-info-label">Bengaluru Support:</span>
                    <a href="tel:+918045678900" className="drawer-info-val">+91 80 4567 8900</a>
                  </div>

                  <div className="drawer-info-block">
                    <span className="drawer-info-label">Socials:</span>
                    <div className="drawer-socials-row">
                      <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
                      <span>•</span>
                      <a href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a>
                    </div>
                  </div>

                  <div className="drawer-cta-block">
                    <motion.button 
                      className="drawer-schedule-btn"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenBooking();
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <span>Schedule Pickup</span>
                      <ArrowRight size={16} />
                    </motion.button>
                  </div>
                </div>
              </div>

              <div className="drawer-footer-copyright">
                <span>(2020-26©) Poshak India Garment Care Pvt Ltd. All rights reserved.</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
