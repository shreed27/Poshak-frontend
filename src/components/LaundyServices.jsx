import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { LAUNDY_SERVICES } from '../data/laundyData';

export const LaundyServices = ({ onSelectService, onOpenBooking }) => {
  const featuredBentoServices = [
    {
      id: 'wash-service',
      title: 'Wash, Dry & Fold',
      description: 'Daily laundry weighed in kg, washed with RO water & botanical formulas, and neatly folded.',
      tags: ['Daily wear', '₹95/kg', '24h Delivery'],
      price: '₹95/kg',
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=85',
      gridClass: 'bento-top-wide',
      iconType: 'straight',
      fullService: LAUNDY_SERVICES.find(s => s.id === 'wash-service') || LAUNDY_SERVICES[0]
    },
    {
      id: 'dry-cleaning',
      title: 'Dry Cleaning',
      description: 'Advanced eco-solvent dry cleaning for Kanjeevaram sarees, suits, blazers, and ethnic lehengas.',
      tags: ['Silk Sarees', 'Suits', 'Zero Odor'],
      price: 'From ₹199/pc',
      image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=85',
      gridClass: 'bento-mid-left',
      iconType: 'up-right',
      fullService: LAUNDY_SERVICES.find(s => s.id === 'dry-cleaning') || LAUNDY_SERVICES[1]
    },
    {
      id: 'bedding-care',
      title: 'Bedding & Quilt Care',
      description: 'Anti-allergen deep sanitization and thermal fluffing for duvets, razais, blankets, and bedsheets.',
      tags: ['Duvets & Razais', 'Anti-Allergen'],
      price: 'From ₹249/pc',
      image: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=800&q=85',
      gridClass: 'bento-mid-right',
      iconType: 'up-right',
      fullService: LAUNDY_SERVICES.find(s => s.id === 'bedding-care') || LAUNDY_SERVICES[3]
    },
    {
      id: 'pickup-delivery',
      title: 'Pickup & Delivery',
      description: 'Doorstep concierge collection across Indiranagar, HSR, Koramangala & Whitefield with live tracking.',
      tags: ['Bengaluru', 'Live GPS', '1-Hr Slots'],
      price: 'FREE on ₹499+',
      image: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1200&q=85',
      gridClass: 'bento-bottom-wide',
      iconType: 'up-right',
      fullService: LAUNDY_SERVICES.find(s => s.id === 'pickup-delivery') || LAUNDY_SERVICES[4]
    }
  ];

  return (
    <section id="services" className="laundy-services-section dark-services-section">
      <div className="laundy-container">
        {/* Top Tab Marker (Screenshot Match) */}
        <div className="services-tab-marker-bar">
          <div className="services-tab-item active">
            <span className="services-marker-square"></span>
            <span className="services-tab-label">What We Offer</span>
          </div>
          <div className="services-tab-divider-line"></div>
        </div>

        {/* Section Header Row (Screenshot Match) */}
        <div className="laundy-services-header-row">
          <div className="services-title-col">
            <motion.h2 
              className="laundy-services-title-dark"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
            >
              Services
            </motion.h2>
          </div>

          <div className="laundy-services-header-right">
            <motion.p 
              className="laundy-services-desc-dark"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.1 }}
            >
              From daily wear to delicate fabrics, every piece is handled with expert care to ensure.
            </motion.p>
            <motion.button 
              className="laundy-view-all-white-pill" 
              onClick={() => onOpenBooking()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>View All Services</span>
            </motion.button>
          </div>
        </div>

        {/* Services Bento Grid */}
        <motion.div className="laundy-bento-services-grid" layout>
          <AnimatePresence mode="popLayout">
            {featuredBentoServices.map((item, idx) => (
              <motion.div 
                key={item.id} 
                className={`bento-card ${item.gridClass}`}
                onClick={() => onSelectService(item.fullService)}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 25 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: "spring", stiffness: 260, damping: 24, delay: idx * 0.06 }}
                whileHover={{ y: -6, scale: 1.01 }}
              >
                <img src={item.image} alt={item.title} className="bento-bg-img" loading="lazy" />
                
                {/* Expandable White Heading Pill */}
                <div className="bento-overlay-pill">
                  <div className="bento-pill-top-row">
                    <h3 className="bento-pill-title">{item.title}</h3>
                    <motion.div 
                      className="bento-arrow-circle"
                      whileHover={{ scale: 1.1 }}
                    >
                      <ArrowUpRight size={18} color="#ffffff" strokeWidth={2.5} />
                    </motion.div>
                  </div>

                  {/* Expandable Content on Hover */}
                  <div className="bento-pill-expandable-content">
                    <p className="bento-pill-desc">{item.description}</p>
                    <div className="bento-pill-bottom-meta">
                      {item.tags && item.tags.length > 0 && (
                        <div className="bento-pill-tags">
                          {item.tags.map((t, i) => (
                            <span key={i} className="bento-mini-tag">{t}</span>
                          ))}
                        </div>
                      )}
                      <span className="bento-pill-price">{item.price}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};


