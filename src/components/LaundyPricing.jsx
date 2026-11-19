import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';

export const LaundyPricing = ({ onOpenBooking }) => {
  const { services, quoteServices } = useCatalog();
  const rate = (id, fallbackNum) => {
    const x = services.find((v) => v.id === id);
    return { price: `₹${x ? x.unitPrice : fallbackNum}`, unit: `/ ${x?.unit || 'kg'}` };
  };
  const pricingPlans = [
    {
      id: 'wash-fold',
      name: 'Wash & Fold',
      badge: 'Everyday Essential',
      badgeClass: 'badge-light-orange',
      ...rate('wash-fold', 59),
      turnaround: '24 Hours',
      description: 'Daily laundry weighed at your door, washed in soft water, dried and neatly folded.',
      cardTheme: 'pricing-card-light',
      isPopular: false,
      cta: 'Schedule Pickup',
      features: [
        'Weighed and counted at your door',
        'Whites and colours washed separately',
        'Gentle detergents, soft water',
        'Neatly folded and packed',
        'Free doorstep pickup & delivery'
      ]
    },
    {
      id: 'wash-iron',
      name: 'Wash, Fold & Iron',
      badge: 'Most Popular',
      badgeClass: 'badge-orange-solid',
      ...rate('wash-iron', 89),
      turnaround: '24 Hours',
      description: 'Everything in Wash & Fold, plus a crisp steam press on every piece — ready to wear.',
      cardTheme: 'pricing-card-highlight',
      isPopular: true,
      cta: 'Schedule Pickup',
      features: [
        'Wash, dry, steam press and fold',
        'Sharp collars and cuffs on shirts',
        'Smooth finish on kurtas and trousers',
        'Photo record of every pickup',
        'Free doorstep pickup & delivery'
      ]
    },
    {
      id: 'alteration-dry-clean',
      name: quoteServices[0]?.name || 'Alteration & Dry Cleaning',
      badge: 'Free Quote',
      badgeClass: 'badge-light-orange',
      price: 'On request',
      unit: '',
      turnaround: 'quoted per item',
      description: 'Suits, sarees, lehengas, hems and fittings. Describe the job, add a photo, and we’ll send you a price.',
      cardTheme: 'pricing-card-light',
      isPopular: false,
      cta: 'Get a Quote',
      features: [
        'Tell us what you need in the app',
        'We reply with a fixed price',
        'Nothing is booked until you accept',
        'Careful handling of silks and delicates',
        'Free doorstep pickup & delivery'
      ]
    }
  ];

  return (
    <section id="pricing" className="laundy-pricing-section">
      <div className="laundy-container">
        {/* Top Tab Marker (Screenshot Match) */}
        <div className="pricing-tab-marker-bar">
          <div className="pricing-tab-item active">
            <span className="pricing-marker-square"></span>
            <span className="pricing-tab-label">Transparent Rates</span>
          </div>
          <div className="pricing-tab-divider-line"></div>
        </div>

        {/* Section Header Row */}
        <div className="laundy-pricing-header-row">
          <div>
            <motion.h2 
              className="laundy-pricing-title"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
            >
              Simple Pricing
            </motion.h2>
            <p className="pricing-subtitle-text">
              Two simple per-kilo prices, and a free quote for specialist care. Free doorstep pickup and delivery.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="pricing-header-badge-pill"
          >
            <Sparkles size={14} className="text-orange" />
            <span>Zero hidden charges • Pay on Delivery</span>
          </motion.div>
        </div>

        {/* Pricing cards */}
        <div className="laundy-pricing-cards-grid-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', maxWidth: 1100, margin: '0 auto' }}>
          {pricingPlans.map((plan, idx) => {
            const isDark = plan.cardTheme === 'pricing-card-dark';
            const isHighlight = plan.cardTheme === 'pricing-card-highlight';

            return (
              <motion.div 
                key={plan.id}
                className={`pricing-card-v2 ${plan.cardTheme} ${plan.isPopular ? 'popular-glow' : ''}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 220, damping: 22, delay: idx * 0.08 }}
                whileHover={{ y: -8, scale: 1.015 }}
              >
                {plan.isPopular && (
                  <div className="pricing-floating-ribbon">
                    <span>POPULAR</span>
                  </div>
                )}

                <div 
                  className="pricing-card-top-v2"
                  onClick={() => onOpenBooking(plan)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="pricing-card-header">
                    <span className={`pricing-plan-name ${isDark ? 'text-white' : ''}`}>
                      {plan.name}
                    </span>
                    <span className={`pricing-plan-badge ${plan.badgeClass}`}>
                      {plan.badge}
                    </span>
                  </div>

                  {/* Price Box */}
                  <div className="pricing-price-box-v2">
                    <span className={`pricing-price-num-v2 ${isDark ? 'text-white' : ''}`}>
                      {plan.price}
                    </span>
                    <span className={`pricing-price-period-v2 ${isDark ? 'text-white-sub' : ''}`}>
                      {plan.unit}
                    </span>
                  </div>

                  <p className={`pricing-card-desc-v2 ${isDark ? 'text-white-sub' : ''}`}>
                    {plan.description}
                  </p>

                  <div className={`pricing-divider ${isDark ? 'divider-dark' : ''}`}></div>

                  <div className="pricing-features-list-v2">
                    {plan.features.map((feat, fIdx) => (
                      <div key={fIdx} className={`pricing-feature-item-v2 ${isDark ? 'text-white' : ''}`}>
                        <div className={`feature-check-circle-v2 ${isDark ? 'check-white-circle' : isHighlight ? 'check-orange-circle' : 'check-dark-circle'}`}>
                          <Check size={10} color={isDark ? '#0a0a0a' : '#ffffff'} strokeWidth={3.5} />
                        </div>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="pricing-card-bottom-v2">
                  <motion.button 
                    className={`pricing-action-btn-v2 ${isDark ? 'btn-white' : isHighlight ? 'btn-orange-solid' : 'btn-dark'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenBooking(plan);
                    }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <span>{plan.cta}</span>
                  </motion.button>
                  <span className={`pricing-turnaround-tag ${isDark ? 'text-white-sub' : ''}`}>
                    ⚡ {plan.id === 'alteration-dry-clean' ? 'Timeline' : 'Ready in'} {plan.turnaround}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};


