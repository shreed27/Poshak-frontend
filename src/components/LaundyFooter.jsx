import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LegalModal } from './LegalModals';
import { useCatalog } from '../context/CatalogContext';
import { supportPhone } from '../lib/brand';
import { SERVICE_AREA } from '../lib/serviceArea';

export const LaundyFooter = ({ onNavClick, onOpenBooking }) => {
  const [activeLegalTab, setActiveLegalTab] = useState(null);
  // Contact details and the service area come from Admin → Prices & settings, so the website never shows made-up ones.
  const { support, settings } = useCatalog();
  const area = settings?.service_area || {};
  const areaName = area.name || SERVICE_AREA.name;
  const radius = Number(area.radius_km || SERVICE_AREA.radiusKm);
  const email = support?.email || 'support@poshak.in';
  const phone = supportPhone(support);
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
              Experience the convenience of having your laundry expertly cleaned and delivered right to your door.
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
              Doorstep laundry in Bengaluru, priced by the kilo. Pickup and delivery around {areaName}.
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

          {/* Col 3: Where we serve (from settings) */}
          <div className="footer-links-col">
            <span className="footer-column-title">Where we serve</span>
            <ul className="footer-links-list">
              <li><a href="#services" onClick={(e) => { e.preventDefault(); onNavClick('services'); }}>{areaName}</a></li>
              <li className="footer-city-tag">Within {radius} km · Bengaluru</li>
            </ul>
          </div>

          {/* Col 4: Contact Info */}
          <div className="footer-links-col">
            <span className="footer-column-title">Contact</span>
            <ul className="footer-links-list contact-list">
              <li><a href={`mailto:${email}`}>{email}</a></li>
              {phone && <li><a href={`tel:${phone.replace(/[^+\d]/g, '')}`}>{phone}</a></li>}
              <li className="footer-city-tag">Karnataka, India</li>
            </ul>
          </div>
        </div>

        {/* Copyright Line & DPDP Statutory Links */}
        <div className="footer-copyright-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <span>© {new Date().getFullYear()} <span className="text-orange">Poshak</span>. All rights reserved.</span>
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
