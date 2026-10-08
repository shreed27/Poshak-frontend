import React, { useState } from 'react';
import { 
  MapPin, 
  Search, 
  ShoppingBag, 
  User, 
  LogOut, 
  Sparkles, 
  Clock, 
  ChevronDown, 
  Menu, 
  X, 
  ShieldCheck, 
  Flame,
  Shirt
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export const Navbar = ({ theme, setTheme, onSearchSelect }) => {
  const { user, isAuthenticated, logout, openLoginModal } = useAuth();
  const { cartItems, setIsCartOpen, activeOrder, setIsTrackerOpen } = useCart();
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Indiranagar, Bengaluru');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const locations = [
    'Indiranagar, Bengaluru',
    'Koramangala 4th Block, Bengaluru',
    'HSR Layout Sector 3, Bengaluru',
    'Whitefield Main Rd, Bengaluru',
    'Jayanagar 4th T Block, Bengaluru',
    'Bandra West, Mumbai',
    'Cyber City, Gurugram / Delhi NCR'
  ];

  const quickSearchTags = [
    'Wash & Fold ₹49/kg',
    'Express 6-Hr Blitz',
    'Italian Steam Iron',
    'Sneaker Spa',
    'Silk Saree Care',
    'Suit Dry Clean'
  ];

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearchSelect) {
      onSearchSelect(searchQuery);
    }
  };

  return (
    <header className="navbar-root">
      {/* Top micro-announcement banner */}
      <div className="top-banner">
        <div className="top-banner-content">
          <span className="banner-badge">🎉 FIRST WASH FREE</span>
          <span>Get FLAT ₹150 OFF + Free Doorstep Pickup on your first laundry basket with code <strong>FIRSTWASH</strong></span>
        </div>
      </div>

      <nav className="navbar-main">
        <div className="navbar-container">
          {/* Brand Logo */}
          <a href="#" className="brand-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <div className="brand-icon-wrapper">
              <Shirt className="brand-icon" />
              <div className="sparkle-dot"></div>
            </div>
            <div className="brand-text-col">
              <span className="brand-title">POSHAK</span>
              <span className="brand-subtitle">ZOMATO FOR LAUNDRY</span>
            </div>
          </a>

          {/* Location Picker */}
          <div className="location-picker-wrapper">
            <button 
              className="location-btn" 
              onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
              aria-label="Select Delivery Location"
            >
              <MapPin className="icon-map" size={18} />
              <div className="location-text">
                <span className="location-label">Deliver to</span>
                <span className="location-value">{selectedCity}</span>
              </div>
              <ChevronDown size={14} className={`chevron-icon ${isLocationDropdownOpen ? 'rotate' : ''}`} />
            </button>

            {isLocationDropdownOpen && (
              <div className="location-dropdown glass-card">
                <div className="location-dropdown-header">
                  <span>📍 Select delivery neighborhood</span>
                </div>
                {locations.map((loc, idx) => (
                  <button
                    key={idx}
                    className={`location-option ${selectedCity === loc ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCity(loc);
                      setIsLocationDropdownOpen(false);
                    }}
                  >
                    <MapPin size={14} />
                    <span>{loc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="nav-search-container">
            <form onSubmit={handleSearchSubmit} className={`nav-search-form ${isSearchFocused ? 'focused' : ''}`}>
              <Search size={18} className="search-icon" />
              <input 
                type="text"
                placeholder="Search laundromats, wash & fold, steam iron, sneaker spa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
              />
              {searchQuery && (
                <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </form>

            {isSearchFocused && (
              <div className="search-quick-tags glass-card">
                <div className="quick-tags-title">Popular searches:</div>
                <div className="quick-tags-row">
                  {quickSearchTags.map((tag, i) => (
                    <button 
                      key={i} 
                      className="quick-tag-pill"
                      onMouseDown={() => {
                        setSearchQuery(tag);
                        if (onSearchSelect) onSearchSelect(tag);
                      }}
                    >
                      <Sparkles size={12} />
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Action buttons */}
          <div className="nav-actions">
            {/* Live Order tracker badge */}
            {activeOrder && (
              <button 
                className="live-order-badge-btn pulse-glow"
                onClick={() => setIsTrackerOpen(true)}
                title="View live laundry tracking"
              >
                <span className="live-dot"></span>
                <Clock size={15} />
                <span className="live-order-text">Live: {activeOrder.orderId}</span>
              </button>
            )}

            {/* Cart Drawer Trigger */}
            <button 
              className="cart-trigger-btn"
              onClick={() => setIsCartOpen(true)}
              aria-label="View Cart"
            >
              <ShoppingBag size={20} />
              <span className="cart-label">Basket</span>
              {totalCartCount > 0 && (
                <span className="cart-badge">{totalCartCount}</span>
              )}
            </button>

            {/* Google Sign In / User Profile */}
            {isAuthenticated ? (
              <div className="user-profile-menu-container">
                <button 
                  className="user-profile-btn"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                >
                  <img src={user.picture} alt={user.name} className="user-avatar" />
                  <span className="user-name">{user.name.split(' ')[0]}</span>
                  <ChevronDown size={14} />
                </button>

                {isProfileMenuOpen && (
                  <div className="user-dropdown glass-card">
                    <div className="user-info-row">
                      <img src={user.picture} alt={user.name} className="user-avatar-lg" />
                      <div>
                        <div className="user-full-name">{user.name}</div>
                        <div className="user-email">{user.email}</div>
                        <div className="user-badge-gold">⭐ Poshak Gold Member</div>
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-item" onClick={() => { setIsTrackerOpen(true); setIsProfileMenuOpen(false); }}>
                      <Clock size={16} />
                      <span>Track Active Orders</span>
                    </button>
                    <button className="dropdown-item" onClick={() => { setIsCartOpen(true); setIsProfileMenuOpen(false); }}>
                      <ShoppingBag size={16} />
                      <span>My Laundry Basket</span>
                    </button>
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-item logout" onClick={() => { logout(); setIsProfileMenuOpen(false); }}>
                      <LogOut size={16} />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                className="google-login-nav-btn"
                onClick={openLoginModal}
              >
                <svg className="google-icon-svg" viewBox="0 0 24 24" width="18" height="18">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Sign In with Google</span>
              </button>
            )}

            {/* Mobile Hamburger toggle */}
            <button 
              className="mobile-hamburger-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu expanded */}
        {isMobileMenuOpen && (
          <div className="mobile-menu-drawer glass-card">
            <div className="mobile-search-col">
              <form onSubmit={handleSearchSubmit} className="mobile-search-form">
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder="Search wash, dry clean, sneakers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
            </div>
            <div className="mobile-menu-links">
              <a href="#services" onClick={() => setIsMobileMenuOpen(false)}>🧺 Services & Rates</a>
              <a href="#laundromats" onClick={() => setIsMobileMenuOpen(false)}>🏪 Browse Laundromats</a>
              <a href="#calculator" onClick={() => setIsMobileMenuOpen(false)}>🧮 Price Calculator</a>
              <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)}>⚡ How Poshak Works</a>
              <a href="#reviews" onClick={() => setIsMobileMenuOpen(false)}>⭐ Customer Reviews</a>
            </div>
            {!isAuthenticated && (
              <button 
                className="mobile-login-btn"
                onClick={() => { openLoginModal(); setIsMobileMenuOpen(false); }}
              >
                Sign In with Google
              </button>
            )}
          </div>
        )}
      </nav>
    </header>
  );
};
