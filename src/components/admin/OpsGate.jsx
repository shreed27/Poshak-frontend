import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { isBackendConfigured } from '../../lib/supabase';
import { Bike, Shirt, LayoutDashboard } from 'lucide-react';
import { SlowLoading, AuthErrorNote } from '../StuckHelp';
import './ops.css';

const HOME = { admin: '#/admin', captain: '#/rider', cleaner: '#/laundry' };

export const Card = ({ children }) => (
  <div className="ops-center"><div className="ops-card ops-narrow">{children}</div></div>
);

export const GoogleButton = ({ hash }) => {
  const { loginWithGoogleOAuth } = useAuth();
  return (
    <button className="ops-btn ops-btn-primary ops-wide" onClick={() => loginWithGoogleOAuth(hash)}>
      Continue with Google
    </button>
  );
};

export const SetupHelp = ({ title }) => (
  <Card>
    <h2>{title}</h2>
    <p>The backend is not connected yet. To enable it:</p>
    <ol>
      <li>Create a Supabase project and run <code>supabase/schema.sql</code> in its SQL Editor.</li>
      <li>Enable the Google provider under Authentication → Providers.</li>
      <li>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env</code> and restart the dev server.</li>
    </ol>
    <a className="ops-btn" href="#/">Back to app</a>
  </Card>
);

// Guards the staff screens: backend configured → signed in → right role.
const KIND = {
  admin: { Icon: LayoutDashboard, who: 'an admin', blurb: 'Sign in with the Google account of a Poshak admin to manage orders, partners, prices and money.' },
  rider: { Icon: Bike, who: 'a rider', blurb: 'Sign in with the Google account (Gmail) the Poshak admin added for you. You will see your jobs, earnings and profile.' },
  laundry: { Icon: Shirt, who: 'a laundry partner', blurb: 'Sign in with the Google account (Gmail) the Poshak admin added for your laundry. You will see incoming orders, your queue and earnings.' }
};

export const OpsGate = ({ title, roles, children, kind }) => {
  const K = KIND[kind] || KIND.admin;
  const { session, role, authReady, roleReady, logout, authError } = useAuth();

  if (!isBackendConfigured) return <SetupHelp title={title} />;
  if (!authReady || (session && !roleReady)) return <Card><SlowLoading /></Card>;

  if (!session) {
    return (
      <Card>
        <div className="og-ic"><K.Icon size={22} /></div>
        <h2>{title}</h2>
        <AuthErrorNote message={authError} />
        <p>{K.blurb}</p>
        <GoogleButton hash={window.location.hash} />
        <p className="ops-muted" style={{ marginTop: '.8rem', fontSize: '.78rem' }}>Can’t sign in? Ask your Poshak admin to add your Gmail as {K.who}.</p>
      </Card>
    );
  }

  if (!roles.includes(role)) {
    return (
      <Card>
        <h2>{role === 'customer' ? 'Not on the team list' : 'Wrong area'}</h2>
        <p>
          <b>{session.user.email}</b> is signed in as <b>{role === 'customer' ? 'a customer' : role}</b>.
          {role === 'customer'
            ? ` Ask the Poshak admin to add this Gmail as ${K.who}, or to reinstate it if your access was paused.`
            : ` This page needs: ${roles.join(' or ')}.`}
        </p>
        <div className="ops-row">
          {HOME[role] ? <a className="ops-btn ops-btn-primary" href={HOME[role]}>Go to my screen</a> : null}
          {role === 'customer' && <a className="ops-btn" href="#/">Customer app</a>}
          <button className="ops-btn" onClick={() => { logout(); window.location.hash = '#/staff'; }}>Sign out</button>
        </div>
      </Card>
    );
  }

  return children;
};
