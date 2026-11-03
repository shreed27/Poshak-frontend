import React from 'react';
import { NotificationBell } from '../NotificationBell';
import { 
  MapPin, 
  ChevronDown, 
  Search, 
  ShoppingBag, 
  Package, 
  User, 
  Sparkles, 
  Check, 
  Plus, 
  X,
  ExternalLink
} from 'lucide-react';

export const SwiggyHeader = ({ 
  user, 
  activeTab, 
  setActiveTab, 
  addresses, 
  activeAddress, 
  onSelectAddress, 
  cartCount, 
  onOpenCart,
  searchQuery,
  setSearchQuery,
  onBackToLanding,
  activeOrderCount,
  onOpenLocation
}) => {

  return (
    <header className="swiggy-header">
      <div className="swiggy-header-inner">
        {/* Left: Brand Logo & Swiggy Location Chip */}
        <div className="swiggy-header-left">
          <div 
            className="swiggy-logo" 
            onClick={() => setActiveTab('laundry')}
            title="Poshak Laundry"
          >
            <span>Poshak</span>
            <span className="swiggy-logo-dot"></span>
          </div>

          <button 
            className="swiggy-address-btn"
            onClick={onOpenLocation}
            aria-label="Select delivery location"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span className="address-label-bold">{activeAddress.label}</span>
              <span className="address-sub-text">{activeAddress.streetArea}</span>
              <ChevronDown size={14} color="#fa5929" />
            </div>
          </button>
        </div>

        {/* Center: Search Bar */}
        <div className="swiggy-header-search">
          <Search size={16} className="swiggy-search-icon" />
          <input 
            type="text" 
            className="swiggy-search-input"
            placeholder="Search for 'wash & fold', 'steam iron', 'dry clean'..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                background: 'transparent',
                border: 'none',
                color: '#888',
                cursor: 'pointer'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Right: Clean Swiggy Navigation Links */}
        <div className="swiggy-header-right">
          <NotificationBell userId={user?.isSupabase ? user.id : null} />
          <button 
            className={`swiggy-nav-pill-btn ${activeTab === 'laundry' ? 'active' : ''}`}
            onClick={() => setActiveTab('laundry')}
          >
            <span>Laundry</span>
          </button>

          <button 
            className={`swiggy-nav-pill-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <span>Orders</span>
            {activeOrderCount > 0 && (
              <span className="swiggy-cart-badge">{activeOrderCount}</span>
            )}
          </button>

          <button 
            className={`swiggy-nav-pill-btn ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <User size={16} />
            <span>{(user?.name || 'Account').split(' ')[0]}</span>
          </button>

          {/* Cart Pill */}
          <button 
            className="swiggy-nav-pill-btn swiggy-header-cart-btn"
            onClick={onOpenCart}
            aria-label="View Cart"
            style={{
              background: cartCount > 0 ? '#fa5929' : 'transparent',
              color: cartCount > 0 ? '#ffffff' : '#3d4152',
              padding: '0.45rem 0.85rem'
            }}
          >
            <ShoppingBag size={17} />
            <span className="cart-btn-text">Cart</span>
            {cartCount > 0 && (
              <span style={{
                background: '#ffffff',
                color: '#fa5929',
                fontSize: '0.72rem',
                fontWeight: '900',
                padding: '0.1rem 0.45rem',
                borderRadius: '9999px',
                marginLeft: '0.2rem'
              }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>

      </div>

    </header>
  );
};
