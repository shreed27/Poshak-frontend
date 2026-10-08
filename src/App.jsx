import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
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
import { useCart } from './context/CartContext';

export function AppContent() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'login'
  const [activeTab, setActiveTab] = useState('home');
  const [selectedService, setSelectedService] = useState(null);
  const [bookingService, setBookingService] = useState(null);
  const { isAuthenticated } = useAuth();
  const { setIsTrackerOpen } = useCart();

  const handleOpenBooking = (service = null) => {
    setBookingService(service);
    setCurrentView('login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = () => {
    setCurrentView('landing');
  };

  const handleScrollToSection = (sectionId) => {
    if (currentView !== 'landing') {
      setCurrentView('landing');
    }
    setActiveTab(sectionId);
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  if (currentView === 'login') {
    return (
      <LoginPage 
        bookingService={bookingService}
        onBackToHome={() => setCurrentView('landing')}
        onLoginSuccess={handleLoginSuccess}
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
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}
