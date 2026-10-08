import React from 'react';
import { Shirt, Sparkles, Heart, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';
import { CITIES_SERVED } from '../data/mockData';

export const Footer = () => {
  return (
    <footer className="footer-root">
      <div className="section-container">
        {/* Top Cities Served Banner */}
        <div className="cities-served-banner glass-card">
          <div className="cities-header">
            <MapPin size={18} className="text-blue" />
            <h4>Now Delivering Across Major Indian Metros</h4>
          </div>
          <div className="cities-chips-row">
            {CITIES_SERVED.map((city, idx) => (
              <span key={idx} className="city-chip">
                {city}
              </span>
            ))}
          </div>
        </div>

        <div className="footer-grid">
          {/* Brand Col */}
          <div className="footer-brand-col">
            <div className="brand-logo footer-logo">
              <div className="brand-icon-wrapper">
                <Shirt className="brand-icon" />
              </div>
              <div className="brand-text-col">
                <span className="brand-title">POSHAK</span>
                <span className="brand-subtitle">ZOMATO FOR LAUNDRY</span>
              </div>
            </div>

            <p className="footer-bio">
              India's first on-demand wardrobe care platform. Connecting discerning urbanites with master neighborhood laundromats, eco steam pressing, and sneaker revival studios.
            </p>

            <div className="footer-contact-info">
              <div className="footer-contact-item">
                <Mail size={15} />
                <span>support@poshak.in</span>
              </div>
              <div className="footer-contact-item">
                <Phone size={15} />
                <span>1800-POSHAK-CARE (Toll Free)</span>
              </div>
            </div>
          </div>

          {/* Services Links */}
          <div className="footer-links-col">
            <h4 className="footer-heading">Services</h4>
            <ul className="footer-links-list">
              <li><a href="#services">Everyday Wash & Fold</a></li>
              <li><a href="#services">Italian Steam Pressing</a></li>
              <li><a href="#services">Express 6-Hour Blitz</a></li>
              <li><a href="#services">Premium Dry Cleaning</a></li>
              <li><a href="#services">Sneaker & Footwear Spa</a></li>
              <li><a href="#services">Curtains & Bedding Wash</a></li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="footer-links-col">
            <h4 className="footer-heading">Company</h4>
            <ul className="footer-links-list">
              <li><a href="#how-it-works">How Poshak Works</a></li>
              <li><a href="#laundromats">Partner Laundromats</a></li>
              <li><a href="#calculator">Price Calculator</a></li>
              <li><a href="#reviews">Customer Reviews</a></li>
              <li><a href="#faq">FAQs & Help Center</a></li>
              <li><a href="#partner">Become a Partner Laundromat</a></li>
            </ul>
          </div>

          {/* Legal & Standards */}
          <div className="footer-links-col">
            <h4 className="footer-heading">Trust & Security</h4>
            <div className="trust-pills-col">
              <div className="footer-trust-pill">
                <ShieldCheck size={16} />
                <span>₹5,000 Fabric Safe Insurance</span>
              </div>
              <div className="footer-trust-pill">
                <Sparkles size={16} />
                <span>Woolmark & RO Certified</span>
              </div>
              <div className="footer-trust-pill">
                <Shirt size={16} />
                <span>100% Dedicated Batch Wash</span>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div className="copyright-text">
            © {new Date().getFullYear()} Poshak Technologies India Pvt. Ltd. All rights reserved.
          </div>
          <div className="footer-made-with">
            <span>Crafted for crisp, effortless wardrobes</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
