import React, { useState, useMemo } from 'react';
import { 
  Star, 
  MapPin, 
  Clock, 
  Tag, 
  Zap, 
  ShieldCheck, 
  SlidersHorizontal, 
  Check, 
  ArrowRight,
  Plus,
  Sparkles,
  Search
} from 'lucide-react';
import { LAUNDROMATS } from '../data/mockData';
import { useCart } from '../context/CartContext';

export const LaundromatsDirectory = ({ onOpenPartnerModal, activeSearchTerm }) => {
  const { addItem } = useCart();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [localSearch, setLocalSearch] = useState('');

  const filterTabs = [
    { id: 'all', label: 'All Laundromats' },
    { id: 'express', label: '⚡ 6-Hr Blitz Available', icon: Zap },
    { id: 'high-rated', label: '⭐ Rating 4.8+', icon: Star },
    { id: 'budget', label: '🏷️ Under ₹50/kg', icon: Tag },
    { id: 'eco', label: '🌿 Eco & Soft RO Water', icon: Sparkles },
    { id: 'sneakers', label: '👟 Sneaker & Footwear Hubs', icon: null }
  ];

  const filteredLaundromats = useMemo(() => {
    return LAUNDROMATS.filter(item => {
      // Filter by search query (from props or local)
      const query = (activeSearchTerm || localSearch).toLowerCase().trim();
      if (query) {
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesArea = item.area.toLowerCase().includes(query);
        const matchesSpecialty = item.specialties.some(s => s.toLowerCase().includes(query));
        const matchesMenu = item.menu.some(m => m.name.toLowerCase().includes(query));
        const matchesTag = item.tags.some(t => t.toLowerCase().includes(query));
        if (!matchesName && !matchesArea && !matchesSpecialty && !matchesMenu && !matchesTag) {
          return false;
        }
      }

      // Filter by tab
      if (selectedFilter === 'express') {
        return item.deliveryEstimate.toLowerCase().includes('6') || item.tags.includes('Super Fast') || item.tags.includes('Fastest in Town');
      }
      if (selectedFilter === 'high-rated') {
        return item.rating >= 4.8;
      }
      if (selectedFilter === 'budget') {
        return item.pricePerKg > 0 && item.pricePerKg <= 49;
      }
      if (selectedFilter === 'eco') {
        return item.specialties.some(s => s.toLowerCase().includes('ro') || s.toLowerCase().includes('eco') || s.toLowerCase().includes('ozone'));
      }
      if (selectedFilter === 'sneakers') {
        return item.menu.some(m => m.name.toLowerCase().includes('sneaker') || m.name.toLowerCase().includes('boots'));
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'speed') return parseInt(a.pickupTime) - parseInt(b.pickupTime);
      if (sortBy === 'price-low') return a.pricePerKg - b.pricePerKg;
      return (b.isPromoted ? 1 : 0) - (a.isPromoted ? 1 : 0);
    });
  }, [selectedFilter, sortBy, activeSearchTerm, localSearch]);

  const handleQuickAddMenuItem = (e, partner, menuItem) => {
    e.stopPropagation();
    addItem({
      id: `${partner.id}-${menuItem.id}`,
      name: `${menuItem.name} (${partner.name})`,
      price: menuItem.price,
      unit: menuItem.unit,
      type: menuItem.type,
      partnerId: partner.id,
      partnerName: partner.name
    }, partner);
  };

  return (
    <section id="laundromats" className="laundromats-section">
      <div className="section-container">
        {/* Section Header */}
        <div className="directory-header">
          <div className="directory-title-block">
            <div className="section-sub-badge">
              <Sparkles size={13} />
              <span>Hyperlocal Fabric Care Studios</span>
            </div>
            <h2 className="section-title">Verified Neighborhood Laundromats</h2>
            <p className="section-desc">
              Curated commercial hubs with medical-grade hygiene, certified stain masters, and automated steam presses near you.
            </p>
          </div>

          <div className="directory-controls">
            <div className="sort-selector-wrapper">
              <SlidersHorizontal size={15} />
              <span className="sort-label">Sort by:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-dropdown"
              >
                <option value="popular">Recommended</option>
                <option value="rating">Highest Rated (4.8+)</option>
                <option value="speed">Fastest Pickup</option>
                <option value="price-low">Lowest Price / kg</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter Pills Bar */}
        <div className="filter-pills-scroll">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              className={`filter-pill-btn ${selectedFilter === tab.id ? 'active' : ''}`}
              onClick={() => setSelectedFilter(tab.id)}
            >
              {tab.icon && <tab.icon size={14} />}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Directory Grid */}
        {filteredLaundromats.length === 0 ? (
          <div className="empty-results-box glass-card">
            <Search size={40} className="empty-icon" />
            <h3>No laundromat partners matched your filter</h3>
            <p>Try clearing your search query or selecting "All Laundromats" to see all available hubs in Bengaluru.</p>
            <button 
              className="btn-primary-small"
              onClick={() => { setSelectedFilter('all'); setLocalSearch(''); }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="laundromats-grid">
            {filteredLaundromats.map((partner) => (
              <div 
                key={partner.id} 
                className="partner-card glass-card hover-lift"
                onClick={() => onOpenPartnerModal(partner)}
              >
                {/* Partner Image & Badges */}
                <div className="partner-img-wrapper">
                  <img src={partner.image} alt={partner.name} className="partner-img" loading="lazy" />
                  
                  {partner.isPromoted && (
                    <div className="promoted-badge">
                      <span>POSHAK TOP PICK</span>
                    </div>
                  )}

                  <div className="partner-pickup-pill">
                    <Clock size={12} />
                    <span>{partner.pickupTime}</span>
                  </div>

                  <div className="partner-rating-badge">
                    <span>{partner.rating}</span>
                    <Star size={12} fill="#ffffff" color="#ffffff" />
                  </div>

                  {partner.offers && partner.offers.length > 0 && (
                    <div className="partner-offer-ribbon">
                      <Tag size={12} />
                      <span>{partner.offers[0]}</span>
                    </div>
                  )}
                </div>

                {/* Partner Info */}
                <div className="partner-card-content">
                  <div className="partner-title-row">
                    <h3 className="partner-name">{partner.name}</h3>
                    <div className="price-badge-partner">
                      {partner.pricePerKg > 0 ? (
                        <>₹{partner.pricePerKg}<small>/kg</small></>
                      ) : (
                        <>Custom</>
                      )}
                    </div>
                  </div>

                  <div className="partner-meta-row">
                    <div className="meta-item">
                      <MapPin size={13} />
                      <span>{partner.area} • {partner.distance}</span>
                    </div>
                  </div>

                  {/* Machinery / Specialties tags */}
                  <div className="specialties-tags-row">
                    {partner.specialties.map((spec, i) => (
                      <span key={i} className="spec-tag">
                        <Check size={11} className="spec-check" />
                        {spec}
                      </span>
                    ))}
                  </div>

                  <div className="partner-card-divider"></div>

                  {/* Menu Preview Strip with Quick Add Buttons */}
                  <div className="partner-menu-preview">
                    <div className="menu-preview-header">
                      <span>Popular Services</span>
                      <span className="view-menu-hint">View full menu →</span>
                    </div>

                    <div className="menu-items-strip">
                      {partner.menu.slice(0, 3).map((item) => (
                        <div key={item.id} className="micro-menu-item">
                          <div className="micro-item-info">
                            <span className="micro-item-name">{item.name}</span>
                            <span className="micro-item-price">₹{item.price} <small>{item.unit}</small></span>
                          </div>
                          <button 
                            className="micro-add-btn"
                            onClick={(e) => handleQuickAddMenuItem(e, partner, item)}
                            title="Add item to basket"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button 
                    className="partner-cta-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPartnerModal(partner);
                    }}
                  >
                    <span>View Menu & Book Pickup</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
