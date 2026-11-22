import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import { Input } from '../Input/Input';
import { apiClient } from '../../services/apiClient';

export const CommonLoginModal = ({ isOpen, onClose, initialRole = 'GYM_OWNER' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password view state
  const [isForgotView, setIsForgotView] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSentSuccess, setResetSentSuccess] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleClose = () => {
    setIsForgotView(false);
    setResetSentSuccess(false);
    setIsSubmitting(false);
    if (onClose) onClose();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !email.trim()) {
      showToast('Please enter your email address or mobile number', 'warning');
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
      const data = response?.data || response;
      const { user, token } = data;

      login(user, token);
      if (user?.gymSlug || user?.gym_slug) {
        try {
          localStorage.setItem('fiftyfifty_last_gym_slug', user.gymSlug || user.gym_slug);
        } catch (_e) {}
      }
      showToast(`Welcome back, ${user.fullName || 'User'}!`, 'success');
      handleClose();

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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.trim()) {
      showToast('Please enter your email address', 'warning');
      return;
    }

    setIsSendingReset(true);
    try {
      const emailVal = forgotEmail.trim();
      const isSuperAdmin = initialRole === 'SUPER_ADMIN' || (typeof window !== 'undefined' && window.location.pathname.includes('/superadmin'));
      const isMember = initialRole === 'MEMBER' || (typeof window !== 'undefined' && window.location.pathname.includes('/member'));

      if (isSuperAdmin) {
        await apiClient.post('/auth/forgot-password', { email: emailVal });
      } else if (isMember) {
        await apiClient.post('/auth/member/forgot-password', { email: emailVal });
      } else {
        await apiClient.post('/auth/gym/forgot-password', { email: emailVal });
      }
      setResetSentSuccess(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      setResetSentSuccess(true);
    } finally {
      setIsSendingReset(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      maxWidth="460px"
    >
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 52,
          height: 52,
          borderRadius: 16,
          background: 'linear-gradient(135deg, var(--brand-primary, #FF6B00), #FF8533)',
          color: '#FFFFFF',
          marginBottom: 10,
          boxShadow: '0 6px 18px rgba(255, 107, 0, 0.35)'
        }}>
          <Dumbbell size={28} />
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display, Outfit, sans-serif)',
          fontSize: '1.4rem',
          fontWeight: 800,
          margin: '0 0 4px',
          color: 'var(--text-primary)'
        }}>
          LeopardxGyms
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          {isForgotView ? 'Reset Your Account Password' : 'Sign in to access your dashboard'}
        </p>
      </div>

      {!isForgotView ? (
        <form onSubmit={handleLogin}>
          <Input
            label="Email Address or Mobile Number"
            name="modal-email"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com or 9876543210"
            required
          />

          <Input
            label="Password"
            name="modal-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            showPasswordToggle
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -6, marginBottom: 18 }}>
            <button
              type="button"
              className="forgot-password-link"
              onClick={() => {
                setForgotEmail(email || '');
                setIsForgotView(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--brand-primary, #FF6B00)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 0'
              }}
            >
              Forgot Password?
            </button>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            style={{ width: '100%', marginTop: 4, padding: '12px' }}
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In to Portal'}
          </Button>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Protected by LeopardxGyms Enterprise RBAC</span>
          </div>
        </form>
      ) : !resetSentSuccess ? (
        <form onSubmit={handleForgotPassword}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 18, lineHeight: 1.5 }}>
            Enter your registered email address. We will send a secure single-use link to reset your password via <strong>Brevo</strong>.
          </p>

          <Input
            label="Registered Email Address"
            name="modal-forgot-email"
            type="email"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            placeholder="name@company.com"
            required
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsForgotView(false)}
            >
              Back to Login
            </Button>
            <Button
              type="submit"
              disabled={isSendingReset}
            >
              {isSendingReset ? 'Sending via Brevo...' : 'Send Reset Link'}
            </Button>
          </div>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '16px 8px' }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'var(--color-success-light, #DCFCE7)',
            color: 'var(--color-success, #16A34A)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <CheckCircle2 size={30} />
          </div>

          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Check Your Inbox
          </h3>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: 20 }}>
            If an account with <strong>{forgotEmail}</strong> exists, password reset instructions have been sent via Brevo.
          </p>

          <Button onClick={() => { setIsForgotView(false); setResetSentSuccess(false); }} className="w-full">
            Back to Login
          </Button>
        </div>
      )}
    </Modal>
  );
};

export default CommonLoginModal;
