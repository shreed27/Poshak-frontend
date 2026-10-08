import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ShieldCheck, Droplets, Wind } from 'lucide-react';

export const LaundyAbout = ({ onOpenBooking }) => {
  return (
    <section id="about" className="laundy-about-section">
      <div className="laundy-container">
        {/* Top Tab Marker (Screenshot Match) */}
        <div className="why-tab-marker-bar">
          <div className="why-tab-item active">
            <span className="why-marker-square"></span>
            <span className="why-tab-label">Why Choose Us</span>
          </div>
          <div className="why-tab-divider-line"></div>
        </div>

        {/* Section Header Row */}
        <div className="laundy-about-header-row">
          <motion.h2 
            className="laundy-about-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
          >
            Your clothes, our<br />care—the perfect match
          </motion.h2>

          <motion.p 
            className="laundy-about-subtitle-right"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.1 }}
          >
            Choose us for professional cleaning, reliable doorstep pickup in Bengaluru, and a fresh finish every time.
          </motion.p>
        </div>

        {/* 3 Column Grid */}
        <div className="laundy-why-choose-grid">
          {/* Column 1: Dark Ambient Laundromat Image Card */}
          <motion.div 
            className="why-card why-card-dark-photo"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.1 }}
            whileHover={{ y: -6, scale: 1.01 }}
          >
            <img 
              src="https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=85" 
              alt="Your clothes deserve the best" 
              className="why-card-bg-img"
            />
            <div className="why-card-dark-overlay">
              <div className="why-photo-bottom-content">
                <h3 className="why-card-photo-title">
                  Your clothes<br />deserve the best.
                </h3>
                <motion.button 
                  className="why-photo-cta-btn"
                  onClick={onOpenBooking}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  Get Started
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Column 2: Our Mission Card */}
          <motion.div 
            className="why-card why-card-light"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.2 }}
            whileHover={{ y: -6, scale: 1.01 }}
          >
            <div className="why-card-top-content">
              <h3 className="why-card-title">Our mission</h3>
              <p className="why-card-text">
                To provide the best wardrobe management services, making clothing care effortless and convenient.
              </p>
            </div>

            <div className="why-card-bottom-promise">
              <div className="why-launch-live-badge">
                <span className="live-dot-pulse"></span>
                <span>Now Live in Bengaluru</span>
              </div>
              <div className="why-promise-chips-wrap">
                <span className="why-promise-chip">💧 RO Purified Soft Water Wash</span>
                <span className="why-promise-chip">⚡ Same-Day & Next-Day Turnaround</span>
                <span className="why-promise-chip">🛡️ Zero Pre-payment Required</span>
              </div>
            </div>
          </motion.div>

          {/* Column 3: Pure Care & Our Vision Card */}
          <motion.div 
            className="why-card why-card-light"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.3 }}
            whileHover={{ y: -6, scale: 1.01 }}
          >
            <div className="why-card-top-stat-block">
              <div className="why-fresh-seal-badge">
                <Sparkles size={24} className="text-orange" />
                <span>Pure Care</span>
              </div>
              <span className="why-stat-sub">Clean made convenient</span>
            </div>

            <div className="why-card-bottom-vision-block">
              <h3 className="why-card-title">Our vision</h3>
              <p className="why-card-text">
                To make everyone feel confident and proud in whatever they wear.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};


