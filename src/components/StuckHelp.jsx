import React, { useEffect, useState } from 'react';

// Wipes the stored sign-in (it can be stale or half-written) and reloads on the sign-in screen.
export const resetSignIn = () => {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith('sb-') || k === 'poshak_user').forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch { /* ignore */ }
  window.location.href = window.location.origin + '/#/staff';
  window.location.reload();
};

// "Loading…" that never traps you: after a few seconds it offers a way out.
export const SlowLoading = ({ after = 6000, style }) => {
  const [slow, setSlow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSlow(true), after); return () => clearTimeout(t); }, [after]);
  return (
    <div style={{ textAlign: 'center', ...style }}>
      <div>Loading…</div>
      {slow && (
        <div style={{ marginTop: '1rem', fontSize: '.85rem', color: '#6b7280' }}>
          Taking longer than usual.<br />
          <button onClick={() => window.location.reload()} style={{ margin: '.5rem .4rem 0', padding: '.45rem .9rem', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>Retry</button>
          <button onClick={resetSignIn} style={{ margin: '.5rem .4rem 0', padding: '.45rem .9rem', borderRadius: 10, border: '1.5px solid #fecaca', background: '#fff', color: '#dc2626', fontWeight: 700, cursor: 'pointer' }}>Reset sign-in</button>
        </div>
      )}
    </div>
  );
};

export const AuthErrorNote = ({ message }) => (message ? (
  <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 10, padding: '.6rem .8rem', fontSize: '.82rem', margin: '0 0 .8rem', lineHeight: 1.4 }}>
    <b>Sign-in problem:</b> {message}
  </div>
) : null);
