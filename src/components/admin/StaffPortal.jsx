import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isBackendConfigured } from '../../lib/supabase';
import { Card, GoogleButton, SetupHelp } from './OpsGate';

// /#/staff — the one link you give the team. Signs in, then sends each person to their own screen.
export const StaffPortal = () => {
  const { session, role, authReady, roleReady, logout } = useAuth();

  useEffect(() => {
    if (!session || !roleReady) return;
    const home = { admin: '#/admin', captain: '#/captain', cleaner: '#/cleaner' }[role];
    if (home) window.location.hash = home;
  }, [session, role, roleReady]);

  if (!isBackendConfigured) return <SetupHelp title="Poshak Team" />;
  if (!authReady || (session && !roleReady)) return <Card>Loading…</Card>;

  if (!session) {
    return (
      <Card>
        <h2>Poshak Team</h2>
        <p>Delivery partners and the Poshak team sign in here with Google. You will be taken to the right screen automatically.</p>
        <GoogleButton hash="#/staff" />
        <p className="ops-muted" style={{ marginTop: '0.75rem' }}>Customer? <a href="#/">Open the Poshak app</a></p>
      </Card>
    );
  }

  if (role === 'customer') {
    return (
      <Card>
        <h2>Not on the team list</h2>
        <p><b>{session.user.email}</b> hasn't been added as staff yet. Ask an admin to add this email under Dashboard → Team, then sign in again.</p>
        <div className="ops-row">
          <a className="ops-btn" href="#/">Customer app</a>
          <button className="ops-btn" onClick={logout}>Use another account</button>
        </div>
      </Card>
    );
  }
  return <Card>Redirecting…</Card>;
};
