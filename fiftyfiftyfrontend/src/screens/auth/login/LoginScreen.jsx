import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Button } from '../../../shared/components/Button/Button';
import { Input } from '../../../shared/components/Input/Input';
import { Modal } from '../../../shared/components/Modal/Modal';
import { apiClient } from '../../../shared/services/apiClient';
import { CheckCircle2, Shield, Dumbbell, User, Zap } from 'lucide-react';
import '../../../styles/screens/auth/login.css';

export const LoginScreen = ({ defaultRole }) => {
  const getInitialRole = () => {
    if (defaultRole) return defaultRole;
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.includes('/superadmin')) return 'SUPER_ADMIN';
      if (path.includes('/member')) return 'MEMBER';
    }
    return 'GYM_OWNER';
  };

  const [selectedRole, setSelectedRole] = useState(getInitialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSentSuccess, setResetSentSuccess] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const role = defaultRole || getInitialRole();
    setSelectedRole(role);
  }, [defaultRole]);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    if (role === 'SUPER_ADMIN') {
      if (window.location.pathname !== '/superadmin/login') {
        navigate('/superadmin/login');
      }
    } else if (role === 'MEMBER') {
      if (window.location.pathname !== '/member/login') {
        navigate('/member/login');
      }
    } else {
      if (window.location.pathname !== '/admin/login') {
        navigate('/admin/login');
      }
    }
  };

  const handleRoleCardClick = (targetRole) => {
    handleRoleSelect(targetRole);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !email.trim()) {
      showToast('Please enter your email address', 'warning');
      return;
    }
    if (!password) {
      showToast('Please enter your password', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const targetPortal = selectedRole === 'GYM_OWNER' ? 'GYM_ADMIN' : selectedRole;
      const response = await apiClient.post('/auth/login', {
        email: email.trim(),
        password,
        portal: targetPortal
      });
      const { user, token } = response.data || response;

      login(user, token);
      if (user?.gymSlug || user?.gym_slug) {
        try {
          localStorage.setItem('fiftyfifty_last_gym_slug', user.gymSlug || user.gym_slug);
        } catch (_e) {}
      }
      showToast(`Welcome back, ${user.fullName || 'User'}!`, 'success');

      // Strict role-based destination derived from authenticated database record
      const userRole = (user.role || '').toUpperCase();
      if (userRole === 'SUPER_ADMIN' || userRole === 'PLATFORM_ADMIN') {
        navigate('/admin/dashboard');
      } else if (userRole === 'GYM_OWNER') {
        navigate('/owner/dashboard');
      } else if (userRole === 'MEMBER') {
        navigate('/member/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Invalid email or password';
      showToast(errorMsg, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.trim()) {
      showToast('Please enter your email address', 'warning');
      return;
    }

    setIsSendingReset(true);
    try {
      if (selectedRole === 'GYM_OWNER') {
        await apiClient.post('/auth/gym/forgot-password', { email: forgotEmail.trim() });
      } else {
        await apiClient.post('/auth/forgot-password', { email: forgotEmail.trim() });
      }
      setResetSentSuccess(true);
    } catch (err) {
      console.error('Forgot password request failed:', err);
      // Generic success to protect user privacy
      setResetSentSuccess(true);
    } finally {
      setIsSendingReset(false);
    }
  };

  const closeForgotModal = () => {
    setIsForgotModalOpen(false);
    setResetSentSuccess(false);
  };

  const ROLE_CARDS = [
    {
      id: 'SUPER_ADMIN',
      label: 'Super Admin',
      sub: '/admin',
      color: '#16A34A',
      border: '#16A34A',
      bgActive: 'rgba(22, 163, 74, 0.08)',
      icon: Shield
    },
    {
      id: 'GYM_OWNER',
      label: 'Gym Owner',
      sub: '/owner',
      color: 'var(--brand-primary, #FF6B00)',
      border: 'var(--brand-primary, #FF6B00)',
      bgActive: 'rgba(255, 107, 0, 0.08)',
      icon: Dumbbell
    },
    {
      id: 'MEMBER',
      label: 'Member',
      sub: '/member',
      color: '#0284C7',
      border: '#0284C7',
      bgActive: 'rgba(2, 132, 199, 0.08)',
      icon: User
    }
  ];

  return (
    <>
      <form onSubmit={handleLogin}>
        {/* 1. Instant 1-Click Login Section (3 Role Cards) */}
        <div style={{
          background: 'var(--bg-surface-elevated, #F8FAFC)',
          border: '1px solid var(--border-subtle, #E2E8F0)',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '12px 14px',
          marginBottom: 20
        }}>
          <div style={{
            fontSize: '0.725rem',
            fontWeight: 700,
            color: 'var(--text-secondary, #64748B)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <Zap size={14} color="var(--brand-primary, #FF6B00)" />
            <span>Instant 1-Click Login:</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {ROLE_CARDS.map((card) => {
              const isSelected = selectedRole === card.id;
              const RoleIcon = card.icon;
              return (
                <button
                  key={card.id}
                  type="button"
                  id={`btn-1click-${card.id.toLowerCase().replace('_', '')}`}
                  data-role={card.id}
                  onClick={() => handleRoleCardClick(card.id)}
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 6px',
                    borderRadius: 8,
                    border: isSelected ? `2px solid ${card.border}` : '1px solid var(--border-subtle, #E2E8F0)',
                    background: isSelected ? card.bgActive : 'var(--bg-surface, #FFFFFF)',
                    color: 'var(--text-primary)',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    boxShadow: isSelected ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05))',
                    transition: 'all 0.18s ease'
                  }}
                  title={`Select ${card.label}`}
                >
                  <RoleIcon size={18} color={card.color} />
                  <span style={{
                    fontSize: '0.785rem',
                    fontWeight: isSelected ? 700 : 600,
                    color: isSelected ? card.color : 'var(--text-primary)'
                  }}>
                    {card.label}
                  </span>
                  <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary, #64748B)' }}>
                    {card.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Email Address Input */}
        <Input
          label="Email Address"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          required
        />

        {/* 3. Password Input with Show/Hide Icon */}
        <Input
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          showPasswordToggle
        />

        {/* 4. Forgot Password Link */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -6, marginBottom: 18 }}>
          <button
            type="button"
            className="forgot-password-link"
            onClick={() => {
              setForgotEmail(email || '');
              setIsForgotModalOpen(true);
            }}
          >
            Forgot Password?
          </button>
        </div>

        {/* 5. Sign In to Portal Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
          style={{ width: '100%', marginTop: 4, padding: '12px' }}
        >
          {isSubmitting ? 'Authenticating...' : 'Sign In to Portal'}
        </Button>

        {/* 6. Security Footer Text */}
        <div className="login-form-footer">
          <span>Protected by LeopardxGyms Enterprise RBAC</span>
        </div>
      </form>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={closeForgotModal}
        title="Reset Password"
      >
        {!resetSentSuccess ? (
          <form onSubmit={handleForgotPasswordSubmit} style={{ padding: '4px 0' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20, lineHeight: 1.5 }}>
              Enter your registered email address. We will send a secure single-use link to reset your password via <strong>Brevo</strong>.
            </p>

            <Input
              label="Registered Email Address"
              name="forgotEmail"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="name@company.com"
              required
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <Button type="button" variant="secondary" onClick={closeForgotModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSendingReset}>
                {isSendingReset ? 'Sending via Brevo...' : 'Send Reset Link'}
              </Button>
            </div>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--color-success-light, #DCFCE7)',
              color: 'var(--color-success, #16A34A)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Check Your Inbox
            </h3>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.55, marginBottom: 20 }}>
              If an account with <strong>{forgotEmail}</strong> exists, password reset instructions have been sent via Brevo. The link will expire in <strong>15 minutes</strong>.
            </p>

            <Button onClick={closeForgotModal} className="w-full">
              Back to Login
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
};

export default LoginScreen;
