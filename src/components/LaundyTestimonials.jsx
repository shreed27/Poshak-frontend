import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Star, Quote } from 'lucide-react';
import { LAUNDY_TESTIMONIALS } from '../data/laundyData';

export const LaundyTestimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? LAUNDY_TESTIMONIALS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev === LAUNDY_TESTIMONIALS.length - 1 ? 0 : prev + 1));
  };

  const activeReview = LAUNDY_TESTIMONIALS[currentIndex];

  return (
    <section className="laundy-testimonials-section">
      <div className="laundy-container">
        {/* Top Tab Marker (Unified Design) */}
        <div className="testimonials-tab-marker-bar">
          <div className="testimonials-tab-item active">
            <span className="testimonials-marker-square"></span>
            <span className="testimonials-tab-label">Client Stories</span>
          </div>
          <div className="testimonials-tab-divider-line"></div>
        </div>

        {/* Section Header Row */}
        <div className="laundy-testimonials-header-row">
          <motion.h2 
            className="laundy-testimonials-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
          >
            Loved by people who<br />value their time
          </motion.h2>

          <div className="testimonial-header-ctrls">
            <motion.button 
              className="slider-ctrl-pill-btn" 
              onClick={handlePrev} 
              aria-label="Previous review"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
            >
              <ArrowLeft size={18} />
            </motion.button>
            <motion.button 
              className="slider-ctrl-pill-btn" 
              onClick={handleNext} 
              aria-label="Next review"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
            >
              <ArrowRight size={18} />
            </motion.button>
          </div>
        </div>

        {/* Testimonial Feature Card */}
        <motion.div 
          className="laundy-testimonials-card-frame"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.1 }}
        >
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentIndex}
              className="testimonial-card-inner"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="testimonial-rating-row">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} fill="#fa5929" color="#fa5929" />
                ))}
              </div>

              <h3 className="testimonial-hero-quote">
                “{activeReview.quote}”
              </h3>

              <div className="testimonial-author-footer">
                <img 
                  src={activeReview.avatar} 
                  alt={activeReview.name} 
                  className="testimonial-author-avatar" 
                />
                <div className="testimonial-author-meta">
                  <span className="testimonial-author-name">{activeReview.name}</span>
                  <span className="testimonial-author-role">{activeReview.role}</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};
