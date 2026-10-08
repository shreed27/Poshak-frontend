import React from 'react';
import { 
  Shirt, 
  Sparkles, 
  Zap, 
  Crown, 
  Flame, 
  Footprints, 
  Layers, 
  Clock, 
  ArrowRight,
  Plus
} from 'lucide-react';
import { SERVICE_CATEGORIES } from '../data/mockData';
import { useCart } from '../context/CartContext';

const iconMap = {
  Shirt: Shirt,
  Sparkles: Sparkles,
  Zap: Zap,
  Crown: Crown,
  Flame: Flame,
  Footprints: Footprints,
  Layers: Layers
};

export const ServiceCategories = ({ onSelectCategory }) => {
  const { addItem } = useCart();

  const handleQuickAdd = (service) => {
    // Generate a default service item for quick booking
    const cartItem = {
      id: `svc-${service.id}`,
      name: service.name,
      price: service.id === 'wash-fold' ? 49 :
             service.id === 'wash-iron' ? 69 :
             service.id === 'express-6h' ? 99 :
             service.id === 'dry-clean' ? 149 :
             service.id === 'steam-press' ? 15 :
             service.id === 'shoe-spa' ? 249 : 199,
      unit: service.price,
      type: service.id.includes('fold') || service.id.includes('iron') ? 'weight' : 'piece',
      icon: service.icon
    };
    addItem(cartItem, null);
  };

  return (
    <section id="services" className="services-section">
      <div className="section-container">
        <div className="section-header-row">
          <div>
            <div className="section-sub-badge">
              <Sparkles size={13} />
              <span>Tailored Wardrobe Care</span>
            </div>
            <h2 className="section-title">What would you like cleaned today?</h2>
            <p className="section-desc">
              From everyday campus tees to wedding silks and high-top sneakers, we treat every fiber with laboratory precision.
            </p>
          </div>
          <a href="#calculator" className="view-all-rates-link">
            <span>View Full Rate Card</span>
            <ArrowRight size={16} />
          </a>
        </div>

        <div className="services-grid">
          {SERVICE_CATEGORIES.map((service) => {
            const IconComponent = iconMap[service.icon] || Shirt;
            return (
              <div 
                key={service.id} 
                className="service-card glass-card hover-lift"
                onClick={() => onSelectCategory && onSelectCategory(service.id)}
              >
                <div className="service-image-wrap">
                  <img src={service.image} alt={service.name} className="service-img" loading="lazy" />
                  <div className="service-badge-pill" style={{ backgroundColor: service.bgColor, color: service.color }}>
                    {service.badge}
                  </div>
                  <div className="service-delivery-pill">
                    <Clock size={12} />
                    <span>{service.deliveryTime}</span>
                  </div>
                </div>

                <div className="service-card-body">
                  <div className="service-header">
                    <div className="service-icon-box" style={{ backgroundColor: service.bgColor, color: service.color }}>
                      <IconComponent size={20} />
                    </div>
                    <div>
                      <h3 className="service-name">{service.name}</h3>
                      <span className="service-tagline">{service.tagline}</span>
                    </div>
                  </div>

                  <p className="service-description">{service.description}</p>

                  <div className="service-card-footer">
                    <div className="service-price-block">
                      <span className="price-start-label">Starting at</span>
                      <span className="service-price-val" style={{ color: service.color }}>{service.price}</span>
                    </div>

                    <button 
                      className="quick-add-service-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickAdd(service);
                      }}
                      title="Add to Basket"
                    >
                      <Plus size={16} />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
