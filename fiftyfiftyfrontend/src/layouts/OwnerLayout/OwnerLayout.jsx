import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  CalendarCheck,
  Receipt,
  Bell,
  LogOut,
  Dumbbell,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../../shared/components/ThemeToggle/ThemeToggle';

export const OwnerLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Preserve authenticated owner's gym slug for browser refresh and logout flows
  useEffect(() => {
    const slug = user?.gymSlug || user?.gym_slug || user?.gym?.slug;
    if (slug) {
      try {
        localStorage.setItem('fiftyfifty_last_gym_slug', slug);
      } catch (_e) {}
    }
  }, [user]);

  const handleLogout = () => {
    // Retrieve authenticated gym slug before clearing session
    const gymSlug =
      user?.gymSlug ||
      user?.gym_slug ||
      user?.gym?.slug ||
      localStorage.getItem('fiftyfifty_last_gym_slug') ||
      (user?.gymName ? user.gymName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : null);

    // Clear authentication token and user session securely
    logout();

    // Redirect to gym-specific login URL using authenticated owner's gym slug
    if (gymSlug) {
      navigate(`/gym/${gymSlug}/login`, { replace: true });
    } else {
      navigate('/admin/login', { replace: true });
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    { to: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/owner/members', label: 'Members', icon: Users },
    { to: '/owner/plans', label: 'Membership Plans', icon: CreditCard },
    { to: '/owner/attendance', label: 'Attendance', icon: CalendarCheck },
    { to: '/owner/payments', label: 'Payments', icon: Receipt },
    { to: '/owner/notifications', label: 'Notifications', icon: Bell }
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
          <Dumbbell size={24} color="var(--brand-primary)" />
          <span><span className="brand-highlight">FIFTY</span>FIFTY</span>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {user?.gymLogoUrl || user?.logo_url || user?.gym?.logo_url ? (
                <img
                  src={user.gymLogoUrl || user.logo_url || user.gym?.logo_url}
                  alt={user?.gymName || 'Gym Logo'}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    objectFit: 'cover',
                    border: '1px solid var(--border-subtle)',
                    background: '#FFFFFF'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: 'var(--brand-primary-light, #FFF7ED)',
                  color: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 107, 0, 0.2)'
                }}>
                  <Dumbbell size={16} />
                </div>
              )}
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                {user?.gymName || user?.gym?.name || 'FiftyFifty Downtown Fitness'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ThemeToggle />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {user?.fullName || 'Gym Owner'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Gym Manager</div>
              </div>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-full)',
                background: 'var(--brand-primary-soft)',
                color: 'var(--brand-primary)',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--brand-primary-soft-border)',
                userSelect: 'none'
              }}>
                {(user?.fullName || 'G').charAt(0)}
              </div>
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

export default OwnerLayout;
