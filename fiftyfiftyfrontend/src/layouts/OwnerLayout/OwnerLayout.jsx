import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  LogOut,
  Dumbbell,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../../shared/components/ThemeToggle/ThemeToggle';
import { apiClient } from '../../shared/services/apiClient';
import { OwnerProfileModal } from './components/OwnerProfileModal';

export const OwnerLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Dynamic Gym Branding State initialized from authenticated user context
  const [gymProfile, setGymProfile] = useState({
    name: user?.gymName || user?.gym?.name || '',
    logoUrl: user?.gymLogoUrl || user?.logo_url || user?.gym?.logo_url || null,
    slug: user?.gymSlug || user?.gym_slug || user?.gym?.slug || ''
  });

  // Preserve authenticated owner's gym slug for browser refresh and logout flows
  useEffect(() => {
    const slug = user?.gymSlug || user?.gym_slug || user?.gym?.slug;
    if (slug) {
      try {
        localStorage.setItem('fiftyfifty_last_gym_slug', slug);
      } catch (_e) {}
    }
  }, [user]);

  // Fetch dynamic gym profile directly from database to ensure fresh branding on login & refresh
  useEffect(() => {
    let isMounted = true;

    const fetchGymBranding = async () => {
      const identifier =
        user?.gymSlug ||
        user?.gym_slug ||
        user?.gymId ||
        user?.gym_id ||
        localStorage.getItem('fiftyfifty_last_gym_slug');

      if (!identifier) return;

      try {
        const response = await apiClient.get(`/gyms/${identifier}`);
        const data = response.data?.data || response.data || response;
        const gym = data.gym || data;
        if (gym && isMounted) {
          setGymProfile({
            name: gym.name || user?.gymName || '',
            logoUrl: gym.logo_url !== undefined ? gym.logo_url : user?.gymLogoUrl || null,
            slug: gym.slug || user?.gymSlug || ''
          });
          setLogoError(false);
        }
      } catch (_err) {
        // Fallback gracefully to user session context
      }
    };

    fetchGymBranding();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Prevent background scrolling when mobile menu drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') setIsMobileMenuOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    const gymSlug =
      gymProfile.slug ||
      user?.gymSlug ||
      user?.gym_slug ||
      user?.gym?.slug ||
      localStorage.getItem('fiftyfifty_last_gym_slug');

    logout();

    if (gymSlug) {
      navigate(`/gym/${gymSlug}/login`, { replace: true });
    } else {
      navigate('/admin/login', { replace: true });
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Format gym display name: e.g. "omkolekarsgym" -> "OM KOLEKAR GYM", "5050-fitness-club" -> "5050 FITNESS CLUB"
  const getFormattedGymName = () => {
    let raw = (gymProfile.name || user?.gymName || gymProfile.slug || 'GYM PORTAL').trim();
    raw = raw.replace(/[-_]+/g, ' ');

    // If owner name has multiple words (e.g. "om kolekar"), and gym name contains packed owner name (e.g. "omkolekar")
    const ownerName = (user?.fullName || gymProfile.owner_name || '').trim();
    if (ownerName && ownerName.includes(' ')) {
      const ownerPacked = ownerName.replace(/\s+/g, '').toLowerCase();
      const regex = new RegExp(ownerPacked, 'i');
      if (regex.test(raw)) {
        raw = raw.replace(regex, ownerName);
      }
    }

    // Handle single word ending in 'sgym or sgym or gym (e.g. "om kolekar'sgym" -> "om kolekar gym", "fitnessgym" -> "fitness gym")
    if (!raw.includes(' ') && /gym$/i.test(raw)) {
      if (/s{2,}gym$/i.test(raw)) {
        raw = raw.replace(/gym$/i, ' gym');
      } else {
        raw = raw.replace(/(?:'s|s)?gym$/i, ' gym');
      }
    } else if (/gym$/i.test(raw)) {
      raw = raw.replace(/(?:'s|s)?\s*gym$/i, ' gym');
    }

    return raw.toUpperCase();
  };

  // Top navigation items — Notifications and Attendance removed per prompt requirements
  const navLinks = [
    { to: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/owner/members', label: 'Members', icon: Users },
    { to: '/owner/plans', label: 'Membership Plans', icon: CreditCard },
    { to: '/owner/payments', label: 'Payments', icon: Receipt }
  ];

  return (
    <div className="owner-layout-wrapper">
      {/* Top Header Navigation Bar */}
      <header className="owner-topbar">
        {/* Left Section: Dynamic Gym Identity (Logo + Name) */}
        <div className="owner-topbar-left">
          <NavLink to="/owner/dashboard" className="owner-gym-brand-link" title={gymProfile.name || 'Gym Dashboard'}>
            {gymProfile.logoUrl && !logoError ? (
              <img
                src={gymProfile.logoUrl}
                alt={gymProfile.name || 'Gym Logo'}
                className="owner-gym-logo"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="owner-gym-icon-badge">
                <Dumbbell size={20} />
              </div>
            )}
            <span className="owner-gym-title">
              {getFormattedGymName()}
            </span>
          </NavLink>
        </div>

        {/* Center Section: Desktop Navigation Links */}
        <nav className="owner-desktop-nav">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `owner-nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Right Section: Desktop Controls & Profile */}
        <div className="owner-desktop-actions">
          <ThemeToggle />

          <div
            className="owner-profile-widget"
            title="View Profile & Settings"
            onClick={() => setIsProfileModalOpen(true)}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer' }}
          >
            <div className="owner-profile-avatar">
              {(user?.fullName || 'G').charAt(0)}
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="owner-logout-btn"
            title="Sign Out of Gym Owner Portal"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Mobile Header Actions (Visible <= 1024px) */}
        <div className="owner-mobile-header-actions">
          <ThemeToggle />
          <button
            type="button"
            className="owner-hamburger-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close navigation' : 'Open navigation'}
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer & Backdrop */}
      {isMobileMenuOpen && (
        <>
          <div
            className="owner-drawer-backdrop"
            onClick={closeMobileMenu}
            aria-label="Close navigation overlay"
          />
          <aside className="owner-mobile-drawer" role="dialog" aria-modal="true">
            {/* Drawer Header with Gym Branding & Close */}
            <div className="owner-drawer-header">
              <div className="owner-drawer-brand">
                {gymProfile.logoUrl && !logoError ? (
                  <img
                    src={gymProfile.logoUrl}
                    alt={gymProfile.name || 'Gym Logo'}
                    className="owner-gym-logo-sm"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="owner-gym-icon-badge-sm">
                    <Dumbbell size={18} />
                  </div>
                )}
                <span className="owner-drawer-title">{getFormattedGymName()}</span>
              </div>
              <button
                type="button"
                className="owner-drawer-close-btn"
                onClick={closeMobileMenu}
                aria-label="Close drawer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Owner Profile Card in Drawer */}
            <div
              className="owner-drawer-user-card"
              onClick={() => {
                closeMobileMenu();
                setIsProfileModalOpen(true);
              }}
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer' }}
              title="View Profile & Settings"
            >
              <div className="owner-drawer-avatar">
                {(user?.fullName || 'G').charAt(0)}
              </div>
              <div className="owner-drawer-user-info">
                <span className="owner-drawer-user-name">{user?.fullName || 'Gym Owner'}</span>
              </div>
            </div>

            {/* Navigation Links in Drawer */}
            <nav className="owner-drawer-nav">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={closeMobileMenu}
                    className={({ isActive }) => `owner-drawer-link ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={19} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Drawer Footer with Theme Toggle & Logout */}
            <div className="owner-drawer-footer">
              <div className="owner-drawer-theme-row">
                <span className="owner-drawer-theme-label">Appearance</span>
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="owner-drawer-logout-btn"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Main Content Viewport */}
      <main className="owner-main-content">
        <Outlet />
      </main>

      {/* Gym Owner Profile & Change Password Modal */}
      <OwnerProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
      />
    </div>
  );
};

export default OwnerLayout;
