import React from 'react';
import { 
  Sparkles, 
  Package, 
  ShoppingBag, 
  User 
} from 'lucide-react';

export const MobileBottomNav = ({ 
  activeTab, 
  setActiveTab, 
  cartCount, 
  activeOrdersCount, 
  onOpenCart 
}) => {
  return (
    <nav className="mobile-bottom-nav-dock" aria-label="Mobile Navigation">
      {/* 1. Services / Home Tab */}
      <button 
        className={`mobile-nav-btn ${activeTab === 'laundry' ? 'active' : ''}`}
        onClick={() => setActiveTab('laundry')}
        aria-label="Laundry Services"
      >
        <Sparkles size={20} strokeWidth={activeTab === 'laundry' ? 2.5 : 2} />
        <span className="mobile-nav-btn-label">Services</span>
      </button>

      {/* 2. Live Orders Tab */}
      <button 
        className={`mobile-nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
        onClick={() => setActiveTab('orders')}
        aria-label="Live Orders Tracker"
      >
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <Package size={20} strokeWidth={activeTab === 'orders' ? 2.5 : 2} />
          {activeOrdersCount > 0 && <span className="nav-badge-dot"></span>}
        </div>
        <span className="mobile-nav-btn-label">Orders</span>
      </button>

      {/* 3. Cart Drawer Trigger */}
      <button 
        className="mobile-nav-btn"
        onClick={onOpenCart}
        aria-label="Shopping Cart"
      >
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <ShoppingBag size={20} strokeWidth={2} />
          {cartCount > 0 && (
            <span className="nav-cart-badge-pill">
              {cartCount}
            </span>
          )}
        </div>
        <span className="mobile-nav-btn-label">Cart</span>
      </button>

      {/* 4. Account Tab */}
      <button 
        className={`mobile-nav-btn ${activeTab === 'account' ? 'active' : ''}`}
        onClick={() => setActiveTab('account')}
        aria-label="My Account"
      >
        <User size={20} strokeWidth={activeTab === 'account' ? 2.5 : 2} />
        <span className="mobile-nav-btn-label">Account</span>
      </button>
    </nav>
  );
};

