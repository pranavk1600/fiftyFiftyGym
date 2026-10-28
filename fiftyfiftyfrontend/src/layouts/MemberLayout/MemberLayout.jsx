import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { User, CalendarCheck, Receipt, LogOut, Dumbbell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../../shared/components/ThemeToggle/ThemeToggle';

export const MemberLayout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const navLinks = [
    { to: '/member/dashboard', label: 'My Membership', icon: User },
    { to: '/member/attendance', label: 'Attendance', icon: CalendarCheck },
    { to: '/member/payments', label: 'Receipts & Payments', icon: Receipt },
    { to: '/member/profile', label: 'Profile', icon: User }
  ];

  return (
    <div className="member-layout-wrapper">
      <header className="member-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Dumbbell size={24} color="var(--brand-primary)" />
          <span style={{ fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            FIFTY<span style={{ color: 'var(--brand-primary)' }}>FIFTY</span> MEMBER
          </span>
        </div>

        <nav className="member-nav-links">
          {navLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ThemeToggle />
          <button onClick={handleLogout} className="btn btn-secondary btn-sm">
            <LogOut size={16} />
            <span>Exit</span>
          </button>
        </div>
      </header>

      <main className="member-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MemberLayout;
