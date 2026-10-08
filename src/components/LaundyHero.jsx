import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play, ShieldCheck, Zap, Star } from 'lucide-react';

export const LaundyHero = ({ onScrollToServices, onOpenBooking }) => {
  return (
    <section id="home" className="laundy-hero-section">
      {/* Main Full-Bleed Background Image */}
      <div className="laundy-hero-bg-wrapper">
        <motion.img 
          src="/hero-specialist.jpg" 
          alt="Poshak Master Garment Specialist" 
          className="laundy-hero-bg-img"
          initial={{ scale: 1.05, opacity: 0 }}
          animate={{ scale: 1.0, opacity: 1 }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
        />
        <div className="laundy-hero-dark-overlay"></div>
      </div>

      {/* Content Container */}
      <div className="laundy-hero-container">
        {/* Floating Left Testimonial Card */}
        <motion.div 
          className="laundy-hero-left-card"
          initial={{ opacity: 0, x: -30, y: 15 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 22, delay: 0.2 }}
        >
          <div className="laundy-hero-avatars-capsule">
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" 
              alt="Client 1" 
              className="hero-avatar-circle"
            />
            <img 
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" 
              alt="Client 2" 
              className="hero-avatar-circle"
            />
            <img 
              src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" 
              alt="Client 3" 
              className="hero-avatar-circle"
            />
          </div>
          <p className="laundy-hero-left-quote">
            Poshak Care made managing our daily pickups effortless across Bengaluru. From doorstep collection to express delivery, everything runs on time.
          </p>
        </motion.div>

        {/* Floating Right Services Preview Card */}
        <motion.div 
          className="laundy-hero-right-card" 
          onClick={onScrollToServices}
          initial={{ opacity: 0, x: 30, y: 15 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ type: "spring", stiffness: 180, damping: 22, delay: 0.3 }}
          whileHover={{ y: -6, scale: 1.03, boxShadow: "0 25px 45px rgba(0,0,0,0.25)" }}
          whileTap={{ scale: 0.97 }}
        >
          <div className="hero-video-thumb-wrap">
            <img 
              src="https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=600&q=80" 
              alt="Services Preview" 
              className="hero-video-img"
            />
            <div className="hero-play-button">
              <Play size={14} fill="#fa5929" color="#fa5929" />
            </div>
          </div>
          <div className="hero-video-cta-row">
            <span>Check out our services</span>
            <ArrowRight size={16} />
          </div>
        </motion.div>

        {/* Huge Bottom Watermark "Poshak" */}
        <motion.div 
          className="laundy-giant-watermark-wrap"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="laundy-giant-watermark-text">Poshak</span>
        </motion.div>
      </div>
    </section>
  );
};

