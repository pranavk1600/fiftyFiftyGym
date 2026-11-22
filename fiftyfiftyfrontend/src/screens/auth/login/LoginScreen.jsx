import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Button } from '../../../shared/components/Button/Button';
import { Input } from '../../../shared/components/Input/Input';
import { Modal } from '../../../shared/components/Modal/Modal';
import { apiClient } from '../../../shared/services/apiClient';
import { CheckCircle2 } from 'lucide-react';
import '../../../styles/screens/auth/login.css';

export const LoginScreen = ({ defaultRole }) => {
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
      const response = await apiClient.post('/auth/login', {
        email: email.trim(),
        password
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
      const isSuperAdmin = defaultRole === 'SUPER_ADMIN' || (typeof window !== 'undefined' && window.location.pathname.includes('/superadmin'));
      const isMember = defaultRole === 'MEMBER' || (typeof window !== 'undefined' && window.location.pathname.includes('/member'));

      if (isSuperAdmin) {
        await apiClient.post('/auth/forgot-password', { email: forgotEmail.trim() });
      } else if (isMember) {
        await apiClient.post('/auth/member/forgot-password', { email: forgotEmail.trim() });
      } else {
        await apiClient.post('/auth/gym/forgot-password', { email: forgotEmail.trim() });
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

  return (
    <>
      <form onSubmit={handleLogin}>
        {/* Email Address Input */}
        <Input
          label="Email Address"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          required
        />

        {/* Password Input with Show/Hide Icon */}
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

        {/* Forgot Password Link */}
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

        {/* Sign In to Portal Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
          style={{ width: '100%', marginTop: 4, padding: '12px' }}
        >
          {isSubmitting ? 'Authenticating...' : 'Sign In to Portal'}
        </Button>

        {/* Security Footer Text */}
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
