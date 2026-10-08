import React, { useState } from 'react';
import { 
  Smartphone, 
  QrCode, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Send 
} from 'lucide-react';

export const AppDownloadBanner = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sentMessage, setSentMessage] = useState(false);

  const handleSendLink = (e) => {
    e.preventDefault();
    if (phoneNumber.length >= 10) {
      setSentMessage(true);
      setTimeout(() => setSentMessage(false), 4000);
      setPhoneNumber('');
    }
  };

  return (
    <section className="app-download-section">
      <div className="section-container">
        <div className="app-banner-card glass-card">
          <div className="app-banner-grid">
            {/* Left Content */}
            <div className="app-content-col">
              <div className="section-sub-badge">
                <Sparkles size={13} />
                <span>Seamless Mobile Experience</span>
              </div>

              <h2 className="app-banner-title">
                Get the Poshak App for 1-Tap Laundry & Live GPS Tracking
              </h2>

              <p className="app-banner-desc">
                Download the Poshak mobile app to track your rider live, set automated weekly wash schedules, and unlock exclusive app-only gold pass discounts.
              </p>

              <div className="app-features-list">
                <div className="app-feat">
                  <CheckCircle2 size={16} className="feat-check" />
                  <span>Real-time washing & steam press status</span>
                </div>
                <div className="app-feat">
                  <CheckCircle2 size={16} className="feat-check" />
                  <span>Live weight sensor sync directly from rider</span>
                </div>
                <div className="app-feat">
                  <CheckCircle2 size={16} className="feat-check" />
                  <span>Instant Google One-Tap sign in</span>
                </div>
              </div>

              {/* SMS Link Form */}
              <form onSubmit={handleSendLink} className="sms-link-form">
                <div className="phone-input-wrap">
                  <span className="country-code">+91</span>
                  <input 
                    type="tel"
                    placeholder="Enter mobile number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength={10}
                    required
                  />
                  <button type="submit" className="send-link-btn">
                    <Send size={15} />
                    <span>Get App Link</span>
                  </button>
                </div>
                {sentMessage && (
                  <span className="sent-success-text">✨ App download link sent via SMS & WhatsApp!</span>
                )}
              </form>

              {/* Store Badges */}
              <div className="store-badges-row">
                <a href="#download" className="store-badge-btn" onClick={(e) => e.preventDefault()}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 3.5c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.63 1.34-.56.64-1.04 1.69-.91 2.71.99.08 2.01-.5 2.62-1.2"/>
                  </svg>
                  <div>
                    <span className="badge-sub">Download on the</span>
                    <span className="badge-main">App Store</span>
                  </div>
                </a>

                <a href="#download" className="store-badge-btn" onClick={(e) => e.preventDefault()}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a2.023 2.023 0 0 1-.22-.387C3.13 21.2 3 20.395 3 19.5V4.5c0-.895.13-1.7.39-2.299.065-.138.14-.268.219-.387zM15.207 13.415l2.76 2.76-12.87 7.432 10.11-10.192zm2.76-2.83l-2.76 2.76L5.097.393 17.967 10.585zm1.427 1.415l2.42 1.4c1.196.69 1.196 1.817 0 2.507l-2.42 1.397-2.164-2.164 2.164-2.14z"/>
                  </svg>
                  <div>
                    <span className="badge-sub">GET IT ON</span>
                    <span className="badge-main">Google Play</span>
                  </div>
                </a>
              </div>
            </div>

            {/* Right QR Code Graphic */}
            <div className="app-qr-col">
              <div className="qr-card glass-card">
                <div className="qr-badge">FLAT ₹150 OFF</div>
                <div className="qr-box">
                  {/* Decorative QR code graphic */}
                  <svg viewBox="0 0 100 100" width="140" height="140" fill="currentColor" className="qr-svg">
                    <path d="M0 0h30v30H0zm5 5h20v20H5zm35 0h10v10H40zm20 0h10v10H60zm10 0h30v30H70zm5 5h20v20H75zM10 10h10v10H10zm70 0h10v10H80zM0 40h10v10H0zm20 0h20v10H20zm30 0h10v20H50zm20 0h10v10H70zm20 0h10v20H90zM0 70h30v30H0zm5 5h20v20H5zm35 0h10v10H40zm20 0h20v10H60zm-20 20h10v10H40zm30-10h10v20H70zm10 10h20v10H80zM10 80h10v10H10zM30 60h10v10H30zm10-10h10v10H40z"/>
                  </svg>
                </div>
                <span className="qr-scan-text">Scan QR code to install</span>
                <span className="qr-sub">Available for iOS & Android</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
