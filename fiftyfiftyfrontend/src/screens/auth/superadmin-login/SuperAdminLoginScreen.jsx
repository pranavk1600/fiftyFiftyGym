import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Button } from '../../../shared/components/Button/Button';
import { Input } from '../../../shared/components/Input/Input';
import { Modal } from '../../../shared/components/Modal/Modal';
import { apiClient } from '../../../shared/services/apiClient';
import { Shield, CheckCircle2, ArrowRight } from 'lucide-react';
import '../../../styles/screens/auth/login.css';

export const SuperAdminLoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSentSuccess, setResetSentSuccess] = useState(false);

  const { login, isAuthenticated, role } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // If already authenticated as Super Admin, forward straight to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const normalizedRole = (role || '').toUpperCase();
      if (normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'PLATFORM_ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, role, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Authenticate via dedicated Super Admin endpoint with portal constraint
      const response = await apiClient.post('/auth/superadmin/login', {
        email: email.trim(),
        password,
        portal: 'SUPER_ADMIN'
      });
      const { user, token } = response.data || response;

      const userRole = (user.role || '').toUpperCase();
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'PLATFORM_ADMIN') {
        showToast('Access denied: Only Super Admin accounts can sign in here.', 'danger');
        return;
      }

      login(user, token);
      showToast(`Welcome back, ${user.fullName || 'Super Admin'}!`, 'success');
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Invalid credentials or access denied';
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
      await apiClient.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setResetSentSuccess(true);
    } catch (err) {
      console.error('Forgot password request failed:', err);
      // Show generic success to protect user privacy
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
        {/* Super Admin Badge Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: 'rgba(2, 132, 199, 0.08)',
          border: '1px solid rgba(2, 132, 199, 0.25)',
          borderRadius: 8,
          padding: '8px 12px',
          marginBottom: 20,
          color: 'var(--brand-secondary, #0284C7)',
          fontSize: '0.825rem',
          fontWeight: 700,
          letterSpacing: '0.02em',
          textTransform: 'uppercase'
        }}>
          <Shield size={16} />
          <span>Super Admin Console</span>
        </div>

        <Input
          label="Super Admin Email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@fiftyfifty.com"
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

        {/* Forgot Password Link for Super Admin */}
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

        <div style={{
          background: 'var(--bg-surface-elevated, #F1F5F9)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md, 10px)',
          marginBottom: 18,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid var(--border-subtle, #E2E8F0)'
        }}>
          <span style={{ color: 'var(--text-secondary, #64748B)' }}>Target Destination:</span>
          <span style={{ fontWeight: 700, color: 'var(--brand-secondary, #0284C7)' }}>
            🛡️ Platform Dashboard (/admin/dashboard)
          </span>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Authenticating...' : 'Sign In to Super Admin'}
        </Button>

        {/* Link to Gym Admin login */}
        <div style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid var(--border-subtle, #E2E8F0)',
          textAlign: 'center',
          fontSize: '0.85rem'
        }}>
          <span style={{ color: 'var(--text-secondary, #64748B)' }}>Gym Owner or Staff? </span>
          <Link
            to="/admin/login"
            style={{
              color: 'var(--brand-primary, #FF6B00)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span>Go to Gym Admin Login</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="login-form-footer">
          <span>Protected by FiftyFifty Platform Governance & RBAC</span>
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
              Enter your registered Super Admin email address. We will dispatch a secure single-use link to reset your password via <strong>Brevo</strong>.
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
              If an account with <strong>{forgotEmail}</strong> exists, password reset instructions have been dispatched via Brevo. The link will expire in <strong>15 minutes</strong>.
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

export default SuperAdminLoginScreen;
