import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('poshak_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState('customer');
  const [authReady, setAuthReady] = useState(!supabase);
  const [roleReady, setRoleReady] = useState(!supabase);

  // Mirror the Supabase session (Google sign-in) into the app's user object.
  useEffect(() => {
    if (!supabase) return undefined;
    const apply = (sess) => {
      setSession(sess);
      if (sess?.user) {
        const m = sess.user.user_metadata || {};
        setUser((prev) => ({
          ...(prev || {}),
          id: sess.user.id,
          name: m.full_name || m.name || prev?.name || 'Poshak Member',
          email: sess.user.email,
          picture: m.avatar_url || m.picture || prev?.picture,
          isGoogleAuth: true,
          isSupabase: true,
          joinedDate: prev?.joinedDate || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        }));
        // Server decides: matches this email against the staff list and returns admin / captain / customer.
        setRoleReady(false);
        supabase.rpc('claim_staff_role').then(({ data, error }) => {
          if (error) console.warn('Role check failed:', error.message);
          setRole(data || 'customer');
          setRoleReady(true);
        });
      } else {
        setRole('customer');
        setRoleReady(true);
        setUser((prev) => (prev?.isSupabase ? null : prev));
      }
      setAuthReady(true);
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => apply(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  // ID-token sign-in (Google One Tap / button). Returns true on success.
  const loginWithGoogleIdToken = async (idToken) => {
    if (!supabase) return false;
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error) console.warn('Supabase sign-in failed:', error.message);
    return !error;
  };

  // Redirect-based sign-in for the custom Google button (the popup flow yields no ID token).
  const loginWithGoogleOAuth = async (hash = '') => {
    if (!supabase) return false;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + hash }
    });
    if (error) console.warn('Supabase OAuth failed:', error.message);
    return !error;
  };

  useEffect(() => {
    if (user) {
      localStorage.setItem('poshak_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('poshak_user');
    }
  }, [user]);

  const loginWithGooglePayload = (profileData) => {
    setUser({
      name: profileData.name || 'Poshak Member',
      email: profileData.email || 'user@gmail.com',
      picture: profileData.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      isGoogleAuth: true,
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    });
    setIsAuthModalOpen(false);
  };

  const loginDemo = (customName = 'Shreed Shrivastava', customEmail = 'shreed@poshak.in') => {
    setUser({
      name: customName,
      email: customEmail,
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      isGoogleAuth: true,
      membershipTier: 'Poshak Gold Pass',
      walletBalance: 450,
      joinedDate: 'Joined Oct 2026'
    });
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    try { sessionStorage.removeItem('poshak_staff_redirected'); } catch { /* ignore */ }
    setUser(null);
    setRole('customer');
    supabase?.auth.signOut();
  };

  const openLoginModal = () => setIsAuthModalOpen(true);
  const closeLoginModal = () => setIsAuthModalOpen(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loginWithGooglePayload,
        loginDemo,
        logout,
        session,
        role,
        authReady,
        roleReady,
        loginWithGoogleIdToken,
        loginWithGoogleOAuth,
        isAuthModalOpen,
        openLoginModal,
        closeLoginModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
