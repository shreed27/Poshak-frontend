import React from 'react';
import { 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  ArrowRight, 
  Shirt, 
  Flame, 
  Footprints, 
  Crown,
  CheckCircle2,
  TrendingUp,
  Star
} from 'lucide-react';
import { useCart } from '../context/CartContext';

export const Hero = ({ onExploreServices, onOpenCalculator, onSelectLaundromats }) => {
  const { setIsCartOpen } = useCart();

  return (
    <section className="hero-section">
      {/* Ambient background glow elements */}
      <div className="ambient-glow glow-1"></div>
      <div className="ambient-glow glow-2"></div>
      <div className="ambient-glow glow-3"></div>

      <div className="hero-container">
        <div className="hero-grid">
          {/* Left Column: Punchy Headline & CTA */}
          <div className="hero-content-col">
            <div className="hero-pill-tag">
              <span className="pill-dot-pulse"></span>
              <Sparkles size={14} className="sparkle-gold" />
              <span>India's 1st Hyperlocal Laundry & Garment Care Hub</span>
            </div>

            <h1 className="hero-main-title">
              Like <span className="text-gradient-coral">Zomato</span>, but for your{' '}
              <span className="text-gradient-blue">Wardrobe.</span>
            </h1>

            <p className="hero-description">
              Browse top-rated neighborhood laundromats, artisan dry cleaners, and sneaker spas. 
              Get doorstep pickup in <strong>15 minutes</strong>, washed in pure RO water, boiler steam pressed, 
              and delivered fresh in as fast as <strong>6 hours</strong>.
            </p>

            {/* Quick Hero Action Buttons */}
            <div className="hero-cta-group">
              <a href="#laundromats" className="btn-primary-hero pulse-glow">
                <Shirt size={18} />
                <span>Explore Nearby Laundromats</span>
                <ArrowRight size={18} />
              </a>
              <a href="#calculator" className="btn-secondary-hero">
                <Sparkles size={18} />
                <span>Instant Cost Estimator</span>
              </a>
            </div>

            {/* Quick micro-stats pill row */}
            <div className="hero-stats-row">
              <div className="hero-stat-item">
                <div className="stat-icon-wrap blue">
                  <Clock size={16} />
                </div>
                <div className="stat-info">
                  <span className="stat-number">15 Mins</span>
                  <span className="stat-label">Doorstep Pickup</span>
                </div>
              </div>

              <div className="hero-stat-item">
                <div className="stat-icon-wrap orange">
                  <Zap size={16} />
                </div>
                <div className="stat-info">
                  <span className="stat-number">6 Hours</span>
                  <span className="stat-label">Express Blitz Turnaround</span>
                </div>
              </div>

              <div className="hero-stat-item">
                <div className="stat-icon-wrap green">
                  <ShieldCheck size={16} />
                </div>
                <div className="stat-info">
                  <span className="stat-number">₹5,000</span>
                  <span className="stat-label">Fabric Safe Guarantee</span>
                </div>
              </div>
            </div>

            {/* Micro guarantees */}
            <div className="hero-guarantees">
              <span><CheckCircle2 size={14} className="check-icon" /> Zero Clothes Mixing</span>
              <span><CheckCircle2 size={14} className="check-icon" /> Bio-Enzyme RO Wash</span>
              <span><CheckCircle2 size={14} className="check-icon" /> Free Doorstep Delivery</span>
            </div>
          </div>

          {/* Right Column: Interactive Hero Mockup Card / Live Visualizer */}
          <div className="hero-visual-col">
            <div className="hero-card-stack">
              {/* Main App Showcase Card */}
              <div className="hero-main-card glass-card">
                <div className="card-header-bar">
                  <div className="hub-status">
                    <span className="status-dot-active"></span>
                    <span>Live Hub Dispatch</span>
                  </div>
                  <div className="location-chip">
                    <MapPin size={12} />
                    <span>Indiranagar • 1.2 km</span>
                  </div>
                </div>

                <div className="hero-laundromat-preview">
                  <img 
                    src="https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=700&q=80" 
                    alt="Premium German Miele Laundromat" 
                    className="hero-card-img"
                  />
                  <div className="hero-img-overlay">
                    <div className="partner-badge-row">
                      <span className="rating-pill">⭐ 4.9 (1.4k+ reviews)</span>
                      <span className="delivery-pill">⚡ 6-Hr Express</span>
                    </div>
                  </div>
                </div>

                <div className="hero-card-body">
                  <div className="hub-title-row">
                    <div>
                      <h2 className="hub-name">The White Collar & Co.</h2>
                      <p className="hub-sub">German Miele Washers • Italian Boiler Press</p>
                    </div>
                    <div className="price-tag-hero">
                      <span className="from">From</span>
                      <span className="price">₹49<small>/kg</small></span>
                    </div>
                  </div>

                  {/* Micro service tabs inside hero card */}
                  <div className="hero-service-chips">
                    <div className="service-chip-hero active">
                      <Shirt size={14} />
                      <span>Wash & Fold</span>
                    </div>
                    <div className="service-chip-hero">
                      <Flame size={14} />
                      <span>Steam Iron</span>
                    </div>
                    <div className="service-chip-hero">
                      <Crown size={14} />
                      <span>Dry Clean</span>
                    </div>
                    <div className="service-chip-hero">
                      <Footprints size={14} />
                      <span>Sneaker Spa</span>
                    </div>
                  </div>

                  <a href="#laundromats" className="hero-order-now-btn">
                    <span>Select Partner & Book Pickup</span>
                    <ArrowRight size={16} />
                  </a>
                </div>
              </div>

              {/* Floating Live Tracking notification pill */}
              <div className="floating-order-tracker glass-card float-anim-1">
                <div className="pulse-icon-wrapper">
                  <Zap size={18} className="zap-icon" />
                </div>
                <div className="floating-text">
                  <div className="floating-title">Express Blitz in Progress</div>
                  <div className="floating-desc">Rider Vikram is 4 mins away from doorstep</div>
                </div>
                <div className="floating-step-badge">Steaming ♨️</div>
              </div>

              {/* Floating customer rating badge */}
              <div className="floating-rating-badge glass-card float-anim-2">
                <div className="star-row">
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                  <Star size={14} fill="#f59e0b" color="#f59e0b" />
                </div>
                <div className="rating-desc">
                  <strong>4.9 / 5.0</strong> from 25,000+ happy wardrobes
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
