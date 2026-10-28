import React from 'react';
import { Outlet } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { ThemeToggle } from '../../shared/components/ThemeToggle/ThemeToggle';

export const AuthLayout = () => {
  return (
    <div className="auth-layout-container">
      <div className="auth-theme-toggle-wrapper">
        <ThemeToggle />
      </div>
      <div className="auth-card animate-fade-in">
        <div className="auth-header">
          <div className="auth-logo">
            <Dumbbell size={32} color="var(--brand-primary)" />
            <span>FIFTY</span>FIFTY
          </div>
          <p className="auth-subtitle">High-Performance Gym Management Platform</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
