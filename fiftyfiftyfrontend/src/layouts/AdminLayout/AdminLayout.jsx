import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, LogOut, Dumbbell, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../../shared/components/ThemeToggle/ThemeToggle';

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/superadmin/login');
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Only the two main modules required by Super Admin scope
  const navLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/gyms', label: 'Gym Management', icon: Building2 }
  ];

  return (
    <div className="app-layout-wrapper">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={closeMobileMenu}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`app-sidebar ${isMobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <Dumbbell size={24} color="var(--brand-secondary)" />
          <span><span style={{ color: 'var(--brand-secondary)' }}>SUPER</span> ADMIN</span>
          {isMobileMenuOpen && (
            <button
              onClick={closeMobileMenu}
              style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeMobileMenu}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={handleLogout}
            className="nav-item w-full"
            style={{ color: 'var(--color-danger)' }}
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="app-main-viewport">
        <header className="app-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className="mobile-sidebar-toggle"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Open sidebar menu"
            >
              <Menu size={20} />
            </button>
            <span className="admin-badge">LeopardxGyms Super Admin</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ThemeToggle />
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.email || 'leopardxtechnology@gmail.com'}
            </div>
          </div>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
