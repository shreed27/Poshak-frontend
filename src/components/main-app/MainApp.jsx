import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, LocateFixed, X, CheckCircle2 } from 'lucide-react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { getRoute, haversineKm } from '../../lib/geo';
import { isServiceable } from '../../lib/serviceArea';
import { getProgress, applyStep, enrichOrder, demoCaptainStart, STEP_LABELS } from '../../lib/orderEngine';
import { LocationPickerModal } from './LocationPickerModal';
import { HelpCenter } from './HelpCenter';
import { placeOrder, fetchMyOrders, cancelMyOrder, rateMyOrder, subscribeOrders } from '../../lib/ordersApi';
import { supabase } from '../../lib/supabase';
import { payOnline } from '../../lib/payments';
import './LocationTracking.css';

// Swiggy Web Components
import { SwiggyHeader } from './SwiggyHeader';
import { SwiggyHomeView } from './SwiggyHomeView';
import { SwiggyOrdersView } from './SwiggyOrdersView';
import { SwiggyAccountView } from './SwiggyAccountView';
import { SwiggyCartDrawer } from './SwiggyCartDrawer';
import { BookingFlowModal } from './BookingFlowModal';
import { MobileBottomNav } from './MobileBottomNav';
import './SwiggyApp.css';

import { useCatalog } from '../../context/CatalogContext';

// Demo data from earlier builds (fake Bengaluru addresses / orders) must not
// leak into a real, location-aware session.
const SEEDED_ADDRESS_IDS = ['addr-1', 'addr-2', 'addr-3'];
const SEEDED_ORDER_IDS = ['PSK-89241', 'PSK-81045', 'PSK-76512'];

const loadJson = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const STEP_TOASTS = [
  'Order confirmed',
  'Clothes picked up — being cleaned',
  'Out for delivery — your captain is on the way',
  'Delivered! Enjoy your fresh clothes'
];

export const MainApp = ({ user, logout, onBackToLanding }) => {
  // Navigation: 'laundry' | 'orders' | 'account'
  const [activeTab, setActiveTab] = useState('laundry');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedServices, setSelectedServices] = useState(['wash-iron']);

  // Cart State (Persisted)

  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('poshak_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Orders State (Persisted)
  const [orders, setOrders] = useState(() =>
    loadJson('poshak_orders', []).filter(o => !SEEDED_ORDER_IDS.includes(o.orderId))
  );

  // Addresses State (Persisted). Only addresses with real coordinates are valid.
  const [addresses, setAddresses] = useState(() =>
    loadJson('poshak_addresses', []).filter(a => !SEEDED_ADDRESS_IDS.includes(a.id) && a.lat != null && a.lng != null && isServiceable(a))
  );

  const [activeAddress, setActiveAddress] = useState(() => {
    const saved = loadJson('poshak_addresses', []).filter(a => !SEEDED_ADDRESS_IDS.includes(a.id) && a.lat != null && isServiceable(a));
    return saved.find(a => a.isDefault) || saved[0] || null;
  });

  const { services } = useCatalog();
  const geo = useGeolocation();
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [awayBannerDismissed, setAwayBannerDismissed] = useState(false);
  const [toast, setToast] = useState(null);
  const [help, setHelp] = useState(null);          // null | { orderId }
  const [now, setNow] = useState(() => Date.now());
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  // Wallet State (Persisted)
  const [walletBalance, setWalletBalance] = useState(() => {
    try {
      const saved = localStorage.getItem('poshak_wallet');
      return saved ? Number(saved) : (user?.walletBalance || 450);
    } catch {
      return 450;
    }
  });

  // Local storage synchronization
  useEffect(() => {
    localStorage.setItem('poshak_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem('poshak_orders', JSON.stringify(orders.filter(o => !o.remote)));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('poshak_addresses', JSON.stringify(addresses));
  }, [addresses]);

  useEffect(() => {
    localStorage.setItem('poshak_wallet', walletBalance.toString());
  }, [walletBalance]);

  // Cart Management Handlers
  const handleAddToCart = (service) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === service.id);
      if (existing) {
        return prev.map(i => i.id === service.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...service, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (serviceId) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === serviceId);
      if (!existing) return prev;
      if (existing.quantity === 1) {
        return prev.filter(i => i.id !== serviceId);
      }
      return prev.map(i => i.id === serviceId ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  // Real orders from Supabase (realtime): admin/captain changes appear here instantly.
  const backendOn = Boolean(supabase && user?.isSupabase);
  useEffect(() => {
    if (!backendOn) return undefined;
    let alive = true;
    const prevStatus = new Map();
    const load = async () => {
      try {
        const remote = await fetchMyOrders();
        if (!alive) return;
        remote.forEach(o => {
          const before = prevStatus.get(o.orderId);
          if (before && before !== o.dbStatus) {
            setToast({ text: `#${o.orderId}: ${o.statusLabel}`, key: Date.now() });
          }
          prevStatus.set(o.orderId, o.dbStatus);
        });
        const remoteCodes = new Set(remote.map(o => o.orderId));
        // keep demo orders, drop optimistic copies now confirmed by the server
        setOrders(prev => [...remote, ...prev.filter(o => !o.remote && !remoteCodes.has(o.orderId))]);
      } catch (err) {
        console.warn('Could not load orders:', err.message);
      }
    };
    load();
    const unsub = subscribeOrders(user.id, load);
    return () => { alive = false; unsub(); };
  }, [backendOn, user?.id]);

  // A friend's invite link brought them here: apply the code once (the server rejects it if they are not eligible).
  useEffect(() => {
    if (!backendOn) return;
    let code = null;
    try { code = localStorage.getItem('poshak_ref'); } catch { /* ignore */ }
    if (!code) return;
    supabase.rpc('apply_referral', { p_code: code }).then(() => { try { localStorage.removeItem('poshak_ref'); } catch { /* ignore */ } });
  }, [backendOn]);

  // Order Placement: show it instantly, then (demo) fetch the road route or (real) save to Supabase.
  const handleConfirmOrder = (newOrder) => {
    const start = demoCaptainStart(activeAddress);
    const straight = { points: [[start.lat, start.lng], [activeAddress.lat, activeAddress.lng]], routed: false };
    const order = enrichOrder(newOrder, { address: activeAddress, route: straight });
    setOrders(prev => [order, ...prev]);
    setCartItems([]);
    setActiveTab('orders');
    setToast({ text: STEP_TOASTS[0], key: Date.now() });

    if (backendOn) {
      supabase.auth.getUser()
        .then(({ data }) => placeOrder(order, data.user))   // realtime/refetch swaps the optimistic copy for the saved one
        .then((saved) => {
          if (order.paymentMode === 'online') return handlePayNow(saved);
        })
        .catch((err) => {
          console.error('Order save failed:', err);
          setOrders(prev => prev.filter(o => o.orderId !== order.orderId));
          setToast({ text: 'Could not place your order. Please try again.', key: Date.now() });
        });
    } else {
      getRoute(start, activeAddress).then(route => {
        setOrders(prev => prev.map(o => o.orderId === order.orderId ? { ...o, route: route.points } : o));
      });
    }
  };

  // Opens Razorpay for whatever is still due. Safe to call again later (e.g. after the final weigh-in bill).
  const handlePayNow = async (order) => {
    try {
      await payOnline(order.dbId);
      setToast({ text: `Payment received for #${order.orderId}`, key: Date.now() });
    } catch (err) {
      // Closing the window is not an error; the order stays "pay later" and can be paid from the Orders tab.
      if (err.message !== 'Payment cancelled') setToast({ text: err.message, key: Date.now() });
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Cancel this order? Your captain has not picked up the bag yet, so this is free.')) return;
    const target = orders.find(o => o.orderId === orderId);
    if (target?.remote) {
      try {
        await cancelMyOrder(target.dbId);
      } catch (err) {
        setToast({ text: err.message || 'Could not cancel this order', key: Date.now() });
        return;
      }
    } else {
      setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status: 'cancelled', paymentStatus: 'Cancelled' } : o));
    }
    setToast({ text: `Order #${orderId} cancelled`, key: Date.now() });
  };

  const handleRateOrder = (orderId, rating) => {
    const target = orders.find(o => o.orderId === orderId);
    setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, rating } : o));
    if (target?.remote) rateMyOrder(target.dbId, rating).catch(err => console.warn(err.message));
  };

  // Tick once a second while an order is in flight.
  const activeOrdersCount = orders.filter(o => o.status === 'active').length;
  useEffect(() => {
    if (activeOrdersCount === 0) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeOrdersCount]);

  // Advance orders whose real elapsed time has crossed into a new stage.
  useEffect(() => {
    let message = null;
    const next = ordersRef.current.map(o => {
      if (o.status !== 'active' || !o.startedAt) return o;
      const p = getProgress(o, now);
      if (p.step === o.currentStep) return o;
      message = `#${o.orderId}: ${STEP_TOASTS[p.step] || STEP_LABELS[p.step]}`;
      return applyStep(o, p.step, now);
    });
    if (message) {
      setOrders(next);
      setToast({ text: message, key: now });
    }
  }, [now]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  // Wallet Management
  const handleAddMoney = (amount) => {
    const bonus = amount >= 1000 ? 150 : 50;
    setWalletBalance(prev => prev + amount + bonus);
  };

  // Address Management
  const handleAddAddress = (newAddr) => {
    const withDefault = { ...newAddr, isDefault: addresses.length === 0 };
    setAddresses(prev => [...prev, withDefault]);
    setActiveAddress(withDefault);
  };

  const handleDeleteAddress = (id) => {
    const remaining = addresses.filter(a => a.id !== id);
    if (remaining.length === 0) return;
    const fixed = remaining.some(a => a.isDefault) ? remaining : remaining.map((a, i) => ({ ...a, isDefault: i === 0 }));
    setAddresses(fixed);
    if (activeAddress?.id === id) setActiveAddress(fixed.find(a => a.isDefault) || fixed[0]);
  };

  const handleSetDefaultAddress = (id) => {
    const updated = addresses.map(a => ({
      ...a,
      isDefault: a.id === id
    }));
    setAddresses(updated);
    const def = updated.find(a => a.id === id);
    if (def) setActiveAddress(def);
  };

  // Service Selection & Direct Booking Handlers
  const handleToggleService = (serviceId) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.length > 1 ? prev.filter(id => id !== serviceId) : prev;
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleBookDirect = (serviceId) => {
    if (serviceId) {
      setSelectedServices([serviceId]);
    }
    setIsBookingModalOpen(true);
  };

  // Quick 1-tap reorder
  const handleReorder = (pastOrder) => {
    const matchingSvc = services.find(s => s.name === pastOrder.serviceName) || services[0];
    setSelectedServices([matchingSvc.id]);
    setIsBookingModalOpen(true);
  };

  const activeOrder = orders.find(o => o.status === 'active') || null;
  const totalCartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);
  const cartSubtotal = cartItems.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);

  // Distance between where the user physically is and the selected address
  const awayKm = useMemo(
    () => (geo.coords && activeAddress ? haversineKm(geo.coords, activeAddress) : 0),
    [geo.coords, activeAddress]
  );

  // Nothing works without a pickup point, so block until one exists.
  if (!activeAddress) {
    return (
      <div className="swiggy-app-root">
        <LocationPickerModal
          isOpen
          required
          startWithDetect
          onClose={() => {}}
          geo={geo}
          addresses={addresses}
          activeAddress={activeAddress}
          onSelectAddress={setActiveAddress}
          onSaveAddress={handleAddAddress}
        />
      </div>
    );
  }

  return (
    <div className="swiggy-app-root">
      {/* Top Swiggy-Style Desktop Web Header */}
      <SwiggyHeader 
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        addresses={addresses}
        activeAddress={activeAddress}
        onSelectAddress={setActiveAddress}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onBackToLanding={onBackToLanding}
        activeOrderCount={activeOrdersCount}
        onOpenLocation={() => setIsLocationPickerOpen(true)}
      />

      {/* You are somewhere other than your selected address (Swiggy-style nudge) */}
      {awayKm > 1.5 && !awayBannerDismissed && activeTab === 'laundry' && (
        <div className="psk-away-banner">
          <LocateFixed size={16} />
          <span>
            You seem to be {awayKm.toFixed(1)} km from <b>{activeAddress.label}</b>. Pick up from where you are?
          </span>
          <button onClick={() => setIsLocationPickerOpen(true)}>Change</button>
          <button className="psk-banner-x" onClick={() => setAwayBannerDismissed(true)} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        <AnimatePresence mode="wait">
          {activeTab === 'laundry' && (
            <motion.div
              key="desktop-home"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <SwiggyHomeView 
                activeOrder={activeOrder}
                onNavigateToOrders={() => setActiveTab('orders')}
                selectedServiceIds={selectedServices}
                onToggleService={handleToggleService}
                onBookDirect={handleBookDirect}
                onOpenBookingFlow={() => setIsBookingModalOpen(true)}
                hasCartItems={cartItems.length > 0}
                now={now}
              />
            </motion.div>
          )}


          {activeTab === 'orders' && (
            <motion.div
              key="desktop-orders"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <SwiggyOrdersView 
                orders={orders}
                now={now}
                onCancelOrder={handleCancelOrder}
                onPayNow={handlePayNow}
                onReport={(order) => setHelp({ orderId: order.dbId })}
                onRateOrder={handleRateOrder}
                onReorder={handleReorder}
                onStartNewOrder={() => setActiveTab('laundry')}
              />
            </motion.div>
          )}

          {activeTab === 'account' && (
            <motion.div
              key="desktop-account"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <SwiggyAccountView 
                user={user}
                walletBalance={walletBalance}
                onAddMoney={handleAddMoney}
                addresses={addresses}
                onAddAddress={handleAddAddress}
                onDeleteAddress={handleDeleteAddress}
                onOpenLocationPicker={() => setIsLocationPickerOpen(true)}
                onOpenHelp={() => setHelp({})}
                onSetDefaultAddress={handleSetDefaultAddress}
                onBackToLanding={onBackToLanding}
                logout={logout}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Bottom Cart Bar (Swiggy Style) */}
      {cartItems.length > 0 && !isCartOpen && (
        <motion.div 
          className="swiggy-floating-cart-bar"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          onClick={() => setIsCartOpen(true)}
        >
          <div className="floating-cart-left">
            <span className="cart-items-count-text">
              {totalCartCount} {totalCartCount === 1 ? 'Item' : 'Items'} Added
            </span>
            <span className="cart-total-amount-text">
              ₹{cartSubtotal}
            </span>
          </div>
          <div className="floating-cart-right">
            <span>View Cart</span>
            <ArrowRight size={18} />
          </div>
        </motion.div>
      )}

      {/* Slide-In Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <SwiggyCartDrawer 
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            cartItems={cartItems}
            onAddToCart={handleAddToCart}
            onRemoveFromCart={handleRemoveFromCart}
            activeAddress={activeAddress}
            onConfirmOrder={handleConfirmOrder}
          />
        )}
      </AnimatePresence>

      {/* Seamless Quick Booking Checkout Sheet */}
      <AnimatePresence>
        {isBookingModalOpen && (
          <BookingFlowModal 
            isOpen={isBookingModalOpen}
            onClose={() => setIsBookingModalOpen(false)}
            selectedServiceIds={selectedServices}
            onToggleService={handleToggleService}
            activeAddress={activeAddress}
            addresses={addresses}
            onSelectAddress={setActiveAddress}
            onConfirmOrder={handleConfirmOrder}
          />
        )}
      </AnimatePresence>


      <AnimatePresence>
        {isLocationPickerOpen && (
          <LocationPickerModal
            isOpen
            onClose={() => setIsLocationPickerOpen(false)}
            geo={geo}
            addresses={addresses}
            activeAddress={activeAddress}
            onSelectAddress={setActiveAddress}
            onSaveAddress={handleAddAddress}
            onDeleteAddress={handleDeleteAddress}
          />
        )}
      </AnimatePresence>

      {help && <HelpCenter orders={orders} startOrderId={help.orderId} onClose={() => setHelp(null)} />}

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.key}
            className="psk-toast"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            <CheckCircle2 size={16} /> {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Nav Dock (Visible on Mobile <= 768px) */}
      <MobileBottomNav 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={totalCartCount}
        activeOrdersCount={activeOrdersCount}
        onOpenCart={() => setIsCartOpen(true)}
      />
    </div>
  );
};

