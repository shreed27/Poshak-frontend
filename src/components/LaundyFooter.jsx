import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LegalModal } from './LegalModals';

export const LaundyFooter = ({ onNavClick, onOpenBooking }) => {
  const [activeLegalTab, setActiveLegalTab] = useState(null);
  return (
    <footer className="laundy-footer-master-root">
      {/* Background Bubble Foam Texture */}
      <div className="footer-foam-backdrop">
        <div className="footer-foam-gradient-mask"></div>
      </div>

      <div className="laundy-container footer-relative-content">
        {/* Top CTA Row */}
        <div className="footer-cta-row">
          <motion.div 
            className="footer-cta-left"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
          >
            <h2 className="footer-cta-title">
              Fresh, clean clothes<br />
              are just one click away.
            </h2>
          </motion.div>

          <motion.div 
            className="footer-cta-right"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.1 }}
          >
            <p className="footer-cta-desc">
              Experience the convenience of having your laundry expertly cleaned and delivered right to your.
            </p>
            <motion.button 
              className="footer-get-started-btn"
              onClick={onOpenBooking}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              Get Started
            </motion.button>
          </motion.div>
        </div>

        {/* Divider Line */}
        <div className="footer-main-divider"></div>

        {/* Middle 4-Column Navigation Grid */}
        <div className="footer-middle-grid">
          {/* Col 1: Brand & Tagline */}
          <div className="footer-brand-col">
            <span className="footer-brand-serif">Poshak</span>
            <p className="footer-brand-desc">
              Bengaluru's premier garment care & laundry ecosystem. Doorstep pickup across Indiranagar, Koramangala, HSR Layout, Whitefield & more.
            </p>
          </div>

          {/* Col 2: Pages */}
          <div className="footer-links-col">
            <span className="footer-column-title">Pages</span>
            <ul className="footer-links-list">
              <li><a href="#home" onClick={(e) => { e.preventDefault(); onNavClick('home'); }}>Home</a></li>
              <li><a href="#about" onClick={(e) => { e.preventDefault(); onNavClick('about'); }}>About</a></li>
              <li><a href="#services" onClick={(e) => { e.preventDefault(); onNavClick('services'); }}>Services</a></li>
              <li><a href="#pricing" onClick={(e) => { e.preventDefault(); onNavClick('pricing'); }}>Pricing</a></li>
            </ul>
          </div>

          {/* Col 3: Utilities */}
          <div className="footer-links-col">
            <span className="footer-column-title">Service Hubs</span>
            <ul className="footer-links-list">
              <li><a href="#services" onClick={(e) => { e.preventDefault(); onNavClick('services'); }}>Indiranagar & CBD</a></li>
              <li><a href="#services" onClick={(e) => { e.preventDefault(); onNavClick('services'); }}>Koramangala & HSR</a></li>
              <li><a href="#services" onClick={(e) => { e.preventDefault(); onNavClick('services'); }}>Whitefield & Bellandur</a></li>
              <li><a href="#contact" onClick={(e) => { e.preventDefault(); onOpenBooking && onOpenBooking(); }}>JP Nagar & Jayanagar</a></li>
            </ul>
          </div>

          {/* Col 4: Contact Info */}
          <div className="footer-links-col">
            <span className="footer-column-title">Bengaluru Desk</span>
            <ul className="footer-links-list contact-list">
              <li><a href="mailto:care@poshak.in">care@poshak.in</a></li>
              <li><a href="tel:+918045678900">+91 80 4567 8900</a></li>
              <li className="footer-city-tag">Karnataka, India</li>
            </ul>
          </div>
        </div>

        {/* Copyright Line & DPDP Statutory Links */}
        <div className="footer-copyright-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <span>© 2026 <span className="text-orange">Poshak Technologies Pvt. Ltd.</span> All Rights Reserved</span>
          <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.82rem', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              onClick={() => setActiveLegalTab('dpdp')} 
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              DPDP Privacy Notice
            </button>
            <button 
              type="button" 
              onClick={() => setActiveLegalTab('terms')} 
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              Terms of Service
            </button>
            <button 
              type="button" 
              onClick={() => setActiveLegalTab('rights')} 
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              Data Principal Rights
            </button>
            <button 
              type="button" 
              onClick={() => setActiveLegalTab('grievance')} 
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              Grievance Officer
            </button>
          </div>
        </div>

        {/* Giant Bottom Watermark Typography */}
        <div className="footer-giant-watermark-row">
          <motion.h1 
            className="footer-giant-watermark-text"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            Poshak
          </motion.h1>
        </div>
      </div>

      {/* DPDP Act 2023 Statutory Legal Modal */}
      <LegalModal 
        isOpen={Boolean(activeLegalTab)}
        initialTab={activeLegalTab || 'dpdp'}
        onClose={() => setActiveLegalTab(null)}
      />
    </footer>
  );
};
