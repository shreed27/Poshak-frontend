import React, { useState } from 'react';
import { MapPin, Plus, LogOut, Trash2, ShieldCheck, Download, FileText, ChevronRight, LifeBuoy, Phone, Info } from 'lucide-react';
import { telHref, supportPhone } from '../../lib/brand';
import { NotificationPrefs } from './NotificationPrefs';
import { WalletCard } from './WalletCard';
import { ReferralAndPlans } from './ReferralAndPlans';
import { LegalModal } from '../LegalModals';
import { supabase } from '../../lib/supabase';
import { useCatalog } from '../../context/CatalogContext';

export const SwiggyAccountView = ({ 
  user, 
  walletBalance, 
  onAddMoney, 
  addresses, 
  onAddAddress, 
  onDeleteAddress, 
  onOpenLocationPicker,
  onOpenHelp,
  onSetDefaultAddress, 
  onBackToLanding, 
  logout 
}) => {
  const [activeLegalTab, setActiveLegalTab] = useState(null);
  const { support } = useCatalog();

  const handleExportData = async () => {
    try {
      // Real account: export what the server holds about you; demo mode: what this device holds.
      const live = Boolean(supabase && user?.isSupabase);
      let orders = JSON.parse(localStorage.getItem('poshak_orders') || '[]');
      let serverWallet = null, quotes = [], complaints = [];
      if (live) {
        const [o, w, q, t] = await Promise.all([
          supabase.from('orders').select('order_code, status, service_name, items, actual_items, estimated_amount, final_amount, paid_amount, pickup_address, pickup_slot, created_at, delivered_at').order('created_at', { ascending: false }),
          supabase.rpc('my_wallet_balance'),
          supabase.from('quote_requests').select('quote_no, description, status, quoted_amount, created_at'),
          supabase.from('tickets').select('ticket_no, category, description, status, created_at')
        ]);
        orders = o.data || []; serverWallet = w.data ?? null; quotes = q.data || []; complaints = t.data || [];
      }
      const cart = JSON.parse(localStorage.getItem('poshak_cart') || '[]');
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        statutoryNotice: "Digital Personal Data Protection (DPDP) Act, 2023 - Section 11 Data Principal Access Record",
        dataFiduciary: {
          name: "Poshak",
          phone: "+91 91610 91144",
          jurisdiction: "Bengaluru, Karnataka, India",
          supportContact: "privacy@poshak.in",
          grievanceOfficer: "grievance@poshak.in"
        },
        dataPrincipal: {
          name: user?.name || "Poshak Member",
          email: user?.email || "user@poshak.in",
          picture: user?.picture || null
        },
        financials: {
          walletBalance: serverWallet ?? walletBalance,
          currency: "INR"
        },
        quoteRequests: quotes,
        complaints,
        savedAddresses: addresses,
        recentOrders: orders,
        activeCart: cart
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `poshak_data_export_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error("Failed to export data:", err);
      alert("Could not complete export. Please try again or contact privacy@poshak.in.");
    }
  };

  const handleErasureRequest = () => {
    const live = Boolean(supabase && user?.isSupabase);
    const confirmed = window.confirm(
      "DPDP ACT 2023 (Section 12) - DATA ERASURE REQUEST:\n\n" +
      (live
        ? "We will send an erasure request for your Poshak account to our grievance officer, and clear the data stored on this device. Orders that are still open, and records we must keep by law (such as tax invoices), are handled as the law requires.\n\n"
        : "This will erase your profile, addresses, order history and wallet records stored on this device.\n\n") +
      "Continue?"
    );
    if (!confirmed) return;
    try {
      ['poshak_orders', 'poshak_cart', 'poshak_addresses', 'poshak_wallet', 'poshak_user'].forEach((k) => localStorage.removeItem(k));
      if (live) {
        const to = support?.grievance_email || support?.email || 'grievance@poshak.in';
        const body = `Please erase the personal data held for my Poshak account.\n\nAccount email: ${user?.email || ''}\nName: ${user?.name || ''}\nRequested on: ${new Date().toLocaleString('en-IN')}`;
        window.location.href = `mailto:${to}?subject=${encodeURIComponent('Data erasure request (DPDP Act 2023)')}&body=${encodeURIComponent(body)}`;
        alert('Your email app will open with the erasure request — please send it. Data on this device has been cleared and you will now be signed out.');
      } else {
        alert('Your data has been erased from this device. You will now be signed out.');
      }
      logout();
    } catch (err) {
      console.error('Erasure failed:', err);
    }
  };

  const initials = (user?.name || user?.email || 'P').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const Row = ({ icon: Icon, title, sub, onClick, danger, right }) => (
    <button type="button" className={`qc-acc-row ${danger ? 'danger' : ''}`} onClick={onClick}>
      <span className="qc-row-ic"><Icon size={17} /></span>
      <span className="qc-acc-txt"><b>{title}</b>{sub && <span>{sub}</span>}</span>
      {right ?? <ChevronRight size={18} className="qc-acc-chev" />}
    </button>
  );

  return (
    <div className="qc-page qc-account">
      {/* Profile */}
      <div className="qc-profile">
        {user?.picture ? <img src={user.picture} alt="" className="qc-avatar" referrerPolicy="no-referrer" /> : <span className="qc-avatar">{initials}</span>}
        <div style={{ minWidth: 0 }}>
          <h2>{user?.name || 'Poshak member'}</h2>
          <p>{user?.email}</p>
        </div>
      </div>

      <WalletCard user={user} demoBalance={walletBalance} onAddMoney={onAddMoney}>
        <ReferralAndPlans onWalletChanged={() => window.dispatchEvent(new Event('focus'))} />
      </WalletCard>

      <h3 className="qc-acc-h">Saved addresses</h3>
      <div className="qc-acc-group">
        {addresses.map((addr) => (
          <div key={addr.id} className="qc-acc-row static">
            <span className="qc-row-ic"><MapPin size={17} /></span>
            <span className="qc-acc-txt">
              <b>{addr.label}{addr.isDefault && <em className="qc-tag">Default</em>}</b>
              <span>{[addr.flatBuilding, addr.streetArea, addr.city].filter(Boolean).join(', ')}{addr.pincode ? ` - ${addr.pincode}` : ''}</span>
            </span>
            <span className="qc-acc-actions">
              {!addr.isDefault && <button type="button" onClick={() => onSetDefaultAddress(addr.id)}>Make default</button>}
              {addresses.length > 1 && <button type="button" className="muted" onClick={() => onDeleteAddress(addr.id)}>Delete</button>}
            </span>
          </div>
        ))}
        <Row icon={Plus} title="Add a new address" onClick={onOpenLocationPicker} />
      </div>

      {user?.isSupabase && (
        <>
          <h3 className="qc-acc-h">Help</h3>
          <div className="qc-acc-group">
            <Row icon={LifeBuoy} title="Help & complaints" sub="Missing or damaged item, a question about a bill" onClick={onOpenHelp} />
            <a className="qc-acc-row" href={telHref(supportPhone(support))}>
              <span className="qc-row-ic"><Phone size={17} /></span>
              <span className="qc-acc-txt"><b>Call us</b><span>{supportPhone(support)}</span></span>
              <ChevronRight size={18} className="qc-acc-chev" />
            </a>
          </div>
        </>
      )}

      <div className="qc-acc-prefs">
        <NotificationPrefs userId={user?.isSupabase ? user.id : null} defaultPhone={(addresses.find((a) => a.phone) || {}).phone} />
      </div>

      <h3 className="qc-acc-h">Privacy & legal</h3>
      <div className="qc-acc-group">
        <Row icon={Download} title="Download my data" sub="Your profile, orders and addresses as a file" onClick={handleExportData} />
        <Row icon={FileText} title="Privacy notice" onClick={() => setActiveLegalTab('dpdp')} />
        <Row icon={FileText} title="Terms of service" onClick={() => setActiveLegalTab('terms')} />
        <Row icon={ShieldCheck} title="Grievance officer" sub={support?.grievance_email || 'grievance@poshak.in'} onClick={() => setActiveLegalTab('grievance')} />
        <Row icon={Trash2} title="Delete my data" sub="Ask us to erase your account" onClick={handleErasureRequest} danger />
      </div>

      <div className="qc-acc-group" style={{ marginTop: 16 }}>
        <Row icon={Info} title="About Poshak" onClick={onBackToLanding} />
        <Row icon={LogOut} title="Sign out" onClick={logout} danger right={<span />} />
      </div>

      <LegalModal
        isOpen={Boolean(activeLegalTab)}
        initialTab={activeLegalTab || 'dpdp'}
        onClose={() => setActiveLegalTab(null)}
      />
    </div>
  );
};
