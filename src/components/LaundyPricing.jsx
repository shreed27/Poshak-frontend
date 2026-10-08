import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, Shirt, Sparkle, Flame, Footprints } from 'lucide-react';

export const LaundyPricing = ({ onOpenBooking }) => {
  const pricingPlans = [
    {
      id: 'wash-fold',
      name: 'Wash, Dry & Fold',
      badge: 'Everyday Essential',
      badgeClass: 'badge-light-orange',
      price: '₹95',
      unit: '/ kg',
      turnaround: '24 Hours',
      description: 'Daily laundry weighed in kg, sanitized with RO water, tumble dried & neatly folded.',
      cardTheme: 'pricing-card-light',
      isPopular: false,
      features: [
        'Accurate digital weighing by kg',
        'Washed in softened RO water',
        'Gentle botanical detergents',
        'Separated darks & whites',
        'Neatly folded & sealed delivery'
      ]
    },
    {
      id: 'wash-iron',
      name: 'Wash & Iron',
      badge: 'Most Popular',
      badgeClass: 'badge-orange-solid',
      price: '₹149',
      unit: '/ kg',
      turnaround: '24-36 Hours',
      description: 'Deep RO wash + crisp Italian vacuum steam pressing for office & daily wear.',
      cardTheme: 'pricing-card-highlight',
      isPopular: true,
      features: [
        'RO wash with fabric conditioning',
        'Italian vacuum steam pressing',
        'Sharp collar & cuff crease setting',
        'Hanger delivery on request',
        'Free doorstep pickup & drop'
      ]
    },
    {
      id: 'shoe-cleaning',
      name: 'Shoe Cleaning',
      badge: 'Footwear Spa',
      badgeClass: 'badge-light-orange',
      price: '₹199',
      unit: '/ pair',
      turnaround: '48 Hours',
      description: 'Complete sole-to-lace rejuvenation for sneakers, leather shoes, loafers & sports pairs.',
      cardTheme: 'pricing-card-light',
      isPopular: false,
      features: [
        'Deep upper & sole scrubbing',
        'Shoe lace wash & reshaping',
        'Antibacterial deodorization',
        'Suede & leather material conditioning',
        'Moisture-free protective packaging'
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
              Fair rates by kg and piece with free doorstep pickup across Bengaluru.
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

        {/* 4-Card Pricing Grid */}
        <div className="laundy-pricing-cards-grid-4">
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
                    <span>Schedule Pickup</span>
                  </motion.button>
                  <span className={`pricing-turnaround-tag ${isDark ? 'text-white-sub' : ''}`}>
                    ⚡ Ready in {plan.turnaround}
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


