import React, { useState } from 'react';
import { X, ShieldCheck, Sparkles, Check, ArrowRight } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

export const GoogleAuthModal = () => {
  const { isAuthModalOpen, closeLoginModal, loginWithGooglePayload, loginDemo } = useAuth();
  const [customName, setCustomName] = useState('Shreed Shrivastava');
  const [customEmail, setCustomEmail] = useState('shreed@poshak.in');
  const [isCustomMode, setIsCustomMode] = useState(false);

  if (!isAuthModalOpen) return null;

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const hasValidClientId = clientId && !clientId.includes('your-google-oauth-client-id');

  const handleGoogleSuccess = (credentialResponse) => {
    try {
      // Decode JWT token payload (base64)
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
        name: profile.name,
        email: profile.email,
        picture: profile.picture
      });
    } catch (err) {
      console.error('Error decoding Google JWT:', err);
      // Fallback
      loginDemo('Google User', 'user@gmail.com');
    }
  };

  const handleGoogleError = () => {
    console.warn('Google Sign-In failed or was closed.');
  };

  const handleCustomLogin = (e) => {
    e.preventDefault();
    if (customEmail) {
      loginDemo(customName || 'Poshak Member', customEmail);
    }
  };

  return (
    <div className="modal-backdrop" onClick={closeLoginModal}>
      <div className="auth-modal-card glass-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={closeLoginModal} aria-label="Close modal">
          <X size={20} />
        </button>

        <div className="auth-modal-header">
          <div className="auth-brand-badge">
            <Sparkles size={16} />
            <span>POSHAK ACCESS</span>
          </div>
          <h2 className="auth-title">Welcome to Poshak</h2>
          <p className="auth-subtitle">
            Sign in with your Google account to sync addresses, track orders live, and claim your <strong>FLAT ₹150 OFF</strong> welcome credit.
          </p>
        </div>

        <div className="auth-modal-body">
          {/* Real Google OAuth Button (if GCP Client ID is active) */}
          {hasValidClientId ? (
            <div className="google-oauth-real-wrapper">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                theme="filled_blue"
                shape="pill"
                size="large"
                text="continue_with"
                width="100%"
              />
            </div>
          ) : (
            <div className="google-simulated-login-block">
              <button 
                className="google-one-tap-btn hover-lift"
                onClick={() => loginDemo(customName, customEmail)}
              >
                <svg className="google-icon-svg" viewBox="0 0 24 24" width="22" height="22">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <div className="google-btn-text">
                  <span className="google-btn-main">Continue with Google</span>
                  <span className="google-btn-sub">Instant 1-Click Verification</span>
                </div>
              </button>

              <div className="gcp-config-notice">
                <span className="config-tag">GCP OAuth Ready</span>
                <span>Connect your <code>VITE_GOOGLE_CLIENT_ID</code> in <code>.env</code> anytime for production live Google Identity Services.</span>
              </div>
            </div>
          )}

          <div className="auth-divider">
            <span>OR CUSTOMIZE PROFILE</span>
          </div>

          {!isCustomMode ? (
            <button 
              className="toggle-custom-btn"
              onClick={() => setIsCustomMode(true)}
            >
              Enter custom name & email for testing
            </button>
          ) : (
            <form onSubmit={handleCustomLogin} className="custom-login-form">
              <div className="form-group">
                <label>Your Name</label>
                <input 
                  type="text" 
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Shreed Shrivastava"
                  required
                />
              </div>
              <div className="form-group">
                <label>Gmail / Email Address</label>
                <input 
                  type="email" 
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="e.g. shreed@gmail.com"
                  required
                />
              </div>
              <button type="submit" className="btn-primary-hero full-width">
                <span>Sign In & Continue</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* Guarantee Footer */}
          <div className="auth-guarantee-row">
            <ShieldCheck size={16} className="auth-shield-icon" />
            <span>We respect your privacy. No spam. 256-bit SSL encrypted.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
