import React, { useState } from 'react';
import { 
  Star, 
  Quote, 
  ChevronDown, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle,
  ThumbsUp
} from 'lucide-react';
import { TESTIMONIALS, FAQS } from '../data/mockData';

export const ReviewsSection = () => {
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? -1 : index);
  };

  return (
    <section id="reviews" className="reviews-section">
      <div className="section-container">
        {/* Testimonials Header */}
        <div className="section-header-center">
          <div className="section-sub-badge">
            <Star size={13} />
            <span>Real Customer Stories</span>
          </div>
          <h2 className="section-title">Loved by Bengaluru, Mumbai & Delhi NCR</h2>
          <p className="section-desc">
            Over 25,000+ happy customers have upgraded their weekend routine with Poshak.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="testimonials-grid">
          {TESTIMONIALS.map((review) => (
            <div key={review.id} className="testimonial-card glass-card hover-lift">
              <div className="testimonial-header">
                <div className="user-profile-row">
                  <img src={review.avatar} alt={review.name} className="reviewer-img" />
                  <div>
                    <h3 className="reviewer-name">{review.name}</h3>
                    <span className="reviewer-role">{review.role}</span>
                  </div>
                </div>
                <Quote size={24} className="quote-icon" />
              </div>

              <div className="testimonial-stars-row">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />
                ))}
                <span className="review-service-badge">{review.service}</span>
              </div>

              <p className="testimonial-quote">"{review.text}"</p>

              <div className="testimonial-footer">
                <span className="verified-badge">
                  <CheckCircle2 size={13} />
                  Verified Poshak Order
                </span>
                <span className="review-date">{review.date}</span>
              </div>
            </div>
          ))}
        </div>

        {/* FAQs Accordion */}
        <div className="faqs-container">
          <div className="faq-header-row">
            <div className="faq-title-col">
              <div className="section-sub-badge">
                <HelpCircle size={13} />
                <span>Frequently Asked Questions</span>
              </div>
              <h2 className="section-title">Got Questions? We've Got Answers.</h2>
            </div>
          </div>

          <div className="faq-accordion-list">
            {FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index} 
                  className={`faq-item glass-card ${isOpen ? 'open' : ''}`}
                  onClick={() => toggleFaq(index)}
                >
                  <div className="faq-question-row">
                    <h3 className="faq-question">{faq.q}</h3>
                    <ChevronDown size={18} className={`faq-chevron ${isOpen ? 'rotate' : ''}`} />
                  </div>
                  {isOpen && (
                    <div className="faq-answer-content">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
