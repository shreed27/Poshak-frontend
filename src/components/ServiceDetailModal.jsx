import React from 'react';
import { X, Check, Clock, Star, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export const ServiceDetailModal = ({ service, onClose, onBookService }) => {
  if (!service) return null;

  return (
    <div className="laundy-modal-backdrop" onClick={onClose}>
      <div className="laundy-service-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <button className="laundy-modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {/* Modal Banner Image */}
        <div className="service-modal-banner">
          <img src={service.image} alt={service.name} className="service-modal-img" />
          <div className="service-modal-banner-overlay">
            <span className="service-modal-badge">{service.tagline}</span>
            <h2 className="service-modal-title">{service.name}</h2>
            <div className="service-modal-meta-row">
              <span>💰 {service.price}</span>
              <span>•</span>
              <span>⏱️ {service.turnaround}</span>
              <span>•</span>
              <span>🌿 Eco-Safe Formulas</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="service-modal-body">
          {/* Overview */}
          <div className="service-modal-section">
            <h4 className="modal-section-title">Overview</h4>
            <p className="modal-section-text">{service.description}</p>
            <p className="modal-section-text">
              At our laundry agency, we’re committed to making your everyday life easier with reliable, high-quality cleaning services tailored to your needs. From everyday garments to delicate fabrics, we handle each item with care, precision, and attention to detail.
            </p>
          </div>

          {/* Key Focus Area */}
          <div className="service-modal-section">
            <h4 className="modal-section-title">Key Focus Areas</h4>
            <div className="modal-focus-list">
              {service.keyFocus.map((item, idx) => (
                <div key={idx} className="modal-focus-item">
                  <div className="focus-check-icon">
                    <Check size={14} />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Client Testimonial Quote */}
          {service.testimonial && (
            <div className="service-modal-quote-card">
              <p className="modal-quote-text">“{service.testimonial.quote}”</p>
              <div className="modal-quote-author">
                <strong>{service.testimonial.author}</strong> — {service.testimonial.role}
              </div>
            </div>
          )}

          {/* Footer Action */}
          <div className="service-modal-footer-cta">
            <button 
              className="laundy-pill-btn-orange full-width"
              onClick={() => {
                onClose();
                onBookService(service);
              }}
            >
              <span>Schedule {service.name} Pickup</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
