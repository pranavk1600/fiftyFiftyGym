import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const RoleRoute = ({ allowedRoles = [] }) => {
  const { role, isLoading } = useAuth();

  if (isLoading) return null;

  const isSuperAdmin = role === 'PLATFORM_ADMIN' || role === 'SUPER_ADMIN' || role === 'super_admin';
  const hasAccess = allowedRoles.includes(role) || (isSuperAdmin && (allowedRoles.includes('PLATFORM_ADMIN') || allowedRoles.includes('SUPER_ADMIN')));

  if (!hasAccess) {
    if (isSuperAdmin) return <Navigate to="/admin/dashboard" replace />;
    if (role === 'GYM_OWNER') return <Navigate to="/owner/dashboard" replace />;
    if (role === 'MEMBER') return <Navigate to="/member/dashboard" replace />;
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
