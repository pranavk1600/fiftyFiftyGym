import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  KeyRound,
  Dumbbell,
  RefreshCw,
  Building2
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { apiClient } from '../../../shared/services/apiClient';
import '../../../styles/screens/auth/dynamicGymLogin.css';

export const MemberResetPasswordScreen = () => {
  const { gymSlug, memberSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const token = searchParams.get('token');

  const [verifyState, setVerifyState] = useState('verifying'); // 'verifying' | 'valid' | 'invalid'
  const [tokenInfo, setTokenInfo] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const DEFAULT_FALLBACK_GYM_BG = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1920&q=80';

  useEffect(() => {
    let isMounted = true;

    if (!token) {
      setVerifyState('invalid');
      setErrorMessage('Missing password reset token. Please use the link sent to your email.');
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await apiClient.get(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
        const data = response.data?.data || response.data;
        if (isMounted) {
          setTokenInfo(data);
          setVerifyState('valid');
        }
      } catch (err) {
        if (isMounted) {
          setVerifyState('invalid');
          setErrorMessage(err.response?.data?.message || 'The password reset link is invalid, expired, or has already been used.');
        }
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    switch (score) {
      case 1:
        return { score: 25, label: 'Weak', color: '#EF4444' };
      case 2:
        return { score: 50, label: 'Fair', color: '#F59E0B' };
      case 3:
        return { score: 75, label: 'Good', color: '#3B82F6' };
      case 4:
        return { score: 100, label: 'Strong', color: '#10B981' };
      default:
        return { score: 0, label: '', color: '' };
    }
  };

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!newPassword || newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.post('/auth/member/reset-password', {
        token,
        newPassword
      });

      setIsSuccess(true);
      showToast('Your member password has been reset successfully!', 'success');

      setTimeout(() => {
        navigate(`/gym/${gymSlug}/${memberSlug}/login`, { replace: true });
      }, 2500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password. Please request a new link.';
      setErrorMessage(msg);
      showToast(msg, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginUrl = `/gym/${gymSlug}/${memberSlug}/login`;

  return (
    <div className="dynamic-gym-page">
      <div className="dynamic-gym-backdrop" aria-hidden="true">
        <div
          className="dynamic-gym-bg-image"
          style={{ backgroundImage: `url("${DEFAULT_FALLBACK_GYM_BG}")` }}
        />
        <div className="dynamic-gym-backdrop-overlay" />
        <div className="dynamic-gym-radial-glow" />
        <div className="dynamic-gym-grid-pattern" />
      </div>

      <div className="dynamic-gym-container">
        {/* State A: Verifying Token */}
        {verifyState === 'verifying' && (
          <div className="dynamic-gym-welcome-screen">
            <div className="dynamic-gym-loading-ring-wrap">
              <div className="dynamic-gym-pulsing-orb" />
              <div className="dynamic-gym-loading-spinner" />
              <div className="dynamic-gym-loading-logo-center">
                <Dumbbell size={24} />
              </div>
            </div>
            <h1 className="dynamic-gym-welcome-title">Verifying Reset Link...</h1>
            <p className="dynamic-gym-welcome-subtitle">Please wait while we validate your security credentials.</p>
          </div>
        )}

        {/* State B: Invalid / Expired Token */}
        {verifyState === 'invalid' && (
          <div className="dynamic-gym-card dynamic-gym-not-found">
            <div className="dynamic-gym-not-found-icon">
              <AlertCircle size={32} />
            </div>
            <h2 className="dynamic-gym-not-found-title">Reset Link Expired or Invalid</h2>
            <p className="dynamic-gym-not-found-desc">
              {errorMessage || 'This password reset link is invalid, has expired (15-minute limit), or was already used.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginTop: 16 }}>
              <Link to={loginUrl} className="dynamic-gym-submit-btn" style={{ textDecoration: 'none' }}>
                <span>Back to Member Login</span>
                <ArrowRight size={16} />
              </Link>
              <Link to="/" className="dynamic-gym-btn-secondary" style={{ textDecoration: 'none', textAlign: 'center' }}>
                Return to Home
              </Link>
            </div>
          </div>
        )}

        {/* State C: Success Screen */}
        {verifyState === 'valid' && isSuccess && (
          <div className="dynamic-gym-card" style={{ textAlign: 'center' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              border: '2px solid rgba(16, 185, 129, 0.4)'
            }}>
              <CheckCircle2 size={36} />
            </div>
            <h2 className="dynamic-gym-title" style={{ color: '#10B981' }}>Password Reset Complete!</h2>
            <p className="dynamic-gym-subtitle" style={{ marginBottom: 24 }}>
              Your new password has been saved. Redirecting you to your member login...
            </p>
            <Link to={loginUrl} className="dynamic-gym-submit-btn" style={{ textDecoration: 'none' }}>
              <span>Sign In with New Password</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* State D: Valid Token -> Reset Password Form */}
        {verifyState === 'valid' && !isSuccess && (
          <div className="dynamic-gym-card">
            <div className="dynamic-gym-header">
              <div className="dynamic-gym-logo-wrapper">
                <div className="dynamic-gym-logo-fallback">
                  <KeyRound size={32} />
                </div>
              </div>

              <div className="dynamic-gym-brand-eyebrow">
                {tokenInfo?.gymName || 'FiftyFifty Gym'} &bull; MEMBER PASSWORD RESET
              </div>

              <h1 className="dynamic-gym-title">Create New Password</h1>
              <p className="dynamic-gym-subtitle">
                Resetting password for <strong>{tokenInfo?.email}</strong>
              </p>
            </div>

            {errorMessage && (
              <div className="dynamic-gym-alert error">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="dynamic-gym-form" noValidate>
              {/* New Password */}
              <div className="dynamic-gym-field">
                <label className="dynamic-gym-label" htmlFor="reset-new-password">
                  New Password
                </label>
                <div className="dynamic-gym-input-wrapper">
                  <Lock size={18} className="dynamic-gym-input-icon" />
                  <input
                    id="reset-new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="dynamic-gym-input"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="dynamic-gym-toggle-password"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      marginBottom: 4,
                      color: strength.color || '#94A3B8',
                      fontWeight: 600
                    }}>
                      <span>Password Strength</span>
                      <span>{strength.label}</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${strength.score}%`,
                        backgroundColor: strength.color,
                        transition: 'width 0.3s ease, background-color 0.3s ease'
                      }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="dynamic-gym-field">
                <label className="dynamic-gym-label" htmlFor="reset-confirm-password">
                  Confirm Password
                </label>
                <div className="dynamic-gym-input-wrapper">
                  <Lock size={18} className="dynamic-gym-input-icon" />
                  <input
                    id="reset-confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="dynamic-gym-input"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="dynamic-gym-toggle-password"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="dynamic-gym-submit-btn"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={18} className="dynamic-gym-spin" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <span>Reset Password & Sign In</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="dynamic-gym-footer">
              <Link to={loginUrl} className="dynamic-gym-back-link">
                <span>Remember your password? Sign in</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberResetPasswordScreen;
