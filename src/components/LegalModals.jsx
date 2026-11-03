import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  FileText, 
  Lock, 
  UserCheck, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  Mail,
  MapPin,
  Clock,
  Trash2,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const LegalModal = ({ isOpen, onClose, initialTab = 'dpdp' }) => {
  // 'dpdp' | 'terms' | 'grievance' | 'rights'
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  return (
    <div className="swiggy-cart-modal-backdrop" onClick={onClose} style={{ padding: '1rem', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
      <motion.div 
        className="booking-wizard-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        style={{ width: 'min(100%, 780px)', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="wizard-top-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #ebebeb' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
              <ShieldCheck size={18} color="#fa5929" />
              <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#fa5929', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Legal & Data Protection Compliance
              </span>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#111', margin: 0 }}>
              Poshak Legal & Privacy Center
            </h3>
            <span style={{ fontSize: '0.74rem', color: '#686b78' }}>
              Compliant with India's Digital Personal Data Protection (DPDP) Act, 2023
            </span>
          </div>

          <button 
            type="button"
            className="wizard-close-btn"
            onClick={onClose}
            aria-label="Close legal modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Pills */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.75rem 1.5rem',
          background: '#f9fafb',
          borderBottom: '1px solid #ebebeb',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          {[
            { id: 'dpdp', label: 'DPDP Privacy Notice', icon: Lock },
            { id: 'terms', label: 'Terms & Conditions', icon: FileText },
            { id: 'rights', label: 'Your DPDP Rights', icon: UserCheck },
            { id: 'grievance', label: 'Grievance Officer', icon: Mail }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.95rem',
                  borderRadius: '9999px',
                  border: '1.5px solid',
                  borderColor: isActive ? '#fa5929' : '#e5e7eb',
                  background: isActive ? '#fa5929' : '#ffffff',
                  color: isActive ? '#ffffff' : '#4b5563',
                  fontSize: '0.78rem',
                  fontWeight: '800',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Document Content */}
        <div style={{
          padding: '1.5rem',
          overflowY: 'auto',
          maxHeight: 'calc(90vh - 180px)',
          fontSize: '0.86rem',
          lineHeight: 1.6,
          color: '#374151'
        }}>
          {/* TAB 1: DPDP ACT 2023 PRIVACY NOTICE */}
          {activeTab === 'dpdp' && (
            <div>
              <div style={{
                background: '#ecfdf5',
                border: '1.5px solid #a7f3d0',
                borderRadius: '14px',
                padding: '1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start'
              }}>
                <ShieldCheck size={20} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.8rem', color: '#065f46' }}>
                  <strong>Digital Personal Data Protection (DPDP) Act, 2023 Statutory Notice:</strong><br />
                  Under Section 5 of the DPDP Act, 2023, Poshak Technologies Pvt. Ltd. (Data Fiduciary) provides this itemised notice informing you of the specific personal data collected, lawful purposes of processing, and mechanisms to exercise your rights.
                </div>
              </div>

              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#111', marginTop: 0 }}>
                1. Data Fiduciary Identity
              </h4>
              <p>
                <strong>Poshak Technologies Private Limited</strong> ("Poshak", "we", "us", or "our")<br />
                Registered Address: 100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka, India - 560038.<br />
                Corporate Contact: <code>privacy@poshak.in</code> | Grievance Contact: <code>grievance@poshak.in</code>
              </p>

              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#111', marginTop: '1.25rem' }}>
                2. Itemised Personal Data Collected
              </h4>
              <p>We collect only the minimal personal data strictly necessary to fulfill doorstep laundry and dry cleaning services:</p>
              <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
                <li><strong>Identity & Contact:</strong> Full name, verified mobile phone number, email address.</li>
                <li><strong>Doorstep Geolocation & Address:</strong> Apartment / house number, building name, street area, landmark, pincode, and optional GPS coordinates for captain navigation.</li>
                <li><strong>Garment Imagery:</strong> User-uploaded photos of clothes, laundry bags, and pre-existing garment stains for digital care tagging and doorstep weigh-in records.</li>
                <li><strong>Transaction Records:</strong> Laundry package selected, digital scale weight, pickup time window, and delivery receipts (Payment is executed via third-party RBI-authorized gateways or cash on delivery; no debit/credit card CVV or netbanking passwords are ever stored by Poshak).</li>
              </ul>

              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#111', marginTop: '1.25rem' }}>
                3. Specified Lawful Purposes of Processing
              </h4>
              <p>Your personal data is processed solely for the following specified purposes pursuant to Section 4 and Section 6 of the DPDP Act, 2023:</p>
              <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
                <li>Scheduling and dispatching delivery captains to your doorstep for certified digital weigh-in.</li>
                <li>Executing customized fabric care (hypoallergenic RO wash, steam pressing, zero-shrink dry cleaning).</li>
                <li>Sending real-time milestone notifications, pickup OTP, and delivery verification OTP.</li>
                <li>Invoicing, accounting, and statutory GST tax compliance in India.</li>
              </ul>

              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#111', marginTop: '1.25rem' }}>
                4. Data Retention & Erasure
              </h4>
              <p>
                Personal data is retained only for as long as necessary to fulfill the laundry service and satisfy Indian statutory record-keeping requirements. User-uploaded garment imagery is automatically purged within 30 days after completed delivery. You may request immediate erasure at any time via your Customer Dashboard.
              </p>
            </div>
          )}

          {/* TAB 2: TERMS & CONDITIONS */}
          {activeTab === 'terms' && (
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#111', marginTop: 0 }}>
                1. Service Scope & Doorstep Protocol
              </h4>
              <p>
                Poshak operates direct fabric care and laundry facilities in Bengaluru. When you schedule a pickup, our delivery captain arrives at your designated doorstep with a certified digital scale to weigh your garments in your presence and seal them in a numbered tamper-evident laundry bag.
              </p>

              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#111', marginTop: '1.25rem' }}>
                2. Zero Advance Payment Policy
              </h4>
              <p>
                Poshak does not charge advance fees for doorstep laundry. The final bill is calculated based on actual digital weigh-in at your doorstep. Payment is collected on delivery via UPI, card, or cash after your fresh crisp clothes are handed back.
              </p>

              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#111', marginTop: '1.25rem' }}>
                3. Garment Care & Special Fabrics Disclaimer
              </h4>
              <p>
                While our facility uses pure RO soft water, Italian vacuum steam presses, and zero-bleed eco-solvents, customers must notify us of delicate fabrics (pure zaris, raw silks, cashmere) or stubborn existing stains via the app notes or during captain handover. Poshak is not liable for normal wear-and-tear, colour bleeding caused by manufacturer dye defects, or items left inside garment pockets (pens, coins, jewellery).
              </p>

              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#111', marginTop: '1.25rem' }}>
                4. Turnaround Times & Delivery
              </h4>
              <p>
                Standard wash and steam iron turnaround is 24 hours. Express Blitz delivery delivers within 6 hours. In the event of unforeseen monsoon traffic or city disruptions in Bengaluru, customer care proactively reschedules your delivery window.
              </p>

              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#111', marginTop: '1.25rem' }}>
                5. Free Cancellation & Rescheduling
              </h4>
              <p>
                You may reschedule or cancel your pickup window free of charge at any time before Captain Vikram arrives at your doorstep.
              </p>

              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#111', marginTop: '1.25rem' }}>
                6. Governing Law & Dispute Jurisdiction
              </h4>
              <p>
                These terms are governed by the laws of India. Any disputes arising out of services rendered shall be subject to the exclusive jurisdiction of the competent courts in Bengaluru, Karnataka.
              </p>
            </div>
          )}

          {/* TAB 3: STATUTORY RIGHTS OF DATA PRINCIPAL */}
          {activeTab === 'rights' && (
            <div>
              <p>
                As a Data Principal under Chapter III of the Digital Personal Data Protection Act, 2023, you have the following statutory rights regarding your personal data processed by Poshak:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
                <div style={{ background: '#f9fafb', border: '1px solid #ebebeb', padding: '1rem', borderRadius: '12px' }}>
                  <strong style={{ color: '#111', fontSize: '0.92rem' }}>1. Right to Access Information (Section 11)</strong>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#555' }}>
                    You have the right to obtain a summary of personal data being processed by Poshak, the processing activities undertaken, and the identities of any data processors involved.
                  </p>
                </div>

                <div style={{ background: '#f9fafb', border: '1px solid #ebebeb', padding: '1rem', borderRadius: '12px' }}>
                  <strong style={{ color: '#111', fontSize: '0.92rem' }}>2. Right to Correction and Erasure (Section 12)</strong>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#555' }}>
                    You have the right to correct inaccurate or misleading personal data, complete incomplete records, update addresses, and request complete erasure of your personal data when the laundry purpose is fulfilled.
                  </p>
                </div>

                <div style={{ background: '#f9fafb', border: '1px solid #ebebeb', padding: '1rem', borderRadius: '12px' }}>
                  <strong style={{ color: '#111', fontSize: '0.92rem' }}>3. Right of Grievance Redressal (Section 13)</strong>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#555' }}>
                    You have the right to register a grievance with our designated Grievance Officer regarding any act or omission by Poshak. You also have the right to escalate unresolved grievances to the Data Protection Board of India (DPBI).
                  </p>
                </div>

                <div style={{ background: '#f9fafb', border: '1px solid #ebebeb', padding: '1rem', borderRadius: '12px' }}>
                  <strong style={{ color: '#111', fontSize: '0.92rem' }}>4. Right to Withdraw Consent (Section 6(4))</strong>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#555' }}>
                    You have the right to withdraw your consent at any time through our Customer Account view. Withdrawal of consent does not affect the lawfulness of processing undertaken prior to such withdrawal.
                  </p>
                </div>

                <div style={{ background: '#f9fafb', border: '1px solid #ebebeb', padding: '1rem', borderRadius: '12px' }}>
                  <strong style={{ color: '#111', fontSize: '0.92rem' }}>5. Right to Nominate (Section 14)</strong>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#555' }}>
                    You have the right to nominate any other individual who shall, in the event of your death or incapacity, exercise your data rights.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GRIEVANCE REDRESSAL OFFICER */}
          {activeTab === 'grievance' && (
            <div>
              <div style={{
                background: '#fff7ed',
                border: '1.5px solid #fed7aa',
                borderRadius: '16px',
                padding: '1.25rem',
                marginBottom: '1.25rem'
              }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#ea580c', margin: '0 0 0.5rem' }}>
                  Designated Grievance Redressal Officer (DPDP Act, 2023)
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#7c2d12', margin: '0 0 1rem' }}>
                  Pursuant to Section 8(9) and Section 13 of the Digital Personal Data Protection Act, 2023, Poshak Technologies Pvt. Ltd. has appointed a designated Grievance Officer:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Mail size={15} color="#ea580c" />
                    <span><strong>Email:</strong> <code>grievance@poshak.in</code> (Statutory turn-around: Within 7 business days)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <MapPin size={15} color="#ea580c" />
                    <span><strong>Physical Address:</strong> Grievance Cell, Poshak Technologies Pvt. Ltd., 100 Feet Road, Indiranagar, Bengaluru, KA - 560038</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Clock size={15} color="#ea580c" />
                    <span><strong>Working Hours:</strong> Monday – Friday, 10:00 AM – 6:00 PM IST</span>
                  </div>
                </div>
              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#111' }}>
                Data Protection Board of India (DPBI) Escalation
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#686b78' }}>
                If you do not receive a resolution from our Grievance Officer within the prescribed timeframe or if you are unsatisfied with the resolution, you may submit a formal complaint directly to the Data Protection Board of India (DPBI) established under Chapter V of the DPDP Act, 2023.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #ebebeb',
          background: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.74rem', color: '#686b78' }}>
            Version 1.4 • Effective Date: October 2026 • Bengaluru, India
          </span>
          <button 
            type="button"
            onClick={onClose}
            style={{
              background: '#fa5929',
              color: '#ffffff',
              border: 'none',
              padding: '0.5rem 1.35rem',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: '800',
              cursor: 'pointer'
            }}
          >
            I Understand
          </button>
        </div>
      </motion.div>
    </div>
  );
};
