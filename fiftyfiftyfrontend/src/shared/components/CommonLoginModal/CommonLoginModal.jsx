import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, CheckCircle2, KeyRound, Lock, ArrowLeft, RefreshCw, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import { Input } from '../Input/Input';
import { apiClient } from '../../services/apiClient';

export const CommonLoginModal = ({
  isOpen,
  onClose,
  initialRole = 'GYM_OWNER',
  startInForgot = false,
  initialEmail = ''
}) => {
  // Views: 'LOGIN' | 'FORGOT_EMAIL' | 'FORGOT_OTP' | 'FORGOT_NEW_PASSWORD' | 'FORGOT_SUCCESS'
  const [view, setView] = useState(startInForgot ? 'FORGOT_EMAIL' : 'LOGIN');

  // Login inputs
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password OTP inputs
  const [forgotEmail, setForgotEmail] = useState(initialEmail || '');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpError, setOtpError] = useState('');

  // Timers & loading states
  const [otpTimeLeft, setOtpTimeLeft] = useState(300); // 5 minutes = 300s
  const [resendCooldown, setResendCooldown] = useState(0); // 60s cooldown
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Reset modal state whenever isOpen or startInForgot or initialEmail changes
  useEffect(() => {
    if (isOpen) {
      setView(startInForgot ? 'FORGOT_EMAIL' : 'LOGIN');
      if (initialEmail) {
        setEmail(initialEmail);
        setForgotEmail(initialEmail);
      }
      setOtp('');
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpError('');
    }
  }, [isOpen, startInForgot, initialEmail]);

  // Reset modal state when closed or opened
  const handleClose = () => {
    setView('LOGIN');
    setForgotEmail('');
    setOtp('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setOtpError('');
    setIsSubmitting(false);
    setIsSendingOtp(false);
    setIsVerifyingOtp(false);
    setIsResettingPassword(false);
    if (onClose) onClose();
  };

  // 5-minute countdown timer for OTP expiry
  useEffect(() => {
    let timer = null;
    if (view === 'FORGOT_OTP' && otpTimeLeft > 0) {
      timer = setInterval(() => {
        setOtpTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [view, otpTimeLeft]);

  // 60-second cooldown timer for resend code button
  useEffect(() => {
    let timer = null;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle Standard Sign In
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

  // Step 1: Send OTP to registered email
  const handleSendOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setOtpError('');

    if (!forgotEmail || !forgotEmail.trim()) {
      showToast('Please enter your registered email address', 'warning');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail.trim())) {
      showToast('Please provide a valid email address', 'warning');
      return;
    }

    setIsSendingOtp(true);
    try {
      const response = await apiClient.post('/auth/otp/send', {
        email: forgotEmail.trim()
      });
      const data = response?.data || response;

      setOtp('');
      setOtpTimeLeft(300); // 5 minutes
      setResendCooldown(60); // 60 seconds cooldown
      setView('FORGOT_OTP');
      showToast(data.message || 'A 6-digit verification code has been sent to your email!', 'info');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not send verification code.';
      showToast(msg, 'warning');
      if (err.response?.status === 429) {
        const remaining = err.response?.data?.data?.remainingSeconds || 60;
        setResendCooldown(remaining);
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 2: Verify 6-digit OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError('');

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setOtpError('Please enter a valid 6-digit numeric verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const response = await apiClient.post('/auth/otp/verify', {
        email: forgotEmail.trim(),
        otp: cleanOtp
      });
      const data = response?.data || response;

      if (data?.resetToken) {
        setResetToken(data.resetToken);
        setView('FORGOT_NEW_PASSWORD');
        showToast('Verification code confirmed! Please create your new password.', 'success');
      } else {
        throw new Error('Verification was successful but reset token was missing.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Invalid or expired verification code.';
      setOtpError(msg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Step 3: Set New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setOtpError('');

    if (newPassword.length < 8) {
      setOtpError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setOtpError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsResettingPassword(true);
    try {
      const response = await apiClient.post('/auth/otp/reset-password', {
        email: forgotEmail.trim(),
        resetToken,
        newPassword
      });
      const data = response?.data || response;

      setView('FORGOT_SUCCESS');
      showToast(data.message || 'Password Reset Successfully!', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to reset password. Please try again.';
      setOtpError(msg);
    } finally {
      setIsResettingPassword(false);
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
      {/* Modal Header Branding */}
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
          {view === 'LOGIN' && <Dumbbell size={28} />}
          {view === 'FORGOT_EMAIL' && <KeyRound size={26} />}
          {view === 'FORGOT_OTP' && <Shield size={26} />}
          {view === 'FORGOT_NEW_PASSWORD' && <Lock size={26} />}
          {view === 'FORGOT_SUCCESS' && <CheckCircle2 size={28} />}
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
          {view === 'LOGIN' && 'Sign in to access your dashboard'}
          {view === 'FORGOT_EMAIL' && 'Reset Your Account Password'}
          {view === 'FORGOT_OTP' && 'Enter 6-Digit Verification Code'}
          {view === 'FORGOT_NEW_PASSWORD' && 'Create Your New Password'}
          {view === 'FORGOT_SUCCESS' && 'Account Security Update'}
        </p>
      </div>

      {/* VIEW 1: Standard Login Form */}
      {view === 'LOGIN' && (
        <form onSubmit={handleLogin}>
          <Input
            label="Email Address"
            name="modal-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
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
                setOtpError('');
                setView('FORGOT_EMAIL');
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
      )}

      {/* VIEW 2: Forgot Password - Step 1: Email Input */}
      {view === 'FORGOT_EMAIL' && (
        <form onSubmit={handleSendOtp}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 18, lineHeight: 1.5 }}>
            Enter your registered email address. We will send a secure single-use 6-digit OTP code to verify your identity.
          </p>

          <Input
            label="Registered Email Address"
            name="modal-forgot-email"
            type="email"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            placeholder="name@company.com"
            required
            autoFocus
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setView('LOGIN')}
            >
              Back to Login
            </Button>
            <Button
              type="submit"
              disabled={isSendingOtp}
            >
              {isSendingOtp ? 'Sending OTP via Brevo...' : 'Send OTP'}
            </Button>
          </div>
        </form>
      )}

      {/* VIEW 3: Forgot Password - Step 2: OTP Verification */}
      {view === 'FORGOT_OTP' && (
        <form onSubmit={handleVerifyOtp}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 16, lineHeight: 1.5 }}>
            We sent a 6-digit verification code to <strong style={{ color: 'var(--text-primary)' }}>{forgotEmail}</strong>.
          </p>

          {otpError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              color: '#EF4444',
              fontSize: '0.85rem',
              marginBottom: 16
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{otpError}</span>
            </div>
          )}

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              6-Digit Verification Code
            </label>
            <input
              type="text"
              name="modal-otp"
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(val);
                if (otpError) setOtpError('');
              }}
              placeholder="123456"
              maxLength={6}
              autoFocus
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '1.5rem',
                fontWeight: 800,
                letterSpacing: '8px',
                textAlign: 'center',
                fontFamily: 'monospace',
                borderRadius: 10,
                border: '1.5px solid var(--border-color, rgba(255, 107, 0, 0.4))',
                backgroundColor: 'var(--bg-surface-elevated, #1A2234)',
                color: 'var(--brand-primary, #FF6B00)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Expiry & Resend Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.825rem',
            marginBottom: 20
          }}>
            <span style={{ color: otpTimeLeft > 0 ? 'var(--text-muted)' : '#EF4444', fontWeight: 500 }}>
              {otpTimeLeft > 0 ? `⏳ Code expires in ${formatTimer(otpTimeLeft)}` : '❌ Code has expired'}
            </span>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={resendCooldown > 0 || isSendingOtp}
              style={{
                background: 'none',
                border: 'none',
                color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--brand-primary, #FF6B00)',
                cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.825rem',
                padding: 0
              }}
            >
              {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setOtpError('');
                setView('FORGOT_EMAIL');
              }}
            >
              Change Email
            </Button>
            <Button
              type="submit"
              disabled={isVerifyingOtp || otp.length !== 6 || otpTimeLeft === 0}
            >
              {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
            </Button>
          </div>
        </form>
      )}

      {/* VIEW 4: Forgot Password - Step 3: Set New Password */}
      {view === 'FORGOT_NEW_PASSWORD' && (
        <form onSubmit={handleResetPassword}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 16, lineHeight: 1.5 }}>
            Identity verified! Please enter your new permanent password below.
          </p>

          {otpError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              color: '#EF4444',
              fontSize: '0.85rem',
              marginBottom: 16
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{otpError}</span>
            </div>
          )}

          <Input
            label="New Password (Min. 8 characters)"
            name="modal-new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            required
            showPasswordToggle
            autoFocus
          />

          <Input
            label="Confirm New Password"
            name="modal-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            showPasswordToggle
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setView('LOGIN')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isResettingPassword || !newPassword || newPassword.length < 8}
            >
              {isResettingPassword ? 'Updating Password...' : 'Reset Password'}
            </Button>
          </div>
        </form>
      )}

      {/* VIEW 5: Forgot Password - Step 4: Success Screen */}
      {view === 'FORGOT_SUCCESS' && (
        <div style={{ textAlign: 'center', padding: '16px 8px' }}>
          <div style={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1.5px solid rgba(34, 197, 94, 0.4)',
            color: '#22C55E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <CheckCircle2 size={34} />
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            Password Reset Successfully!
          </h3>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: 24 }}>
            Your account credentials have been securely updated. You can now sign in with your new password.
          </p>

          <Button
            onClick={() => {
              setEmail(forgotEmail);
              setPassword('');
              setView('LOGIN');
            }}
            className="w-full"
            style={{ width: '100%', padding: '12px' }}
          >
            Back to Login
          </Button>
        </div>
      )}
    </Modal>
  );
};

export default CommonLoginModal;
