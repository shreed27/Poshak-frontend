import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  MapPin, 
  Clock, 
  Tag, 
  Zap, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Check, 
  Edit2,
  Shirt
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export const CartDrawer = () => {
  const { 
    cartItems, 
    isCartOpen, 
    setIsCartOpen, 
    updateQuantity, 
    removeItem, 
    clearCart,
    selectedAddress,
    setSelectedAddress,
    selectedSlot,
    setSelectedSlot,
    promoCode,
    setPromoCode,
    appliedDiscount,
    promoMessage,
    applyPromo,
    isExpressBlitz,
    setIsExpressBlitz,
    laundryNotes,
    setLaundryNotes,
    subtotal,
    deliveryFee,
    expressFee,
    taxes,
    finalTotal,
    placeOrder,
    selectedPartner
  } = useCart();

  const { isAuthenticated, openLoginModal } = useAuth();
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState(selectedAddress);
  const [couponInput, setCouponInput] = useState('');

  if (!isCartOpen) return null;

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (couponInput) {
      applyPromo(couponInput);
    }
  };

  const handleSaveAddress = (e) => {
    e.preventDefault();
    if (addressInput.trim()) {
      setSelectedAddress(addressInput.trim());
      setIsEditingAddress(false);
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    placeOrder();
  };

  return (
    <div className="modal-backdrop" onClick={() => setIsCartOpen(false)}>
      <div className="cart-drawer-sheet glass-card" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="cart-drawer-header">
          <div className="cart-header-left">
            <ShoppingBag size={22} className="cart-header-icon" />
            <div>
              <h3 className="cart-title">Your Laundry Basket</h3>
              {selectedPartner && (
                <span className="cart-partner-subtitle">Care Partner: <strong>{selectedPartner.name}</strong></span>
              )}
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => setIsCartOpen(false)} aria-label="Close cart">
            <X size={20} />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="cart-drawer-body">
          {cartItems.length === 0 ? (
            <div className="cart-empty-state">
              <div className="empty-cart-icon-wrap">
                <Shirt size={48} />
              </div>
              <h4>Your laundry basket is empty</h4>
              <p>Add garments from our price calculator or choose services from your favorite neighborhood laundromat.</p>
              <button 
                className="btn-primary-hero"
                onClick={() => setIsCartOpen(false)}
              >
                <span>Browse Laundromats</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <>
              {/* Pickup Address Card */}
              <div className="cart-section-card glass-card">
                <div className="cart-card-header">
                  <div className="card-header-title">
                    <MapPin size={16} />
                    <span>Doorstep Pickup Address</span>
                  </div>
                  <button 
                    className="edit-link-btn"
                    onClick={() => setIsEditingAddress(!isEditingAddress)}
                  >
                    {isEditingAddress ? 'Cancel' : 'Change'}
                  </button>
                </div>

                {isEditingAddress ? (
                  <form onSubmit={handleSaveAddress} className="address-edit-form">
                    <textarea 
                      value={addressInput}
                      onChange={(e) => setAddressInput(e.target.value)}
                      placeholder="Enter flat / house no, building name, landmark"
                      rows={2}
                      required
                    />
                    <button type="submit" className="save-address-btn">Save Address</button>
                  </form>
                ) : (
                  <p className="cart-address-text">{selectedAddress}</p>
                )}
              </div>

              {/* Pickup Slot Selection */}
              <div className="cart-section-card glass-card">
                <div className="cart-card-header">
                  <div className="card-header-title">
                    <Clock size={16} />
                    <span>Pickup Time Slot</span>
                  </div>
                </div>
                <div className="slots-grid">
                  {[
                    'Today, In 15 Mins (Instant)',
                    'Today, 4:00 PM - 6:00 PM',
                    'Today, 7:00 PM - 9:00 PM',
                    'Tomorrow, 8:00 AM - 10:00 AM'
                  ].map((slot, idx) => (
                    <button
                      key={idx}
                      className={`slot-pill-btn ${selectedSlot === slot ? 'active' : ''}`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      <Check size={12} className={`slot-check ${selectedSlot === slot ? 'show' : ''}`} />
                      <span>{slot}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Express 6-Hour Blitz Toggle */}
              <div className={`express-blitz-card ${isExpressBlitz ? 'active' : ''}`}>
                <div className="express-left">
                  <div className="express-icon-wrap">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h4 className="express-title">⚡ 6-Hour Express Blitz Delivery</h4>
                    <p className="express-desc">Priority washer queue & dedicated express courier delivery.</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={isExpressBlitz}
                    onChange={(e) => setIsExpressBlitz(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {/* Cart Items List */}
              <div className="cart-items-section">
                <div className="cart-items-header">
                  <span>Selected Garments ({cartItems.reduce((a, b) => a + b.quantity, 0)})</span>
                  <button className="clear-cart-link" onClick={clearCart}>
                    <Trash2 size={13} />
                    <span>Clear All</span>
                  </button>
                </div>

                <div className="cart-items-list">
                  {cartItems.map((item) => (
                    <div key={item.id} className="cart-item-row">
                      <div className="item-info-col">
                        <h5 className="item-name">{item.name}</h5>
                        <div className="item-price-unit">
                          ₹{item.price} <small>{item.unit}</small>
                        </div>
                      </div>

                      <div className="item-controls-col">
                        <div className="item-qty-control">
                          <button onClick={() => updateQuantity(item.id, -1)} aria-label="Decrease">
                            <Minus size={13} />
                          </button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} aria-label="Increase">
                            <Plus size={13} />
                          </button>
                        </div>
                        <span className="item-subtotal">₹{item.price * item.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Laundry Instructions */}
              <div className="cart-section-card glass-card">
                <div className="cart-card-header">
                  <div className="card-header-title">
                    <Sparkles size={16} />
                    <span>Special Washing Instructions (Optional)</span>
                  </div>
                </div>
                <input 
                  type="text" 
                  className="instructions-input"
                  placeholder="e.g. Starch cuffs & collars, use mild hypoallergenic softener..."
                  value={laundryNotes}
                  onChange={(e) => setLaundryNotes(e.target.value)}
                />
              </div>

              {/* Promo Coupon Box */}
              <div className="cart-coupon-box glass-card">
                <form onSubmit={handleApplyCoupon} className="coupon-form">
                  <div className="coupon-input-wrap">
                    <Tag size={16} />
                    <input 
                      type="text"
                      placeholder="Enter promo code (e.g. FIRSTWASH)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    />
                  </div>
                  <button type="submit" className="apply-coupon-btn">Apply</button>
                </form>
                {promoMessage && (
                  <div className={`promo-feedback ${appliedDiscount > 0 ? 'success' : 'error'}`}>
                    {promoMessage}
                  </div>
                )}
                <div className="quick-coupons-suggest">
                  <span>Try:</span>
                  <button type="button" onClick={() => { setCouponInput('FIRSTWASH'); applyPromo('FIRSTWASH'); }}>FIRSTWASH (₹100 OFF)</button>
                  <button type="button" onClick={() => { setCouponInput('SNEAKER40'); applyPromo('SNEAKER40'); }}>SNEAKER40</button>
                </div>
              </div>

              {/* Itemized Bill Breakdown */}
              <div className="cart-bill-breakdown glass-card">
                <h4 className="bill-title">Bill Summary</h4>
                <div className="bill-row">
                  <span>Items Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="bill-row">
                  <span>Doorstep Pickup & Delivery</span>
                  <span className={deliveryFee === 0 ? 'text-green' : ''}>
                    {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                  </span>
                </div>
                {isExpressBlitz && (
                  <div className="bill-row">
                    <span>⚡ 6-Hour Blitz Priority</span>
                    <span>₹{expressFee}</span>
                  </div>
                )}
                <div className="bill-row">
                  <span>GST & Hygiene Packaging (5%)</span>
                  <span>₹{taxes}</span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="bill-row discount-row text-green">
                    <span>Coupon Discount</span>
                    <span>-₹{appliedDiscount}</span>
                  </div>
                )}
                <div className="bill-divider"></div>
                <div className="bill-total-row">
                  <div>
                    <span className="total-text">To Pay</span>
                    <span className="savings-tag">You save ₹{appliedDiscount + (deliveryFee === 0 && subtotal > 0 ? 35 : 0)}!</span>
                  </div>
                  <span className="total-amount">₹{finalTotal}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer Checkout CTA */}
        {cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            <button 
              className="btn-primary-hero full-width checkout-btn"
              onClick={handleCheckout}
            >
              <span>{isAuthenticated ? 'Schedule Pickup' : 'Sign In with Google & Schedule'}</span>
              <span className="checkout-price">₹{finalTotal}</span>
              <ArrowRight size={18} />
            </button>
            <div className="checkout-guarantee">
              <ShieldCheck size={14} />
              <span>₹5,000 Fabric Safe Guarantee included</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
