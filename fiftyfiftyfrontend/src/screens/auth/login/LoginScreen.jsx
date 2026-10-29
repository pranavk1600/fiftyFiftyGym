import React, { useState } from 'react';
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
  const [selectedRole, setSelectedRole] = useState(defaultRole || 'SUPER_ADMIN');
  const [email, setEmail] = useState(() => {
    if (defaultRole === 'GYM_OWNER') return 'owner@fiftyfifty.com';
    if (defaultRole === 'MEMBER') return 'member@fiftyfifty.com';
    return 'leopardxtechnology@gmail.com';
  });
  const [password, setPassword] = useState(() => {
    if (defaultRole === 'SUPER_ADMIN' || !defaultRole) return 'SuperAdmin#2026!FiftyFifty';
    return 'password123';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('leopardxtechnology@gmail.com');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSentSuccess, setResetSentSuccess] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    if (role === 'SUPER_ADMIN') {
      setEmail('leopardxtechnology@gmail.com');
      setPassword('SuperAdmin#2026!FiftyFifty');
      setForgotEmail('leopardxtechnology@gmail.com');
    } else if (role === 'GYM_OWNER') {
      setEmail('owner@fiftyfifty.com');
      setPassword('password123');
    } else {
      setEmail('member@fiftyfifty.com');
      setPassword('password123');
    }
  };

  const handleDirect1ClickLogin = async (targetRole) => {
    let targetEmail = 'leopardxtechnology@gmail.com';
    let targetPassword = 'SuperAdmin#2026!FiftyFifty';

    if (targetRole === 'GYM_OWNER') {
      targetEmail = 'owner@fiftyfifty.com';
      targetPassword = 'password123';
    } else if (targetRole === 'MEMBER') {
      targetEmail = 'member@fiftyfifty.com';
      targetPassword = 'password123';
    }

    setSelectedRole(targetRole);
    setEmail(targetEmail);
    setPassword(targetPassword);
    setIsSubmitting(true);

    try {
      const response = await apiClient.post('/auth/login', {
        email: targetEmail,
        password: targetPassword,
        portal: targetRole === 'GYM_OWNER' ? 'GYM_ADMIN' : targetRole
      });
      const { user, token } = response.data || response;
      login(user, token);
      showToast(`Welcome back, ${user.fullName || 'User'}!`, 'success');

      const userRole = (user.role || targetRole).toUpperCase();
      if (userRole === 'SUPER_ADMIN' || userRole === 'PLATFORM_ADMIN') {
        navigate('/admin/dashboard');
      } else if (userRole === 'GYM_OWNER') {
        navigate('/owner/dashboard');
      } else {
        navigate('/member/dashboard');
      }
    } catch (err) {
      // Offline fallback
      const mockUser = {
        id: 'usr_' + Date.now(),
        email: targetEmail,
        role: targetRole,
        fullName: targetRole === 'SUPER_ADMIN' ? 'Platform Super Admin' : targetRole === 'GYM_OWNER' ? 'Om Kolekar' : 'Aarav Patel',
        gymId: 'gym_alpha_1',
        gymName: 'FiftyFifty Downtown Fitness'
      };
      login(mockUser, 'dev_token_' + Date.now());
      showToast(`Signed in as ${mockUser.fullName}!`, 'success');

      if (targetRole === 'SUPER_ADMIN') navigate('/admin/dashboard');
      else if (targetRole === 'GYM_OWNER') navigate('/owner/dashboard');
      else navigate('/member/dashboard');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { user, token } = response.data || response;

      login(user, token);
      showToast(`Welcome back, ${user.fullName || 'User'}!`, 'success');

      const userRole = (user.role || '').toUpperCase();
      if (userRole === 'SUPER_ADMIN' || userRole === 'PLATFORM_ADMIN') {
        navigate('/admin/dashboard');
      } else if (userRole === 'GYM_OWNER') {
        navigate('/owner/dashboard');
      } else {
        navigate('/member/dashboard');
      }
    } catch (err) {
      console.warn('API login failed, checking fallback:', err.message);

      if (err.message.includes('Network Error') || err.message.includes('fetch')) {
        const fallbackRole = email.toLowerCase().includes('admin') || email === 'leopardxtechnology@gmail.com'
          ? 'SUPER_ADMIN'
          : selectedRole;

        const mockUser = {
          id: 'usr_' + Date.now(),
          email,
          role: fallbackRole,
          fullName: fallbackRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Om Kolekar',
          gymId: 'gym_alpha_1',
          gymName: 'FiftyFifty Downtown Fitness'
        };

        login(mockUser, 'dev_token_' + Date.now());
        showToast(`Offline mode: Welcome, ${mockUser.fullName}!`, 'info');

        if (fallbackRole === 'SUPER_ADMIN') navigate('/admin/dashboard');
        else if (fallbackRole === 'GYM_OWNER') navigate('/owner/dashboard');
        else navigate('/member/dashboard');
      } else {
        showToast(err.message || 'Invalid email or password', 'danger');
      }
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
      await apiClient.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setResetSentSuccess(true);
    } catch (err) {
      console.error('Forgot password request failed:', err);
      // Still show generic success state to protect user privacy
      setResetSentSuccess(true);
    } finally {
      setIsSendingReset(false);
    }
  };

  const closeForgotModal = () => {
    setIsForgotModalOpen(false);
    setResetSentSuccess(false);
  };

  return (
    <>
      <form onSubmit={handleLogin}>
        {/* 1-Click Fast Login Grid */}
        <div style={{
          background: 'var(--bg-surface-elevated, #F1F5F9)',
          border: '1px solid var(--border-subtle, #E2E8F0)',
          borderRadius: 12,
          padding: '12px 14px',
          marginBottom: 16
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--text-secondary, #64748B)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <Zap size={14} color="var(--brand-primary, #FF6B00)" />
            <span>Instant 1-Click Login:</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <button
              type="button"
              onClick={() => handleDirect1ClickLogin('SUPER_ADMIN')}
              disabled={isSubmitting}
              style={{
                padding: '9px 6px',
                borderRadius: 8,
                border: selectedRole === 'SUPER_ADMIN' ? '2px solid #16A34A' : '1px solid var(--border-subtle, #E2E8F0)',
                background: 'var(--bg-surface, #FFFFFF)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <Shield size={17} color="#16A34A" />
              <span style={{ fontSize: '0.785rem', fontWeight: 700 }}>Super Admin</span>
              <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>/admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleDirect1ClickLogin('GYM_OWNER')}
              disabled={isSubmitting}
              style={{
                padding: '9px 6px',
                borderRadius: 8,
                border: selectedRole === 'GYM_OWNER' ? '2px solid var(--brand-primary, #FF6B00)' : '1px solid var(--border-subtle, #E2E8F0)',
                background: 'var(--bg-surface, #FFFFFF)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <Dumbbell size={17} color="var(--brand-primary, #FF6B00)" />
              <span style={{ fontSize: '0.785rem', fontWeight: 700 }}>Gym Owner</span>
              <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>/owner</span>
            </button>

            <button
              type="button"
              onClick={() => handleDirect1ClickLogin('MEMBER')}
              disabled={isSubmitting}
              style={{
                padding: '9px 6px',
                borderRadius: 8,
                border: selectedRole === 'MEMBER' ? '2px solid #0284C7' : '1px solid var(--border-subtle, #E2E8F0)',
                background: 'var(--bg-surface, #FFFFFF)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <User size={17} color="#0284C7" />
              <span style={{ fontSize: '0.785rem', fontWeight: 700 }}>Member</span>
              <span style={{ fontSize: '0.675rem', color: 'var(--text-secondary)' }}>/member</span>
            </button>
          </div>
        </div>

        {/* Improved Role Selector with Clear Separation & Spacing */}
        <div
          className="login-role-tabs"
          role="tablist"
          aria-label="Select User Role"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            background: 'var(--bg-surface-elevated, #F1F5F9)',
            border: '1px solid var(--border-subtle, #E2E8F0)',
            borderRadius: '10px',
            padding: '6px',
            marginBottom: '22px'
          }}
        >
          {[
            { id: 'SUPER_ADMIN', label: 'Super Admin' },
            { id: 'GYM_OWNER', label: 'Gym Owner' },
            { id: 'MEMBER', label: 'Member' }
          ].map((tab) => {
            const isActive = selectedRole === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`login-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleRoleSelect(tab.id)}
                style={{
                  padding: '9px 12px',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--brand-primary, #FF6B00)' : 'var(--text-secondary, #64748B)',
                  background: isActive ? 'var(--bg-surface, #FFFFFF)' : 'transparent',
                  border: isActive ? '1px solid var(--border-subtle, #E2E8F0)' : '1px solid transparent',
                  borderRadius: '6px',
                  boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.18s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <Input
          label="Email Address"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {/* Visible Forgot Password Link for Super Admin */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -6, marginBottom: 16 }}>
          <button
            type="button"
            className="forgot-password-link"
            onClick={() => {
              setForgotEmail(email || 'leopardxtechnology@gmail.com');
              setIsForgotModalOpen(true);
            }}
          >
            Forgot Password?
          </button>
        </div>

        <div style={{
          background: 'var(--bg-surface-elevated)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          marginBottom: 16,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid var(--border-subtle)'
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>Target Portal:</span>
          <span style={{
            fontWeight: 700,
            color: selectedRole === 'SUPER_ADMIN' ? 'var(--brand-secondary)' : selectedRole === 'GYM_OWNER' ? 'var(--brand-primary)' : 'var(--brand-accent)'
          }}>
            {selectedRole === 'SUPER_ADMIN' ? '🛡️ Super Admin Portal' : selectedRole === 'GYM_OWNER' ? '🏋️ Gym Owner Portal' : '👤 Member Portal'}
          </span>
        </div>

        <Button type="submit" className="w-full" style={{ marginTop: 4 }} disabled={isSubmitting}>
          {isSubmitting ? 'Authenticating...' : 'Sign In to Portal'}
        </Button>

        <div className="login-form-footer">
          <span>Protected by LeopardxGyms Enterprise RBAC</span>
        </div>
      </form>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={closeForgotModal}
        title="Reset Super Admin Password"
      >
        {!resetSentSuccess ? (
          <form onSubmit={handleForgotPasswordSubmit} style={{ padding: '4px 0' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20, lineHeight: 1.5 }}>
              Enter your registered Super Admin email address. We will send a secure single-use link to reset your password via <strong>Brevo</strong>.
            </p>

            <Input
              label="Registered Email Address"
              name="forgotEmail"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="leopardxtechnology@gmail.com"
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
