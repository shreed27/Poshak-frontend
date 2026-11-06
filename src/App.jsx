import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { CatalogProvider } from './context/CatalogContext';
import { LaundyNavbar } from './components/LaundyNavbar';
import { LaundyHero } from './components/LaundyHero';
import { LaundyAbout } from './components/LaundyAbout';
import { LaundyHowItWorks } from './components/LaundyHowItWorks';
import { LaundyServices } from './components/LaundyServices';
import { LaundyPricing } from './components/LaundyPricing';
import { LaundyFAQ } from './components/LaundyFAQ';
import { LaundyFooter } from './components/LaundyFooter';
import { ServiceDetailModal } from './components/ServiceDetailModal';
import { LiveOrderTrackerModal } from './components/LiveOrderTrackerModal';
import { LoginPage } from './components/LoginPage';
import { MainApp } from './components/main-app/MainApp';
import { useCart } from './context/CartContext';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { CaptainApp } from './components/admin/CaptainApp';
import { StaffPortal } from './components/admin/StaffPortal';
import { SlowLoading } from './components/StuckHelp';
import { CleanerApp } from './components/admin/CleanerApp';
import { isBackendConfigured } from './lib/supabase';

// ?ref=CODE links: remember the code until the visitor signs in, then MainApp applies it.
try {
  const ref = new URLSearchParams(window.location.search).get('ref');
  if (ref && /^[A-Za-z0-9]{4,10}$/.test(ref)) localStorage.setItem('poshak_ref', ref.toUpperCase());
} catch { /* ignore */ }

export function AppContent() {
  const { user, isAuthenticated, logout, role, roleReady, authReady, session } = useAuth();
  const [currentView, setCurrentView] = useState(() => {
    try {
      const savedView = sessionStorage.getItem('poshak_view');
      if (savedView) return savedView;
      const savedUser = localStorage.getItem('poshak_user');
      return savedUser ? 'app' : 'landing';
    } catch {
      return 'landing';
    }
  }); // 'landing' | 'login' | 'app'
  const [activeTab, setActiveTab] = useState('home');
  const [selectedService, setSelectedService] = useState(null);
  const [bookingService, setBookingService] = useState(null);
  const { setIsTrackerOpen } = useCart();

  // Each team role has its own app and sign-in page: /#/admin, /#/rider, /#/laundry (and /#/staff sends anyone to theirs)
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Staff only ever see their own app: wherever they are, they are pulled back to it.
  const staffHome = { admin: '#/admin', captain: '#/rider', cleaner: '#/laundry' }[role] || null;
  useEffect(() => {
    if (isAuthenticated && roleReady && staffHome && hash !== staffHome) window.location.hash = staffHome;
  }, [isAuthenticated, roleReady, staffHome, hash]);

  // Returning from the Google redirect (or a restored session) while still on the login screen.
  useEffect(() => {
    if (isAuthenticated && currentView === 'login') {
      setCurrentView('app');
      try { sessionStorage.setItem('poshak_view', 'app'); } catch { /* ignore */ }
    }
  }, [isAuthenticated, currentView]);

  const handleViewChange = (view) => {
    setCurrentView(view);
    try {
      sessionStorage.setItem('poshak_view', view);
    } catch {
      // ignore
    }
  };

  const handleOpenBooking = (service = null) => {
    if (isAuthenticated) {
      handleViewChange('app');
      return;
    }
    setBookingService(service);
    handleViewChange('login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = () => {
    handleViewChange('app');
  };

  const handleScrollToSection = (sectionId) => {
    if (currentView !== 'landing') {
      handleViewChange('landing');
    }
    setActiveTab(sectionId);
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  // Don't flash the customer app at a team member while we find out who they are.
  if (isBackendConfigured && (!authReady || (session && !roleReady))) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#888', fontFamily: 'system-ui' }}><SlowLoading /></div>;
  }
  if (staffHome && session) return staffHome === '#/admin' ? <AdminDashboard /> : staffHome === '#/laundry' ? <CleanerApp /> : <CaptainApp />;
  if (hash.startsWith('#/staff')) return <StaffPortal />;
  if (hash.startsWith('#/admin')) return <AdminDashboard />;
  if (hash.startsWith('#/rider') || hash.startsWith('#/captain')) return <CaptainApp />;
  if (hash.startsWith('#/laundry') || hash.startsWith('#/cleaner')) return <CleanerApp />;

  if (currentView === 'login') {
    return (
      <LoginPage 
        bookingService={bookingService}
        onBackToHome={() => handleViewChange('landing')}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (currentView === 'app') {
    return (
      <MainApp 
        user={user}
        logout={() => {
          logout();
          handleViewChange('landing');
        }}
        onBackToLanding={() => handleViewChange('landing')}
      />
    );
  }

  return (
    <div className="laundy-app-root">
      {/* Header Bar with Logo, Clock, and Hamburger Drawer */}
      <LaundyNavbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        onOpenBooking={() => handleOpenBooking()}
        onOpenApp={() => handleViewChange('app')}
      />

      <main>
        {/* Hero Section (Screenshots 1 & 2) */}
        <LaundyHero 
          onScrollToServices={() => handleScrollToSection('services')}
          onOpenBooking={() => handleOpenBooking()}
        />

        {/* About Section (Screenshot 2) */}
        <LaundyAbout 
          onOpenBooking={() => handleOpenBooking()}
        />

        {/* How It Works Section (Screenshot 3) */}
        <LaundyHowItWorks />

        {/* Services Showcase (Framer /services clone) */}
        <LaundyServices 
          onSelectService={(service) => setSelectedService(service)}
          onOpenBooking={(service) => handleOpenBooking(service)}
        />

        {/* Subscription Pricing */}
        <LaundyPricing 
          onOpenBooking={() => handleOpenBooking()}
        />

        {/* FAQs Accordion */}
        <LaundyFAQ />
      </main>

      {/* Unified Master Bottom Section (Screenshot Match) */}
      <LaundyFooter 
        onNavClick={handleScrollToSection}
        onOpenBooking={() => handleOpenBooking()}
      />

      {/* Interactive Service Deep-Dive Modal */}
      <ServiceDetailModal 
        service={selectedService}
        onClose={() => setSelectedService(null)}
        onBookService={(svc) => handleOpenBooking(svc)}
      />

      {/* Live Order Tracker Modal */}
      <LiveOrderTrackerModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CatalogProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </CatalogProvider>
    </AuthProvider>
  );
}
