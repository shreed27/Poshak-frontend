import React from 'react';
import { motion } from 'framer-motion';

export const LaundyHowItWorks = () => {
  return (
    <section id="how-it-works" className="laundy-how-section">
      <div className="laundy-container">
        {/* Top Tab Marker (Unified Design) */}
        <div className="how-tab-marker-bar">
          <div className="how-tab-item active">
            <span className="how-marker-square"></span>
            <span className="how-tab-label">How It Works</span>
          </div>
          <div className="how-tab-divider-line"></div>
        </div>

        {/* Section Header */}
        <div className="laundy-how-header-row">
          <motion.h2 
            className="laundy-how-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
          >
            From pickup to delivery<br />we make laundry care easy
          </motion.h2>
          <motion.p 
            className="laundy-how-subtitle"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.15 }}
          >
            Our process is designed to make laundry effortless. Simply schedule a pickup collect your clothes.
          </motion.p>
        </div>

        {/* 3-Column Steps Grid with Center Image */}
        <div className="laundy-how-grid">
          {/* Left Column: Steps 01 and 02 */}
          <div className="how-col how-left-col">
            <motion.div 
              className="how-card"
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.1 }}
              whileHover={{ y: -8, scale: 1.02, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}
            >
              <div className="how-number">01</div>
              <h3 className="how-card-title">Book your slot</h3>
              <p className="how-card-desc">
                Choose a 1-hour doorstep pickup slot across Indiranagar, HSR, Koramangala & Whitefield.
              </p>
            </motion.div>

            <motion.div 
              className="how-card"
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.2 }}
              whileHover={{ y: -8, scale: 1.02, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}
            >
              <div className="how-number">02</div>
              <h3 className="how-card-title">Doorstep collection</h3>
              <p className="how-card-desc">
                Our verified Poshak rider arrives with waterproof laundry bags to safely collect your items.
              </p>
            </motion.div>
          </div>

          {/* Center Column: Featured Doorstep Courier Photo */}
          <motion.div 
            className="how-col how-center-col"
            initial={{ opacity: 0, scale: 0.94, y: 30 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.25 }}
          >
            <motion.div 
              className="how-center-photo-card"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <img 
                src="https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=800&q=85" 
                alt="Doorstep Laundry Handover" 
                className="how-courier-img"
              />
              <div className="how-photo-user-badge">
                <div className="how-badge-top-row">
                  <img 
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80" 
                    alt="Poshak Avatar" 
                    className="how-badge-avatar"
                  />
                  <div className="how-badge-text">
                    <span className="how-badge-name">Poshak</span>
                    <span className="how-badge-handle">@poshak</span>
                  </div>
                </div>
                <div className="how-badge-bottom-row">
                  <div className="how-badge-avatar-stack">
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=60&q=80" alt="User" />
                    <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=60&q=80" alt="User" />
                    <img src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=60&q=80" alt="User" />
                  </div>
                  <span className="how-badge-reviews">Verified Doorstep Care</span>
                  <svg className="how-badge-wave" viewBox="0 0 50 20" width="50" height="20">
                    <path d="M 0 15 Q 12 5, 25 15 T 50 10" fill="none" stroke="#fa5929" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column: Steps 03 and 04 */}
          <div className="how-col how-right-col">
            <motion.div 
              className="how-card"
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.3 }}
              whileHover={{ y: -8, scale: 1.02, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}
            >
              <div className="how-number">03</div>
              <h3 className="how-card-title">RO wash & steam press</h3>
              <p className="how-card-desc">
                Weighed fairly in kg, washed in softened RO water, and Italian vacuum steam pressed.
              </p>
            </motion.div>

            <motion.div 
              className="how-card"
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.4 }}
              whileHover={{ y: -8, scale: 1.02, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}
            >
              <div className="how-number">04</div>
              <h3 className="how-card-title">Delivered to your door</h3>
              <p className="how-card-desc">
                Delivered crisp and fresh right back to your apartment or tech park on time.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};


