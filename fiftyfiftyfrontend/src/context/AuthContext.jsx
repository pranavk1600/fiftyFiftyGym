import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const getInitialAuth = () => {
  if (typeof window === 'undefined') return { token: null, user: null };
  const path = window.location.pathname;
  let t = localStorage.getItem('fiftyfifty_token');
  let u = localStorage.getItem('fiftyfifty_user');

  if (path.startsWith('/admin') || path.startsWith('/superadmin')) {
    const st = localStorage.getItem('fiftyfifty_superadmin_token');
    const su = localStorage.getItem('fiftyfifty_superadmin_user');
    if (st) {
      t = st;
      u = su;
    }
  } else if (path.startsWith('/owner')) {
    const ot = localStorage.getItem('fiftyfifty_owner_token');
    const ou = localStorage.getItem('fiftyfifty_owner_user');
    if (ot) {
      t = ot;
      u = ou;
    }
  } else if (path.startsWith('/member')) {
    const mt = localStorage.getItem('fiftyfifty_member_token');
    const mu = localStorage.getItem('fiftyfifty_member_user');
    if (mt) {
      t = mt;
      u = mu;
    }
  }

  try {
    return { token: t, user: u ? JSON.parse(u) : null };
  } catch {
    return { token: t, user: null };
  }
};

export const AuthProvider = ({ children }) => {
  const initial = getInitialAuth();
  const [user, setUser] = useState(initial.user);
  const [token, setToken] = useState(initial.token);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    let savedUser = localStorage.getItem('fiftyfifty_user');

    if (path.startsWith('/admin') || path.startsWith('/superadmin')) {
      const su = localStorage.getItem('fiftyfifty_superadmin_user');
      const st = localStorage.getItem('fiftyfifty_superadmin_token');
      if (st) {
        setToken(st);
        savedUser = su || savedUser;
      }
    } else if (path.startsWith('/owner')) {
      const ou = localStorage.getItem('fiftyfifty_owner_user');
      const ot = localStorage.getItem('fiftyfifty_owner_token');
      if (ot) {
        setToken(ot);
        savedUser = ou || savedUser;
      }
    }

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('fiftyfifty_user');
        localStorage.removeItem('fiftyfifty_token');
      }
    }
    setIsLoading(false);
  }, [token]);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('fiftyfifty_token', authToken);
    localStorage.setItem('fiftyfifty_user', JSON.stringify(userData));

    const role = (userData?.role || '').toUpperCase();
    if (role === 'SUPER_ADMIN' || role === 'PLATFORM_ADMIN') {
      localStorage.setItem('fiftyfifty_superadmin_token', authToken);
      localStorage.setItem('fiftyfifty_superadmin_user', JSON.stringify(userData));
    } else if (role === 'GYM_OWNER') {
      localStorage.setItem('fiftyfifty_owner_token', authToken);
      localStorage.setItem('fiftyfifty_owner_user', JSON.stringify(userData));
    } else if (role === 'MEMBER') {
      localStorage.setItem('fiftyfifty_member_token', authToken);
      localStorage.setItem('fiftyfifty_member_user', JSON.stringify(userData));
    }
  };

  const logout = () => {
    const role = (user?.role || '').toUpperCase();
    if (role === 'SUPER_ADMIN' || role === 'PLATFORM_ADMIN') {
      localStorage.removeItem('fiftyfifty_superadmin_token');
      localStorage.removeItem('fiftyfifty_superadmin_user');
    } else if (role === 'GYM_OWNER') {
      localStorage.removeItem('fiftyfifty_owner_token');
      localStorage.removeItem('fiftyfifty_owner_user');
    } else if (role === 'MEMBER') {
      localStorage.removeItem('fiftyfifty_member_token');
      localStorage.removeItem('fiftyfifty_member_user');
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('fiftyfifty_token');
    localStorage.removeItem('fiftyfifty_user');
  };

  const value = {
    user,
    role: user?.role || null,
    token,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
