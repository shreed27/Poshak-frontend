import React, { useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Zap,
  UserCheck,
  MapPin,
  Clock,
  LogOut,
  Check,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGoogleLogin, GoogleLogin } from '@react-oauth/google';
import { supabase, getAuthProviders } from '../lib/supabase';
import { LegalModal } from './LegalModals';

export const LoginPage = ({ bookingService, onBackToHome, onLoginSuccess }) => {
  const { user, isAuthenticated, logout, loginWithGooglePayload, loginDemo, loginWithGoogleIdToken, loginWithGoogleOAuth } = useAuth();
  const [authMethod, setAuthMethod] = useState('google'); // 'google' | 'phone' | 'email'
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [dpdpConsent, setDpdpConsent] = useState(true);
  const [activeLegalModal, setActiveLegalModal] = useState(null);


  // Authenticated Member Direct Pickup State
  const [selectedService, setSelectedService] = useState(
    bookingService && ['Wash & Fold', 'Wash, Fold & Iron'].includes(bookingService.name) ? bookingService.name : 'Wash & Fold'
  );
  const [flatBuilding, setFlatBuilding] = useState('Flat 304, Palm Grove Apts');
  const [streetArea, setStreetArea] = useState('12th Main Rd, HAL 2nd Stage, Indiranagar');
  const [pincode, setPincode] = useState('560038');
  const [landmark, setLandmark] = useState('Near 100ft Road');
  const [notes, setNotes] = useState('');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingRef, setBookingRef] = useState('');

  const fullAddress = `${flatBuilding}, ${streetArea}, ${landmark ? landmark + ', ' : ''}Bengaluru - ${pincode}`;

  const handleMemberBookingSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }
      const ref = `PSK-${Math.floor(10000 + Math.random() * 90000)}`;
      setBookingRef(ref);
      setBookingConfirmed(true);
      setLoading(false);
    }, 400);
  };

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const hasValidClientId = clientId && !clientId.includes('your-google-oauth-client-id') && !clientId.includes('dummy-poshak');

  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setAuthError(null);
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });
        const profile = await res.json();
        loginWithGooglePayload({
          name: profile.name || profile.given_name || 'Google User',
          email: profile.email || 'user@gmail.com',
          picture: profile.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        });
        onLoginSuccess && onLoginSuccess();
      } catch (err) {
        console.error('Failed to fetch user profile from Google API:', err);
        if (supabase) { setAuthError('Google sign-in did not complete. Please try again.'); return; }
        loginDemo('Google Member', 'user@gmail.com');
        onLoginSuccess && onLoginSuccess();
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.warn('Google Sign-In notice:', error);
      // Real backend: never fake a login. Local demo (no backend configured): fall back to a demo profile.
      if (supabase) { setAuthError('Google sign-in was cancelled or blocked. Please try again.'); return; }
      handleQuickDemoLogin('Aditya Hegde (Google)', 'aditya@poshak.in');
    },
  });

  const handleQuickDemoLogin = (roleName = 'Aditya Hegde', roleEmail = 'aditya@poshak.in') => {
    setLoading(true);
    setTimeout(() => {
      loginDemo(roleName, roleEmail);
      setLoading(false);
      onLoginSuccess && onLoginSuccess();
    }, 350);
  };

  // ---- real sign-in (Supabase): one-time codes by SMS or email. Falls back to the demo flow only when no backend is configured.
  const [resendIn, setResendIn] = useState(0);
  // Hide the phone tab until an SMS provider is switched on in Supabase (otherwise it can only show an error).
  const [phoneEnabled, setPhoneEnabled] = useState(!supabase);
  React.useEffect(() => { if (supabase) getAuthProviders().then((p) => setPhoneEnabled(p.phone)); }, []);
  React.useEffect(() => { if (!phoneEnabled && authMethod === 'phone') setAuthMethod('google'); }, [phoneEnabled, authMethod]);
  React.useEffect(() => { if (resendIn <= 0) return undefined; const t = setTimeout(() => setResendIn((n) => n - 1), 1000); return () => clearTimeout(t); }, [resendIn]);
  const friendly = (msg = '') => (/provider|not enabled|unsupported/i.test(msg) ? 'This sign-in method isn’t switched on yet. Please use Google for now.'
    : /rate limit|too many|seconds/i.test(msg) ? 'Too many tries. Please wait a minute and try again.'
    : /invalid|expired|token/i.test(msg) ? 'That code is wrong or has expired. Check it and try again, or resend a new one.' : msg);
  const needConsent = () => { if (!dpdpConsent) { alert('Please check the box to agree to the Terms of Service and DPDP Act 2023 Privacy Notice.'); return true; } return false; };

  const sendPhoneCode = async () => {
    setLoading(true); setAuthError(null);
    try {
      if (phone.length !== 10) throw new Error('Enter your 10-digit mobile number');
      const { error } = await supabase.auth.signInWithOtp({ phone: `+91${phone}`, options: { data: { full_name: fullName } } });
      if (error) throw error;
      setOtpSent(true); setOtp(''); setResendIn(30);
    } catch (err) { setAuthError(friendly(err.message)); } finally { setLoading(false); }
  };
  const sendEmailCode = async () => {
    setLoading(true); setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { data: { full_name: fullName }, shouldCreateUser: true } });
      if (error) throw error;
      setOtpSent(true); setOtp(''); setResendIn(45);
    } catch (err) { setAuthError(friendly(err.message)); } finally { setLoading(false); }
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (needConsent()) return;
    if (!supabase) {                                             // local demo mode
      if (!otpSent) { if (phone.length >= 10) setOtpSent(true); return; }
      setLoading(true);
      setTimeout(() => { loginDemo(fullName || 'Bengaluru Member', `${phone}@poshak.in`); setLoading(false); onLoginSuccess && onLoginSuccess(); }, 450);
      return;
    }
    if (!otpSent) { await sendPhoneCode(); return; }
    setLoading(true); setAuthError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone: `+91${phone}`, token: otp.trim(), type: 'sms' });
      if (error) throw error;
      if (fullName) supabase.auth.updateUser({ data: { full_name: fullName } }).catch(() => {});
      onLoginSuccess && onLoginSuccess();
    } catch (err) { setAuthError(friendly(err.message)); } finally { setLoading(false); }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (needConsent() || !email) return;
    if (!supabase) {
      setLoading(true);
      setTimeout(() => { loginDemo(fullName || email.split('@')[0], email); setLoading(false); onLoginSuccess && onLoginSuccess(); }, 450);
      return;
    }
    if (!otpSent) { await sendEmailCode(); return; }
    setLoading(true); setAuthError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: otp.trim(), type: 'email' });
      if (error) throw error;
      onLoginSuccess && onLoginSuccess();
    } catch (err) { setAuthError(friendly(err.message)); } finally { setLoading(false); }
  };


  return (
    <div className="login-page-root">
      {/* Top Floating Navigation Header */}
      <header className="login-page-top-nav">
        <button className="login-back-btn" onClick={onBackToHome} aria-label="Back to Homepage">
          <ArrowLeft size={18} />
          <span>Back to Home</span>
        </button>
        <div className="login-brand-logo-wrap" onClick={onBackToHome}>
          <span className="login-brand-logo">Poshak</span>
        </div>
        <div className="login-top-city-tag">
          <span className="live-dot-pulse"></span>
          <span>Bengaluru Atelier</span>
        </div>
      </header>

      {/* Main 2-Column Split Content */}
      <div className="login-split-container">
        {/* Left Side: Brand Visual & Highlights */}
        <motion.div 
          className="login-visual-panel"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="login-visual-backdrop">
            <img 
              src="/hero-specialist.jpg" 
              alt="Poshak Master Garment Specialist" 
              className="login-visual-bg-img"
            />
            <div className="login-visual-gradient-mask"></div>
          </div>

          <div className="login-visual-content">
            <div className="login-badge-pill">
              <Sparkles size={14} className="text-orange" />
              <span>DOORSTEP PICKUP ACCESS</span>
            </div>

            <h1 className="login-visual-headline">
              Elevate Your Wardrobe Care in Bengaluru.
            </h1>

            <p className="login-visual-subtext">
              Sign in to unlock seamless scheduled pickups, live order tracking, and master dry cleaning for your cherished fabrics.
            </p>

            {/* Feature Highlights Grid */}
            <div className="login-perks-list">
              <div className="login-perk-item">
                <div className="perk-icon-circle">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <strong>Pay by the kilo</strong>
                  <p>Clothes are weighed at your door, so you pay only for what you send</p>
                </div>
              </div>

              <div className="login-perk-item">
                <div className="perk-icon-circle">
                  <Zap size={16} />
                </div>
                <div>
                  <strong>Doorstep pickup & delivery</strong>
                  <p>Now serving SG Palya & Christ University, Bengaluru</p>
                </div>
              </div>

              <div className="login-perk-item">
                <div className="perk-icon-circle">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <strong>Zero Pre-Payment Required</strong>
                  <p>Pay conveniently on delivery via UPI (GPay, PhonePe) or cash</p>
                </div>
              </div>
            </div>

            <div className="login-visual-footer-note">
              <span>Doorstep laundry · Bengaluru</span>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Interactive Login Form Card */}
        <motion.div 
          className="login-form-panel"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <div className="login-card-box">
            {isAuthenticated ? (
              /* Authenticated Member View (No login inputs!) */
              !bookingConfirmed ? (
                <div className="member-booking-view">
                  <div className="member-profile-header-card">
                    <img 
                      src={user?.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'} 
                      alt={user?.name || 'Member'} 
                      className="member-avatar-img"
                    />
                    <div className="member-profile-details">
                      <div className="member-verified-pill">
                        <span className="live-dot-pulse"></span>
                        <span>Verified Bengaluru Member</span>
                      </div>
                      <h3 className="member-welcome-name">Hello, {user?.name?.split(' ')[0] || 'Member'} 👋</h3>
                      <span className="member-email-sub">{user?.email || 'member@poshak.in'}</span>
                    </div>
                  </div>

                  <form onSubmit={handleMemberBookingSubmit} className="member-booking-form-box">
                    <div className="form-group-item">
                      <label>Select Service Plan</label>
                      <select 
                        value={selectedService} 
                        onChange={(e) => setSelectedService(e.target.value)}
                        className="member-custom-select"
                      >
                        <option value="Wash & Fold">Wash & Fold (₹59 / kg • 24 Hours)</option>
                        <option value="Wash, Fold & Iron">Wash, Fold & Iron (₹89 / kg • Most Popular)</option>
                      </select>
                    </div>

                    {/* House / Flat & Building */}
                    <div className="form-group-item">
                      <label>Flat / House No & Apartment / Building Name</label>
                      <div className="input-with-prefix">
                        <span className="phone-prefix"><MapPin size={15} /></span>
                        <input 
                          type="text" 
                          value={flatBuilding}
                          onChange={(e) => setFlatBuilding(e.target.value)}
                          placeholder="e.g. Flat 304, Palm Grove Apartments"
                          required
                        />
                      </div>
                    </div>

                    {/* Street, Locality & Pincode Grid */}
                    <div className="member-form-row-2col">
                      <div className="form-group-item" style={{ flex: 1.6 }}>
                        <label>Street & Locality (Bengaluru)</label>
                        <input 
                          type="text" 
                          value={streetArea}
                          onChange={(e) => setStreetArea(e.target.value)}
                          placeholder="e.g. 12th Main, Indiranagar / HSR"
                          className="member-sub-input"
                          required
                        />
                      </div>

                      <div className="form-group-item" style={{ flex: 1 }}>
                        <label>Pincode</label>
                        <input 
                          type="text" 
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="560038"
                          className="member-sub-input"
                          maxLength={6}
                          required
                        />
                      </div>
                    </div>

                    {/* Landmark */}
                    <div className="form-group-item">
                      <label>Nearby Landmark (Optional)</label>
                      <input 
                        type="text" 
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        placeholder="e.g. Near Metro Station / Behind Starbucks"
                        className="member-notes-input"
                      />
                    </div>

                    {/* Fabric Notes */}
                    <div className="form-group-item">
                      <label>Fabric / Pickup Instructions (Optional)</label>
                      <input 
                        type="text" 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Silk saree dry clean, leave at security if unavailable..."
                        className="member-notes-input"
                      />
                    </div>

                    {/* Instant Auto-Dispatch Notice */}
                    <div className="member-dispatch-pill">
                      <Zap size={14} className="text-orange" />
                      <span><strong>Instant Express Dispatch:</strong> Nearest rider is assigned right after confirmation.</span>
                    </div>

                    <button type="submit" className="login-submit-btn-orange" disabled={loading}>
                      <span>{loading ? 'Saving Address...' : 'Fill in your address'}</span>
                      <ArrowRight size={16} />
                    </button>

                    <div className="member-account-footer-row">
                      <button type="button" onClick={() => onLoginSuccess && onLoginSuccess()} className="member-sub-btn" style={{ color: '#fa5929', fontWeight: '700' }}>
                        <span>⚡ Go to My Dashboard</span>
                      </button>
                      <span>•</span>
                      <button type="button" onClick={onBackToHome} className="member-sub-btn">
                        ← Back to Home
                      </button>
                      <span>•</span>
                      <button type="button" onClick={logout} className="member-sub-btn logout-link">
                        <LogOut size={12} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Instant Booking Success View */
                <div className="member-success-card-view">
                  <div className="success-icon-badge-large">
                    <Check size={36} color="#ffffff" strokeWidth={3} />
                  </div>
                  <h3 className="success-hero-title">Pickup Confirmed!</h3>
                  <div className="success-ref-pill-glow">Ref #{bookingRef}</div>
                  <p className="success-summary-text">
                    Our Bengaluru specialist rider has been dispatched for <strong>{selectedService}</strong> to collect from:
                  </p>
                  <div className="success-address-preview-box">
                    <MapPin size={16} className="text-orange" />
                    <span>{fullAddress}</span>
                  </div>
                  <button 
                    className="login-submit-btn-orange" 
                    onClick={() => onLoginSuccess && onLoginSuccess()}
                    style={{ marginBottom: '0.65rem' }}
                  >
                    <span>Track Live in Customer Dashboard</span>
                    <ArrowRight size={16} />
                  </button>
                  <button 
                    type="button"
                    onClick={onBackToHome}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'rgba(255,255,255,0.85)',
                      padding: '0.65rem 1rem',
                      borderRadius: '9999px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    <span>Return to Public Home</span>
                  </button>
                </div>
              )
            ) : (
              /* Unauthenticated View (Login/Signup Tabs) */
              <>
                <div className="login-card-header">
                  <span className="login-welcome-tag">START YOUR PICKUP</span>
                  <h2 className="login-card-title">Welcome to Poshak</h2>
                  <p className="login-card-desc">
                    Sign in to schedule your pickup window and track your courier live.
                  </p>

                  {bookingService && (
                    <div className="login-selected-plan-pill">
                      <Sparkles size={13} className="text-orange" />
                      <span>
                        Selected: <strong>{bookingService.name}</strong> {bookingService.price ? `(${bookingService.price} ${bookingService.unit || ''})` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {authError && <div role="alert" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 12, padding: '.6rem .8rem', fontSize: '.82rem', margin: '0 0 .9rem', lineHeight: 1.4 }}>{authError}</div>}

                {/* Method Tabs */}
                <div className="login-tabs-row">
                  <button 
                    className={`login-tab-btn ${authMethod === 'google' ? 'active' : ''}`}
                    onClick={() => setAuthMethod('google')}
                  >
                    <span>Google</span>
                  </button>
                  {phoneEnabled && (
                    <button 
                      className={`login-tab-btn ${authMethod === 'phone' ? 'active' : ''}`}
                      onClick={() => { setAuthMethod('phone'); setOtpSent(false); setAuthError(null); }}
                    >
                      <span>Phone OTP</span>
                    </button>
                  )}
                  <button 
                    className={`login-tab-btn ${authMethod === 'email' ? 'active' : ''}`}
                    onClick={() => { setAuthMethod('email'); setOtpSent(false); setAuthError(null); }}
                  >
                    <span>Email</span>
                  </button>
                </div>

                {/* DPDP Act, 2023 Statutory Consent & Terms Checkbox */}
                <div style={{
                  background: dpdpConsent ? 'rgba(250, 89, 41, 0.05)' : '#fef2f2',
                  border: '1.5px solid',
                  borderColor: dpdpConsent ? 'rgba(250, 89, 41, 0.2)' : '#f87171',
                  borderRadius: '14px',
                  padding: '0.75rem 0.95rem',
                  marginBottom: '1rem',
                  fontSize: '0.75rem',
                  color: '#374151',
                  lineHeight: 1.45,
                  transition: 'all 0.2s ease'
                }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox"
                      checked={dpdpConsent}
                      onChange={(e) => setDpdpConsent(e.target.checked)}
                      style={{ marginTop: '2px', accentColor: '#fa5929', width: '16px', height: '16px', flexShrink: 0 }}
                    />
                    <span>
                      I agree to Poshak's{' '}
                      <button 
                        type="button" 
                        onClick={() => setActiveLegalModal('terms')} 
                        style={{ color: '#fa5929', background: 'transparent', border: 'none', padding: 0, fontWeight: '800', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        Terms of Service
                      </button>{' '}
                      and give explicit consent to personal data processing under India's{' '}
                      <button 
                        type="button" 
                        onClick={() => setActiveLegalModal('dpdp')} 
                        style={{ color: '#fa5929', background: 'transparent', border: 'none', padding: 0, fontWeight: '800', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        DPDP Act, 2023 Privacy Notice
                      </button>.
                    </span>
                  </label>
                  {!dpdpConsent && (
                    <div style={{ color: '#dc2626', fontSize: '0.72rem', fontWeight: '700', marginTop: '0.35rem' }}>
                      * Consent required under India's DPDP Act, 2023 to proceed with booking.
                    </div>
                  )}
                </div>


                {/* Tab 1: Google 1-Click Login */}
                {authMethod === 'google' && (
                  <div className="login-method-body">
                    {!supabase && <div className="google-official-login-container">
                      <GoogleLogin
                        onSuccess={(credentialResponse) => {
                          try {
                            const token = credentialResponse.credential;
                            const base64Url = token.split('.')[1];
                            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                            const jsonPayload = decodeURIComponent(
                              atob(base64)
                                .split('')
                                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                                .join('')
                            );
                            const profile = JSON.parse(jsonPayload);
                            loginWithGoogleIdToken(token); // creates the Supabase session so orders can be saved
                            loginWithGooglePayload({
                              name: profile.name || profile.given_name || 'Google User',
                              email: profile.email || 'user@gmail.com',
                              picture: profile.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
                            });
                            onLoginSuccess && onLoginSuccess();
                          } catch (err) {
                            console.error('Error parsing Google credential:', err);
                            if (supabase) { setAuthError('Google sign-in did not complete. Please try again.'); return; }
                            loginDemo('Google Member', 'user@poshak.in');
                            onLoginSuccess && onLoginSuccess();
                          }
                        }}
                        onError={() => {
                          console.warn('Google Identity Services button error');
                        }}
                        useOneTap
                        theme="filled_blue"
                        shape="pill"
                        size="large"
                        text="continue_with"
                        width="100%"
                      />
                    </div>}

                    <button 
                      className="google-action-btn hover-lift"
                      onClick={() => {
                        if (!dpdpConsent) {
                          alert('Please check the box to agree to the Terms of Service and DPDP Act 2023 Privacy Notice.');
                          return;
                        }
                        if (supabase) { loginWithGoogleOAuth(); return; }
                        triggerGoogleLogin();
                      }}
                      disabled={loading}
                      style={{ marginTop: '0.75rem' }}
                    >
                      <svg className="google-icon-svg" viewBox="0 0 24 24" width="22" height="22">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                      </svg>
                      <div className="google-btn-content">
                        <span className="google-btn-title">
                          {loading ? 'Connecting…' : supabase ? 'Continue with Google' : 'Google OAuth Popup'}
                        </span>
                        <span className="google-btn-caption">{supabase ? 'Secure sign-in with your Google account' : 'Direct Google API Authorization'}</span>
                      </div>
                      <ArrowRight size={18} className="google-arrow" />
                    </button>

                    {!supabase && <div className="login-fast-access-box">
                      <span className="fast-access-label">Quick Test Profile:</span>
                      <div className="fast-access-chips">
                        <button 
                          type="button" 
                          className="fast-chip-btn"
                          onClick={() => {
                            if (!dpdpConsent) {
                              alert('Please check the box to agree to the Terms of Service and DPDP Act 2023 Privacy Notice.');
                              return;
                            }
                            handleQuickDemoLogin('Ananya Rao (Indiranagar)', 'ananya@poshak.in');
                          }}
                        >
                          <UserCheck size={13} />
                          <span>Ananya (Indiranagar)</span>
                        </button>
                        <button 
                          type="button" 
                          className="fast-chip-btn"
                          onClick={() => {
                            if (!dpdpConsent) {
                              alert('Please check the box to agree to the Terms of Service and DPDP Act 2023 Privacy Notice.');
                              return;
                            }
                            handleQuickDemoLogin('Rohan Sharma (HSR)', 'rohan@poshak.in');
                          }}
                        >
                          <UserCheck size={13} />
                          <span>Rohan (HSR Layout)</span>
                        </button>
                      </div>
                    </div>}
                  </div>
                )}

                {/* Tab 2: Mobile Phone OTP */}
                {authMethod === 'phone' && (
                  <form onSubmit={handlePhoneSubmit} className="login-form-inner">
                    {!otpSent ? (
                      <>
                        <div className="form-group-item">
                          <label>Your Full Name</label>
                          <input 
                            type="text" 
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="e.g. Priya Sundaram"
                            required
                          />
                        </div>
                        <div className="form-group-item">
                          <label>Mobile Number (Bengaluru)</label>
                          <div className="input-with-prefix">
                            <span className="phone-prefix">+91</span>
                            <input 
                              type="tel" 
                              value={phone}
                              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                              placeholder="98765 43210"
                              maxLength={10}
                              required
                            />
                          </div>
                        </div>
                        <button type="submit" className="login-submit-btn-orange">
                          <span>{loading ? 'Sending…' : 'Send OTP'}</span>
                          <ArrowRight size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="otp-sent-banner">
                          <span>OTP sent to <strong>+91 {phone}</strong></span>
                          <button type="button" onClick={() => setOtpSent(false)} className="edit-phone-btn">
                            Change
                          </button>
                        </div>
                        <div className="form-group-item">
                          <label>Enter the {supabase ? '6' : '4'}-digit code</label>
                          <input 
                            type="text" 
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, supabase ? 6 : 4))}
                            placeholder="• • • •"
                            className="otp-code-input"
                            autoFocus
                            required
                          />
                          {!supabase && <span className="otp-demo-hint">Testing Hint: Enter any 4 numbers (e.g. 1234)</span>}
                          {supabase && <button type="button" className="edit-phone-btn" style={{ marginTop: '.5rem' }} disabled={resendIn > 0 || loading} onClick={sendPhoneCode}>{resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}</button>}
                        </div>
                        <button type="submit" className="login-submit-btn-orange" disabled={loading}>
                          <span>{loading ? 'Verifying…' : 'Confirm & continue'}</span>
                          <ArrowRight size={16} />
                        </button>
                      </>
                    )}
                  </form>
                )}

                {/* Tab 3: Email Login */}
                {authMethod === 'email' && (
                  <form onSubmit={handleEmailSubmit} className="login-form-inner">
                    <div className="form-group-item">
                      <label>Your Name</label>
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Shreed Shrivastava"
                        required
                      />
                    </div>
                    <div className="form-group-item">
                      <label>Email Address</label>
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. user@gmail.com"
                        required
                      />
                    </div>
                    {supabase && otpSent && (
                      <div className="form-group-item">
                        <label>Enter the 6-digit code we emailed you</label>
                        <input type="text" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="• • • • • •" className="otp-code-input" autoFocus required />
                        <button type="button" className="edit-phone-btn" style={{ marginTop: '.5rem' }} disabled={resendIn > 0 || loading} onClick={sendEmailCode}>{resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}</button>
                      </div>
                    )}
                    <button type="submit" className="login-submit-btn-orange" disabled={loading}>
                      <span>{loading ? 'Please wait…' : supabase ? (otpSent ? 'Verify & continue' : 'Email me a code') : 'Continue to Schedule Pickup'}</span>
                      <ArrowRight size={16} />
                    </button>
                  </form>
                )}

                {/* Security & Reassurance Footer */}
                <div className="login-card-guarantee-row">
                  <ShieldCheck size={16} className="text-green" />
                  <span>Secure sign-in · We never share your details</span>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* DPDP Act, 2023 Statutory Legal Modal */}
      <LegalModal 
        isOpen={Boolean(activeLegalModal)} 
        initialTab={activeLegalModal || 'dpdp'} 
        onClose={() => setActiveLegalModal(null)} 
      />
    </div>
  );
};
