import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading application...</div>;
  }

  if (!isAuthenticated) {
    // If attempting to access Super Admin protected paths, direct to Super Admin login
    if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/superadmin')) {
      return <Navigate to="/superadmin/login" replace />;
    }
    // If attempting to access Gym Owner protected paths, direct to Gym Admin login
    if (location.pathname.startsWith('/owner')) {
      return <Navigate to="/admin/login" replace />;
    }
    // Default safe redirect to Gym Admin login
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
