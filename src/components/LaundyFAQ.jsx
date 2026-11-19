import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';
import { SERVICE_AREA } from '../lib/serviceArea';

export const LaundyFAQ = () => {
  const [openIdx, setOpenIdx] = useState(0);
  const { services } = useCatalog();
  const prices = Object.fromEntries(services.map((s) => [s.id, s.price]));

  const faqs = [
    {
      q: 'How do I schedule a Poshak pickup?',
      a: 'Open the app, add your pickup address, choose Wash & Fold or Wash, Fold & Iron, pick a time slot and confirm. A captain is assigned and you can follow them live on the map, with an arrival time.'
    },
    {
      q: 'What does it cost?',
      a: `Wash & Fold is ${prices['wash-fold'] || '₹59/kg'} and Wash, Fold & Iron is ${prices['wash-iron'] || '₹89/kg'}. Your clothes are weighed at your door, so you pay for exactly what they weigh. Alteration & Dry Cleaning has no fixed price — you describe the job and we send you a quote.`
    },
    {
      q: 'How does Alteration & Dry Cleaning work?',
      a: 'Tap “Request a quote”, tell us what you need and add a photo if you like. We reply with a fixed price, usually within a few hours. Nothing is booked until you accept, and then a captain collects the items like any other order.'
    },
    {
      q: 'What areas do you serve?',
      a: `We currently pick up and deliver in ${SERVICE_AREA.name}. We’ll check your pin on the map when you add your address, and we’re expanding soon.`
    },
    {
      q: 'How long does it take?',
      a: 'Wash & Fold and Wash, Fold & Iron are ready in about 24 hours. Alteration and dry cleaning timelines are given in your quote.'
    },
    {
      q: 'How do I pay?',
      a: 'Pay on delivery by cash or UPI, or pay online (UPI, cards, netbanking) from your order. You can also use your Poshak wallet balance.'
    }
  ];

  const toggle = (idx) => {
    setOpenIdx(openIdx === idx ? -1 : idx);
  };

  return (
    <section id="faq" className="laundy-faq-section dark-faq-section">
      <div className="laundy-container">
        {/* Top Tab Marker (Unified Design) */}
        <div className="faq-tab-marker-bar">
          <div className="faq-tab-item active">
            <span className="faq-marker-square"></span>
            <span className="faq-tab-label">FAQ</span>
          </div>
          <div className="faq-tab-divider-line"></div>
        </div>

        {/* Section Header Row */}
        <div className="laundy-faq-header-row">
          <motion.h2 
            className="laundy-faq-heading-dark"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
          >
            Got questions?<br />
            We’ve got{' '}
            <span className="faq-inline-avatar-stack">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80" alt="Avatar" />
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80" alt="Avatar" />
              <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80" alt="Avatar" />
            </span>{' '}
            answers!
          </motion.h2>

          <motion.p 
            className="laundy-faq-sub-dark"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.15 }}
          >
            Laundry professionals committed to making your life easier—one wash at a time.
          </motion.p>
        </div>

        {/* FAQ Grid: Accordion Left + Laundromat Photo Card Right */}
        <div className="laundy-faq-grid-split">
          {/* Accordion List */}
          <div className="faq-accordion-col">
            {faqs.map((faq, idx) => {
              const isOpen = openIdx === idx;
              return (
                <motion.div 
                  key={idx} 
                  className={`faq-accordion-item ${isOpen ? 'open' : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.06 }}
                >
                  <button 
                    className="faq-question-btn"
                    onClick={() => toggle(idx)}
                  >
                    <span className="faq-q-prefix">Q.</span>
                    <span className="faq-q-text">{faq.q}</span>
                    <div className={`faq-toggle-icon-circle ${isOpen ? 'icon-orange' : 'icon-muted'}`}>
                      {isOpen ? <X size={16} color="#ffffff" /> : <Plus size={16} color="#ffffff" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div 
                        className="faq-answer-wrap"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.35, ease: 'easeInOut' }}
                      >
                        <p className="faq-answer-text">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Right Side Laundromat Image Card */}
          <motion.div 
            className="faq-photo-card-col"
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="faq-photo-card-wrap">
              <img 
                src="https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=85" 
                alt="Retro Laundromat Machines" 
                className="faq-laundromat-img"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};


