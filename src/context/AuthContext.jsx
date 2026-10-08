import React, { createContext, useContext, useState, useEffect } from 'react';

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
    setUser(null);
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
