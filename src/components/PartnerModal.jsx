import React from 'react';
import { 
  X, 
  Star, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  Plus, 
  Minus, 
  ShoppingBag,
  Tag,
  CheckCircle2,
  Shirt,
  Flame,
  Crown,
  Footprints,
  Layers
} from 'lucide-react';
import { useCart } from '../context/CartContext';

const iconMap = {
  Shirt,
  Sparkles,
  Flame,
  Crown,
  Footprints,
  Layers
};

export const PartnerModal = ({ partner, onClose }) => {
  const { cartItems, addItem, updateQuantity, setIsCartOpen } = useCart();

  if (!partner) return null;

  const getItemQuantity = (itemId) => {
    const fullId = `${partner.id}-${itemId}`;
    const found = cartItems.find(i => i.id === fullId);
    return found ? found.quantity : 0;
  };

  const handleAdd = (item) => {
    addItem({
      id: `${partner.id}-${item.id}`,
      name: `${item.name} (${partner.name})`,
      price: item.price,
      unit: item.unit,
      type: item.type,
      partnerId: partner.id,
      partnerName: partner.name
    }, partner);
  };

  const handleUpdate = (item, delta) => {
    const fullId = `${partner.id}-${item.id}`;
    updateQuantity(fullId, delta);
  };

  const totalPartnerItemsInCart = cartItems
    .filter(i => i.id.startsWith(partner.id))
    .reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="partner-modal-sheet glass-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Close Button */}
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {/* Modal Hero Banner */}
        <div className="partner-modal-banner">
          <img src={partner.image} alt={partner.name} className="partner-modal-banner-img" />
          <div className="partner-modal-banner-overlay">
            <div className="modal-partner-rating">
              <Star size={14} fill="#ffffff" color="#ffffff" />
              <span>{partner.rating} ({partner.reviewsCount} reviews)</span>
            </div>
            <h2 className="modal-partner-name">{partner.name}</h2>
            <div className="modal-partner-meta">
              <span><MapPin size={14} /> {partner.area} ({partner.distance})</span>
              <span>•</span>
              <span><Clock size={14} /> {partner.pickupTime}</span>
              <span>•</span>
              <span>⚡ {partner.deliveryEstimate}</span>
            </div>
          </div>
        </div>

        {/* Offers & Highlights Bar */}
        <div className="modal-offers-bar">
          {partner.offers && partner.offers.map((offer, idx) => (
            <div key={idx} className="modal-offer-chip">
              <Tag size={13} />
              <span>{offer}</span>
            </div>
          ))}
          <div className="modal-offer-chip eco">
            <ShieldCheck size={13} />
            <span>₹5,000 Fabric Safe Guarantee</span>
          </div>
        </div>

        {/* Modal Content / Service Menu */}
        <div className="partner-modal-body">
          <div className="modal-section-title-row">
            <div>
              <h3 className="modal-section-heading">Fabric Care Menu & Price List</h3>
              <p className="modal-section-sub">Select weight or individual pieces. Pickup captain brings digital scale.</p>
            </div>
            {partner.pricePerKg > 0 && (
              <div className="weight-base-badge">
                <span>Base wash:</span>
                <strong>₹{partner.pricePerKg}/kg</strong>
              </div>
            )}
          </div>

          <div className="modal-menu-grid">
            {partner.menu.map((menuItem) => {
              const Icon = iconMap[menuItem.icon] || Shirt;
              const qty = getItemQuantity(menuItem.id);

              return (
                <div key={menuItem.id} className={`modal-menu-card ${qty > 0 ? 'in-cart' : ''}`}>
                  <div className="modal-item-left">
                    <div className="modal-item-icon-box">
                      <Icon size={20} />
                    </div>
                    <div className="modal-item-text">
                      <h4 className="modal-item-title">{menuItem.name}</h4>
                      <div className="modal-item-pricing">
                        <span className="modal-price-num">₹{menuItem.price}</span>
                        <span className="modal-price-unit">{menuItem.unit}</span>
                      </div>
                    </div>
                  </div>

                  <div className="modal-item-right">
                    {qty === 0 ? (
                      <button 
                        className="modal-add-btn"
                        onClick={() => handleAdd(menuItem)}
                      >
                        <Plus size={15} />
                        <span>Add</span>
                      </button>
                    ) : (
                      <div className="modal-qty-control">
                        <button onClick={() => handleUpdate(menuItem, -1)}>
                          <Minus size={14} />
                        </button>
                        <span>{qty}</span>
                        <button onClick={() => handleUpdate(menuItem, 1)}>
                          <Plus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Partner Certifications / Quality Checklist */}
          <div className="modal-certifications-box">
            <h4 className="cert-heading">Verified Quality Checklist</h4>
            <div className="cert-grid">
              <div className="cert-item">
                <CheckCircle2 size={16} className="cert-icon" />
                <span>Isolated Individual Batch Washing</span>
              </div>
              <div className="cert-item">
                <CheckCircle2 size={16} className="cert-icon" />
                <span>3-Stage RO Water Filtration (TDS &lt; 50)</span>
              </div>
              <div className="cert-item">
                <CheckCircle2 size={16} className="cert-icon" />
                <span>Hypoallergenic Botanical Softeners</span>
              </div>
              <div className="cert-item">
                <CheckCircle2 size={16} className="cert-icon" />
                <span>RFID Digital Hamper Tagging</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer / Cart Trigger */}
        {totalPartnerItemsInCart > 0 && (
          <div className="partner-modal-footer">
            <div className="footer-cart-summary">
              <span className="footer-items-count">{totalPartnerItemsInCart} items added</span>
              <span className="footer-partner-name">From {partner.name}</span>
            </div>
            <button 
              className="btn-primary-hero footer-view-cart-btn"
              onClick={() => {
                onClose();
                setIsCartOpen(true);
              }}
            >
              <ShoppingBag size={18} />
              <span>View Basket & Checkout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
