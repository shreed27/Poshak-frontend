import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { isBackendConfigured } from '../../lib/supabase';
import './ops.css';

const HOME = { admin: '#/admin', captain: '#/captain', cleaner: '#/cleaner' };

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
export const OpsGate = ({ title, roles, children }) => {
  const { session, role, authReady, roleReady, logout } = useAuth();

  if (!isBackendConfigured) return <SetupHelp title={title} />;
  if (!authReady || (session && !roleReady)) return <Card>Loading…</Card>;

  if (!session) {
    return (
      <Card>
        <h2>{title}</h2>
        <p>Team sign-in. Use the Google account your admin added.</p>
        <GoogleButton hash={window.location.hash} />
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
            ? ' Ask an admin to add this email under Dashboard → Team.'
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
