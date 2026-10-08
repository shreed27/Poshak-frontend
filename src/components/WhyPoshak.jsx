import React from 'react';
import { 
  MapPin, 
  ShieldCheck, 
  Leaf, 
  Zap, 
  BadgePercent, 
  Truck, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { WHY_POSHAK_FEATURES } from '../data/mockData';

const iconMap = {
  MapPin,
  ShieldCheck,
  Leaf,
  Zap,
  BadgePercent,
  Truck
};

export const WhyPoshak = () => {
  return (
    <section className="why-poshak-section">
      <div className="section-container">
        <div className="section-header-center">
          <div className="section-sub-badge">
            <ShieldCheck size={13} />
            <span>The Poshak Gold Standard</span>
          </div>
          <h2 className="section-title">Why 25,000+ Smart Urbanites Trust Poshak</h2>
          <p className="section-desc">
            We combined the speed of rapid delivery with the care of master fabric technicians.
          </p>
        </div>

        <div className="why-features-grid">
          {WHY_POSHAK_FEATURES.map((feature, idx) => {
            const Icon = iconMap[feature.icon] || Sparkles;

            return (
              <div key={idx} className="why-feature-card glass-card hover-lift">
                <div className="why-card-header">
                  <div className="why-icon-box">
                    <Icon size={22} />
                  </div>
                  <span className="why-highlight-badge">{feature.highlight}</span>
                </div>

                <div className="why-card-body">
                  <h3 className="why-title">{feature.title}</h3>
                  <span className="why-subtitle">{feature.subtitle}</span>
                  <p className="why-desc">{feature.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quality guarantee trust badge bar */}
        <div className="trust-strip glass-card">
          <div className="trust-item">
            <CheckCircle2 size={18} className="trust-check" />
            <span>No Chemical Bleach</span>
          </div>
          <div className="trust-item">
            <CheckCircle2 size={18} className="trust-check" />
            <span>100% Cotton & Silk Safe</span>
          </div>
          <div className="trust-item">
            <CheckCircle2 size={18} className="trust-check" />
            <span>UV-C Sanitized</span>
          </div>
          <div className="trust-item">
            <CheckCircle2 size={18} className="trust-check" />
            <span>Dedicated Machine Batches</span>
          </div>
        </div>
      </div>
    </section>
  );
};
