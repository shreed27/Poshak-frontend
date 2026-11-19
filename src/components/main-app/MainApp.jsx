import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, LocateFixed, X, CheckCircle2 } from 'lucide-react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { getRoute, haversineKm } from '../../lib/geo';
import { isServiceable, SERVICE_AREA } from '../../lib/serviceArea';
import { getProgress, applyStep, enrichOrder, demoCaptainStart, STEP_LABELS } from '../../lib/orderEngine';
import { LocationPickerModal } from './LocationPickerModal';
import { HelpCenter } from './HelpCenter';
import { placeOrder, fetchMyOrders, cancelMyOrder, rateMyOrder, subscribeOrders } from '../../lib/ordersApi';
import { supabase } from '../../lib/supabase';
import { payOnline } from '../../lib/payments';
import { uploadOrderPhoto } from '../../lib/photos';
import './LocationTracking.css';

// Swiggy Web Components
import { SwiggyHeader } from './SwiggyHeader';
import { SwiggyHomeView } from './SwiggyHomeView';
import { SwiggyOrdersView } from './SwiggyOrdersView';
import { SwiggyAccountView } from './SwiggyAccountView';
import { BookingFlowModal } from './BookingFlowModal';
import { MobileBottomNav } from './MobileBottomNav';
import { QuoteRequestModal } from './QuoteRequestModal';
import { QuotesPanel } from './QuotesPanel';
import { InstallPrompt } from '../InstallPrompt';
import './SwiggyApp.css';
import './QuickCommerce.css';

import { useCatalog } from '../../context/CatalogContext';

// Demo data from earlier builds (fake Bengaluru addresses / orders) must not
// leak into a real, location-aware session.
const SEEDED_ADDRESS_IDS = ['addr-1', 'addr-2', 'addr-3'];
const SEEDED_ORDER_IDS = ['PSK-89241', 'PSK-81045', 'PSK-76512'];

// Shown in the header until the customer picks a pickup address.
const NO_ADDRESS = { id: 'none', label: 'Set location', streetArea: '', flatBuilding: '', city: '', pincode: '', phone: '', landmark: '', lat: SERVICE_AREA.center.lat, lng: SERVICE_AREA.center.lng, placeholder: true };

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
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // The cart: { serviceId: estimated kg }. Remembered on this device until the order is placed.
  const [basket, setBasket] = useState(() => {
    const b = loadJson('poshak_basket', {});
    return b && typeof b === 'object' && !Array.isArray(b) ? b : {};
  });
  const setKg = (id, kg) => setBasket((b) => {
    const next = { ...b };
    if (kg >= 1) next[id] = Math.round(kg); else delete next[id];
    return next;
  });

  // Orders State. Signed-in customers only ever see their real orders (loaded from the server below); the simulated "demo"
  // orders are for local demo mode only, and any left over in this browser from earlier tests are discarded.
  const signedInReal = Boolean(supabase && user?.isSupabase);
  const [orders, setOrders] = useState(() =>
    signedInReal ? [] : loadJson('poshak_orders', []).filter(o => !SEEDED_ORDER_IDS.includes(o.orderId))
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
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  // No saved address yet: let the app paint first, then slide the location sheet up over it (like Swiggy / Zomato).
  useEffect(() => {
    if (activeAddress) return undefined;
    const t = setTimeout(() => setIsLocationPickerOpen(true), 650);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
    try { localStorage.setItem('poshak_basket', JSON.stringify(basket)); localStorage.removeItem('poshak_cart'); } catch { /* ignore */ }
  }, [basket]);

  useEffect(() => {
    // Demo orders are remembered only in demo mode; with a real account the server is the source of truth.
    if (signedInReal) { localStorage.removeItem('poshak_orders'); return; }
    localStorage.setItem('poshak_orders', JSON.stringify(orders.filter(o => !o.remote)));
  }, [orders, signedInReal]);

  useEffect(() => {
    localStorage.setItem('poshak_addresses', JSON.stringify(addresses));
  }, [addresses]);

  useEffect(() => {
    localStorage.setItem('poshak_wallet', walletBalance.toString());
  }, [walletBalance]);

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
        // The server's list wins. Only an order that was just placed and is still being saved stays on screen meanwhile;
        // stale demo orders are dropped.
        setOrders(prev => [...remote, ...prev.filter(o => !o.remote && o.pendingSave && !remoteCodes.has(o.orderId))]);
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
    if (!activeAddress) { setIsLocationPickerOpen(true); return; }
    const start = demoCaptainStart(activeAddress);
    const straight = { points: [[start.lat, start.lng], [activeAddress.lat, activeAddress.lng]], routed: false };
    const order = enrichOrder(newOrder, { address: activeAddress, route: straight });
    // Real account: show the order instantly as 'received, finding a captain' (no simulated captain or timeline) until the server copy arrives.
    const files = order.photoFiles || [];
    delete order.photoFiles;
    setOrders(prev => [backendOn ? { ...order, rider: null, route: null, dbStatus: 'placed', status: 'active', currentStep: 0, pendingSave: true } : order, ...prev]);
    setBasket({});
    setActiveTab('orders');
    setToast({ text: STEP_TOASTS[0], key: Date.now() });

    if (backendOn) {
      supabase.auth.getUser()
        .then(({ data }) => placeOrder(order, data.user))   // realtime/refetch swaps the optimistic copy for the saved one
        .then((saved) => {
          // Photos go to private storage under the order's id (only the customer, its rider and admins can see them).
          if (files.length) {
            Promise.all(files.map((f) => uploadOrderPhoto(saved.dbId, f, 'customer')))
              .catch((e) => setToast({ text: `Order placed, but a photo did not upload: ${e.message}`, key: Date.now() }));
          }
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

  // Quick 1-tap reorder: same services and weight as last time.
  const handleReorder = (pastOrder) => {
    if (needAddress()) return;
    const names = String(pastOrder.serviceName || '').split(' + ');
    const picked = services.filter(s => names.includes(s.name));
    const list = picked.length ? picked : services.slice(0, 1);
    const each = Math.max(1, Math.round((Number(pastOrder.weightKg) || 4) / list.length));
    setBasket(Object.fromEntries(list.map(s => [s.id, each])));
    setIsBookingModalOpen(true);
  };

  const activeOrder = orders.find(o => o.status === 'active') || null;
  const basketLines = services.filter(s => basket[s.id] > 0);
  const totalCartCount = basketLines.length;
  const basketKg = basketLines.reduce((a, s) => a + basket[s.id], 0);
  const basketEst = basketLines.reduce((a, s) => a + basket[s.id] * s.unitPrice, 0);

  // Distance between where the user physically is and the selected address
  const awayKm = useMemo(
    () => (geo.coords && activeAddress ? haversineKm(geo.coords, activeAddress) : 0),
    [geo.coords, activeAddress]
  );

  // The app is always visible. With no pickup address yet, the location sheet slides up over it (and reopens whenever
  // someone tries to book), so nothing below ever has to cope with a missing address.
  const address = activeAddress || NO_ADDRESS;
  const needAddress = () => {
    if (activeAddress) return false;
    setIsLocationPickerOpen(true);
    return true;
  };
  const openCart = () => { if (!needAddress()) setIsBookingModalOpen(true); };
  const openQuote = () => { if (!needAddress()) setIsQuoteOpen(true); };

  return (
    <div className="swiggy-app-root">
      {/* Top Swiggy-Style Desktop Web Header */}
      <SwiggyHeader 
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeAddress={address}
        cartCount={totalCartCount}
        onOpenCart={openCart}
        activeOrderCount={activeOrdersCount}
        onOpenLocation={() => setIsLocationPickerOpen(true)}
      />

      {!activeAddress && !isLocationPickerOpen && (
        <div className="psk-away-banner">
          <LocateFixed size={16} />
          <span>Add your pickup location to start booking.</span>
          <button onClick={() => setIsLocationPickerOpen(true)}>Add location</button>
        </div>
      )}

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
                basket={basket}
                onSetKg={setKg}
                onRequestQuote={openQuote}
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
              {backendOn && user?.isSupabase && (
                <div className="swiggy-feed-container" style={{ paddingBottom: 0 }}>
                  <QuotesPanel userId={user.id} onRequest={openQuote} onAccepted={() => setToast({ text: 'Quote accepted — your pickup is booked', key: Date.now() })} />
                </div>
              )}
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

      {/* Sticky cart bar (quick-commerce style) */}
      {totalCartCount > 0 && !isBookingModalOpen && activeTab === 'laundry' && (
        <button type="button" className="qc-cartbar" onClick={openCart}>
          <span className="qc-cartbar-l">
            <b>{totalCartCount} {totalCartCount === 1 ? 'service' : 'services'} · about {basketKg} kg</b>
            <span>≈ ₹{Math.round(basketEst)}</span>
          </span>
          <span className="qc-cartbar-r">Checkout <ChevronRight size={18} strokeWidth={2.6} /></span>
        </button>
      )}

      {/* Seamless Quick Booking Checkout Sheet */}
      <AnimatePresence>
        {isBookingModalOpen && (
          <BookingFlowModal 
            isOpen={isBookingModalOpen}
            onClose={() => setIsBookingModalOpen(false)}
            basket={basket}
            onSetKg={setKg}
            activeAddress={address}
            onChangeAddress={() => setIsLocationPickerOpen(true)}
            onConfirmOrder={handleConfirmOrder}
          />
        )}
      </AnimatePresence>


      <AnimatePresence>
        {isQuoteOpen && <QuoteRequestModal address={activeAddress} onClose={() => setIsQuoteOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {isLocationPickerOpen && (
          <LocationPickerModal
            isOpen
            startWithDetect={!activeAddress}
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
      <InstallPrompt />
      <MobileBottomNav 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={totalCartCount}
        activeOrdersCount={activeOrdersCount}
        onOpenCart={openCart}
      />
    </div>
  );
};

