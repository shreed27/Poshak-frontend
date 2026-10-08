import React from 'react';
import { 
  Smartphone, 
  Package, 
  Sparkles, 
  Truck, 
  CheckCircle2, 
  ArrowRight 
} from 'lucide-react';
import { HOW_IT_WORKS_STEPS } from '../data/mockData';

const iconMap = {
  Smartphone,
  Package,
  Sparkles,
  Truck
};

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="how-it-works-section">
      <div className="section-container">
        <div className="section-header-center">
          <div className="section-sub-badge">
            <Sparkles size={13} />
            <span>Effortless 4-Step Process</span>
          </div>
          <h2 className="section-title">How Poshak Works in 4 Simple Steps</h2>
          <p className="section-desc">
            No more weekend laundry battles, damp drying clothes during monsoons, or burnt shirts.
          </p>
        </div>

        <div className="steps-cards-grid">
          {HOW_IT_WORKS_STEPS.map((stepItem, idx) => {
            const Icon = iconMap[stepItem.icon] || Sparkles;

            return (
              <div key={idx} className="how-step-card glass-card hover-lift">
                <div className="step-card-top">
                  <span className="step-number-watermark">{stepItem.step}</span>
                  <div className="step-icon-wrap">
                    <Icon size={24} />
                  </div>
                  <span className="step-badge-pill">{stepItem.badge}</span>
                </div>

                <div className="step-card-content">
                  <h3 className="step-title">{stepItem.title}</h3>
                  <p className="step-description">{stepItem.desc}</p>
                </div>

                {idx < HOW_IT_WORKS_STEPS.length - 1 && (
                  <div className="step-flow-arrow">
                    <ArrowRight size={18} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Feature Banner Quote */}
        <div className="how-it-works-banner glass-card">
          <div className="banner-left">
            <h3>Ready to experience frictionless laundry?</h3>
            <p>Schedule your first 15-minute doorstep pickup now and enjoy ₹150 OFF.</p>
          </div>
          <a href="#laundromats" className="btn-primary-hero">
            <span>Find Laundromats Near Me</span>
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
};
