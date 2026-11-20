import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import { SlowLoading } from './components/StuckHelp';
import { isBackendConfigured } from './lib/supabase';

// Each app is its own download: customers never fetch the admin dashboard, riders never fetch the customer site.
const named = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));
const LoginPage = named(() => import('./components/LoginPage'), 'LoginPage');
const MainApp = named(() => import('./components/main-app/MainApp'), 'MainApp');
const AdminDashboard = named(() => import('./components/admin/AdminDashboard'), 'AdminDashboard');
const CaptainApp = named(() => import('./components/admin/CaptainApp'), 'CaptainApp');
const CleanerApp = named(() => import('./components/admin/CleanerApp'), 'CleanerApp');
const StaffPortal = named(() => import('./components/admin/StaffPortal'), 'StaffPortal');
const PublicTrack = named(() => import('./components/PublicTrack'), 'PublicTrack');
const Boot = ({ children }) => <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#888', fontFamily: 'system-ui' }}><SlowLoading /></div>}>{children}</Suspense>;

// ?ref=CODE links: remember the code until the visitor signs in, then MainApp applies it.
try {
  const ref = new URLSearchParams(window.location.search).get('ref');
  if (ref && /^[A-Za-z0-9]{4,10}$/.test(ref)) localStorage.setItem('poshak_ref', ref.toUpperCase());
} catch { /* ignore */ }

export function AppContent() {
  const { user, isAuthenticated, logout, role, roleReady, authReady, session } = useAuth();
  const [currentView, setCurrentView] = useState(() => {
    // Signed-in customers go straight into the app so they can order; signed-out visitors see the landing page.
    // (Team members are always sent to their own app once their role is known.)
    try {
      const savedView = sessionStorage.getItem('poshak_view');
      if (savedView) return savedView;
      return localStorage.getItem('poshak_user') ? 'app' : 'landing';
    } catch {
      return 'landing';
    }
  }); // 'landing' | 'login' | 'app'
  const [activeTab, setActiveTab] = useState('home');
  const [selectedService, setSelectedService] = useState(null);
  const [bookingService, setBookingService] = useState(null);

  // Each team role has its own app and sign-in page: /#/admin, /#/rider, /#/laundry (and /#/staff sends anyone to theirs)
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const clearHash = () => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setHash('');
  };

  // Staff only ever see their own app: wherever they are, they are pulled back to it.
  const staffHome = { admin: '#/admin', captain: '#/rider', cleaner: '#/laundry' }[role] || null;
  useEffect(() => {
    if (isAuthenticated && roleReady && staffHome && hash !== staffHome && !hash.startsWith('#/track/')) window.location.hash = staffHome;
  }, [isAuthenticated, roleReady, staffHome, hash]);

  // Real backend + signed out (e.g. the session expired, or a leftover local login was discarded): back to the landing page.
  useEffect(() => {
    if (isBackendConfigured && authReady && !session && currentView === 'app') {
      setCurrentView('landing');
      try { sessionStorage.setItem('poshak_view', 'landing'); } catch { /* ignore */ }
    }
  }, [authReady, session, currentView]);

  // Signing out anywhere (any app, another tab, or an expired session) always lands on the public website.
  const hadSession = useRef(false);
  useEffect(() => {
    if (!authReady) return;
    if (hadSession.current && !session) {
      clearHash();
      setCurrentView('landing');
      try { sessionStorage.setItem('poshak_view', 'landing'); } catch { /* ignore */ }
    }
    hadSession.current = !!session;
  }, [authReady, session]);

  // There is one sign-in for everyone. Old team links (#/admin, #/rider, #/laundry, #/staff) opened while signed out go to
  // that sign-in; opened by a customer they go to the customer app. After sign-in, team members are routed by their role.
  const isTeamHash = /^#\/(admin|rider|captain|laundry|cleaner|staff)/.test(hash);
  useEffect(() => {
    if (!isBackendConfigured || !authReady || !isTeamHash) return;
    if (!session) { clearHash(); handleViewChange('login'); }
    else if (roleReady && !staffHome) { clearHash(); handleViewChange('app'); }
  }, [isTeamHash, authReady, session, roleReady, staffHome]); // eslint-disable-line react-hooks/exhaustive-deps

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
  if (hash.startsWith('#/track/')) return <Boot><PublicTrack token={decodeURIComponent(hash.slice(8).split('?')[0])} /></Boot>;
  if (staffHome && session) return <Boot>{staffHome === '#/admin' ? <AdminDashboard /> : staffHome === '#/laundry' ? <CleanerApp /> : <CaptainApp />}</Boot>;
  // (While a team link is being redirected, show the loader rather than flashing a separate sign-in page.)
  if (isBackendConfigured && isTeamHash && (!session || !staffHome)) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#888', fontFamily: 'system-ui' }}><SlowLoading /></div>;
  if (hash.startsWith('#/staff')) return <Boot><StaffPortal /></Boot>;
  if (hash.startsWith('#/admin')) return <Boot><AdminDashboard /></Boot>;
  if (hash.startsWith('#/rider') || hash.startsWith('#/captain')) return <Boot><CaptainApp /></Boot>;
  if (hash.startsWith('#/laundry') || hash.startsWith('#/cleaner')) return <Boot><CleanerApp /></Boot>;

  if (currentView === 'login') {
    return (
      <Boot>
        <LoginPage 
          bookingService={bookingService}
          onBackToHome={() => handleViewChange('landing')}
          onLoginSuccess={handleLoginSuccess}
        />
      </Boot>
    );
  }

  if (currentView === 'app') {
    return (
      <Boot>
        <MainApp 
          user={user}
          logout={() => {
            logout();
            handleViewChange('landing');
          }}
          onBackToLanding={() => handleViewChange('landing')}
        />
      </Boot>
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
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CatalogProvider>
        <AppContent />
      </CatalogProvider>
    </AuthProvider>
  );
}
