import React from 'react';
import { ChevronDown, ShoppingBag, MapPin } from 'lucide-react';
import { NotificationBell } from '../NotificationBell';
import { LangSwitch } from '../../i18n';

// Top bar: logo, pickup address (tap to change), language, alerts. On desktop also the tabs and cart.
export const SwiggyHeader = ({ user, activeTab, setActiveTab, activeAddress, cartCount, onOpenCart, activeOrderCount, onOpenLocation }) => {
  const empty = Boolean(activeAddress?.placeholder);
  const sub = empty ? 'Add your pickup address' : [activeAddress.flatBuilding, activeAddress.streetArea].filter(Boolean).join(', ');
  return (
    <header className="qc-header">
      <div className="qc-header-in">
        <button type="button" className="qc-logo" onClick={() => setActiveTab('laundry')} aria-label="Poshak home">Poshak<i /></button>
        <button type="button" className={`qc-addr ${empty ? 'empty' : ''}`} onClick={onOpenLocation} aria-label="Change pickup address">
          <span className="qc-addr-top">{empty ? <MapPin size={15} /> : null}{empty ? 'Set location' : activeAddress.label}<ChevronDown size={15} strokeWidth={2.6} /></span>
          <span className="qc-addr-sub">{sub}</span>
        </button>
        <div className="qc-head-right">
          <nav className="qc-nav" aria-label="Main">
            <button type="button" className={activeTab === 'laundry' ? 'on' : ''} onClick={() => setActiveTab('laundry')}>Laundry</button>
            <button type="button" className={activeTab === 'orders' ? 'on' : ''} onClick={() => setActiveTab('orders')}>
              Orders{activeOrderCount > 0 && <span className="qc-count">{activeOrderCount}</span>}
            </button>
            <button type="button" className={activeTab === 'account' ? 'on' : ''} onClick={() => setActiveTab('account')}>{(user?.name || 'Account').split(' ')[0]}</button>
            <button type="button" onClick={onOpenCart}><ShoppingBag size={16} /> Cart{cartCount > 0 && <span className="qc-count">{cartCount}</span>}</button>
          </nav>
          <LangSwitch compact />
          <NotificationBell userId={user?.isSupabase ? user.id : null} />
        </div>
      </div>
    </header>
  );
};
