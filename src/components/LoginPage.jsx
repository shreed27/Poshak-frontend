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

export const LoginPage = ({ bookingService, onBackToHome, onLoginSuccess }) => {
  const { user, isAuthenticated, logout, loginWithGooglePayload, loginDemo } = useAuth();
  const [authMethod, setAuthMethod] = useState('google'); // 'google' | 'phone' | 'email'
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Authenticated Member Direct Pickup State
  const [selectedService, setSelectedService] = useState(
    bookingService ? bookingService.name : 'Wash, Dry & Fold'
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
        loginDemo('Google Member', 'user@gmail.com');
        onLoginSuccess && onLoginSuccess();
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.warn('Google Sign-In notice:', error);
      // Fallback to quick demo profile if popup closed or unconfigured client in local environment
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

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (!otpSent) {
      if (phone.length >= 10) {
        setOtpSent(true);
      }
    } else {
      setLoading(true);
      setTimeout(() => {
        loginDemo(fullName || 'Bengaluru Member', `${phone}@poshak.in`);
        setLoading(false);
        onLoginSuccess && onLoginSuccess();
      }, 450);
    }
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setLoading(true);
      setTimeout(() => {
        loginDemo(fullName || email.split('@')[0], email);
        setLoading(false);
        onLoginSuccess && onLoginSuccess();
      }, 450);
    }
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
                  <strong>Pure RO Water Wash</strong>
                  <p>Gentle on fibers, harsh on stains & zero fabric shrinkage</p>
                </div>
              </div>

              <div className="login-perk-item">
                <div className="perk-icon-circle">
                  <Zap size={16} />
                </div>
                <div>
                  <strong>Express 24-Hr Turnaround</strong>
                  <p>Direct doorstep collection across Indiranagar, HSR, Koramangala & Whitefield</p>
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
              <span>🌿 100% Eco-Safe Formulas • Italian Steam Precision</span>
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
                        <option value="Wash, Dry & Fold">Wash, Dry & Fold (₹95 / kg • 24 Hours)</option>
                        <option value="Wash & Iron">Wash & Iron (₹149 / kg • Most Popular)</option>
                        <option value="Shoe Cleaning">Shoe Cleaning (₹199 / pair • 48 Hours)</option>
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
                  <button className="login-submit-btn-orange" onClick={onBackToHome}>
                    <span>Return to Poshak Home</span>
                    <ArrowRight size={16} />
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

                {/* Method Tabs */}
                <div className="login-tabs-row">
                  <button 
                    className={`login-tab-btn ${authMethod === 'google' ? 'active' : ''}`}
                    onClick={() => setAuthMethod('google')}
                  >
                    <span>Google</span>
                  </button>
                  <button 
                    className={`login-tab-btn ${authMethod === 'phone' ? 'active' : ''}`}
                    onClick={() => setAuthMethod('phone')}
                  >
                    <span>Phone OTP</span>
                  </button>
                  <button 
                    className={`login-tab-btn ${authMethod === 'email' ? 'active' : ''}`}
                    onClick={() => setAuthMethod('email')}
                  >
                    <span>Email</span>
                  </button>
                </div>

                {/* Tab 1: Google 1-Click Login */}
                {authMethod === 'google' && (
                  <div className="login-method-body">
                    <div className="google-official-login-container">
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
                            loginWithGooglePayload({
                              name: profile.name || profile.given_name || 'Google User',
                              email: profile.email || 'user@gmail.com',
                              picture: profile.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
                            });
                            onLoginSuccess && onLoginSuccess();
                          } catch (err) {
                            console.error('Error parsing Google credential:', err);
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
                    </div>

                    <button 
                      className="google-action-btn hover-lift"
                      onClick={() => triggerGoogleLogin()}
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
                          {loading ? 'Connecting Google API...' : 'Google OAuth Popup'}
                        </span>
                        <span className="google-btn-caption">Direct Google API Authorization</span>
                      </div>
                      <ArrowRight size={18} className="google-arrow" />
                    </button>

                    <div className="login-fast-access-box">
                      <span className="fast-access-label">Quick Test Profile:</span>
                      <div className="fast-access-chips">
                        <button 
                          type="button" 
                          className="fast-chip-btn"
                          onClick={() => handleQuickDemoLogin('Ananya Rao (Indiranagar)', 'ananya@poshak.in')}
                        >
                          <UserCheck size={13} />
                          <span>Ananya (Indiranagar)</span>
                        </button>
                        <button 
                          type="button" 
                          className="fast-chip-btn"
                          onClick={() => handleQuickDemoLogin('Rohan Sharma (HSR)', 'rohan@poshak.in')}
                        >
                          <UserCheck size={13} />
                          <span>Rohan (HSR Layout)</span>
                        </button>
                      </div>
                    </div>
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
                          <span>Get 4-Digit OTP</span>
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
                          <label>Enter 4-Digit Code</label>
                          <input 
                            type="text" 
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.slice(0, 4))}
                            placeholder="• • • •"
                            className="otp-code-input"
                            autoFocus
                            required
                          />
                          <span className="otp-demo-hint">Testing Hint: Enter any 4 numbers (e.g. 1234)</span>
                        </div>
                        <button type="submit" className="login-submit-btn-orange" disabled={loading}>
                          <span>{loading ? 'Verifying...' : 'Confirm & Schedule Pickup'}</span>
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
                    <button type="submit" className="login-submit-btn-orange" disabled={loading}>
                      <span>{loading ? 'Logging In...' : 'Continue to Schedule Pickup'}</span>
                      <ArrowRight size={16} />
                    </button>
                  </form>
                )}

                {/* Security & Reassurance Footer */}
                <div className="login-card-guarantee-row">
                  <ShieldCheck size={16} className="text-green" />
                  <span>Encrypted with 256-Bit SSL • No spam guarantee</span>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
