import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Shield,
  Building2,
  RefreshCw,
  KeyRound,
  ArrowLeft,
  Check,
  X
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { apiClient } from '../../../shared/services/apiClient';
import '../../../styles/screens/auth/dynamicGymLogin.css';

export const GymResetPasswordScreen = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [verifyState, setVerifyState] = useState('verifying'); // 'verifying' | 'valid' | 'invalid'
  const [gym, setGym] = useState(null);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [resolvedSlug, setResolvedSlug] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const DEFAULT_FALLBACK_GYM_BG = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1920&q=80';

  // 1. Fetch gym information and verify reset token
  useEffect(() => {
    let isMounted = true;

    const verifyTokenAndLoadGym = async () => {
      if (!token) {
        if (isMounted) {
          setErrorMessage('No password reset token was provided in the link.');
          setVerifyState('invalid');
        }
        return;
      }

      const targetSlug = (slug || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

      try {
        // Load gym public branding
        if (targetSlug) {
          try {
            const gymRes = await apiClient.get(`/gyms/slug/${targetSlug}`);
            const gymData = gymRes.data?.data || gymRes.data;
            if (isMounted && gymData) setGym(gymData);
          } catch (_gErr) {
            try {
              const fallbackRes = await apiClient.get(`/public/gyms/${targetSlug}`);
              const fallbackData = fallbackRes.data?.data || fallbackRes.data?.gym || fallbackRes.data;
              if (isMounted && fallbackData) setGym(fallbackData);
            } catch (_fErr) {
              // Non-fatal if gym lookup fails
            }
          }
        }

        // Verify token against backend
        const verifyRes = await apiClient.get(`/auth/verify-reset-token?token=${encodeURIComponent(token.trim())}`);
        const verifyData = verifyRes.data?.data || verifyRes.data;

        if (isMounted) {
          if (verifyData && verifyData.valid) {
            if (verifyData.userType && verifyData.userType !== 'GYM_OWNER') {
              setVerifyState('invalid');
              setErrorMessage('This password reset link is not intended for gym owner accounts.');
              return;
            }

            setVerifyState('valid');
            if (verifyData.email) setOwnerEmail(verifyData.email);
            if (verifyData.gymSlug) setResolvedSlug(verifyData.gymSlug);
            if (verifyData.gymName && !gym) setGym((prev) => ({ ...prev, name: verifyData.gymName }));
          } else {
            setVerifyState('invalid');
            setErrorMessage('This password reset link is invalid, expired, or has already been used.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setVerifyState('invalid');
          setErrorMessage(
            err.response?.data?.message ||
            err.message ||
            'This password reset link is invalid, expired, or has already been used.'
          );
        }
      }
    };

    verifyTokenAndLoadGym();

    return () => {
      isMounted = false;
    };
  }, [slug, token]);

  // 2. Countdown redirect after success
  useEffect(() => {
    let timer = null;
    if (isSuccess && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isSuccess && countdown === 0) {
      const targetPath = `/gym/${resolvedSlug || slug}/login`;
      navigate(targetPath);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isSuccess, countdown, navigate, resolvedSlug, slug]);

  // 3. Password Strength Calculation
  const calculateStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'None', color: '#64748B', percent: 0 };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: '#EF4444', percent: 25 };
    if (score <= 2) return { score: 2, label: 'Fair', color: '#F97316', percent: 50 };
    if (score <= 3) return { score: 3, label: 'Good', color: '#EAB308', percent: 75 };
    return { score: 4, label: 'Strong', color: '#22C55E', percent: 100 };
  };

  const strength = calculateStrength(newPassword);

  const criteria = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'Uppercase & lowercase letters', met: /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) },
    { label: 'At least one number (0-9)', met: /\d/.test(newPassword) },
    { label: 'At least one special symbol', met: /[^A-Za-z0-9]/.test(newPassword) }
  ];

  // 4. Submit new password
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.post('/auth/reset-password', {
        token: token.trim(),
        newPassword
      });

      const data = response.data?.data || response.data || response;
      if (data?.success) {
        setIsSuccess(true);
        showToast('Password reset successfully! Redirecting to sign in...', 'success');
      } else {
        throw new Error('Password reset could not be completed.');
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to reset password. Please request a new link.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginUrl = `/gym/${resolvedSlug || slug}/login`;
  const configuredBg = gym?.cover_url || gym?.banner_url || gym?.background_url || gym?.gym_image;
  const bgPhoto = configuredBg || DEFAULT_FALLBACK_GYM_BG;

  return (
    <div className="dynamic-gym-page">
      {/* Background Backdrop */}
      <div className="dynamic-gym-backdrop" aria-hidden="true">
        {bgPhoto && (
          <div
            className="dynamic-gym-bg-image"
            style={{ backgroundImage: `url(${bgPhoto})` }}
          />
        )}
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
                <KeyRound size={22} />
              </div>
            </div>
            <h2 className="dynamic-gym-welcome-title">Validating Reset Link...</h2>
            <p className="dynamic-gym-welcome-subtitle">
              Verifying your secure password reset token
            </p>
          </div>
        )}

        {/* State B: Invalid / Expired Token Screen */}
        {verifyState === 'invalid' && (
          <div className="dynamic-gym-card dynamic-gym-not-found">
            <div className="dynamic-gym-not-found-icon">
              <AlertCircle size={32} />
            </div>
            <h2 className="dynamic-gym-not-found-title">Reset Link Expired or Invalid</h2>
            <p className="dynamic-gym-not-found-desc">
              {errorMessage || 'This password reset link is invalid, has expired, or has already been used.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link
                to={loginUrl}
                className="dynamic-gym-submit-btn"
                style={{ textDecoration: 'none', display: 'inline-flex' }}
              >
                <span>Return to Gym Sign In</span>
                <ArrowRight size={16} />
              </Link>
              <Link to="/" className="dynamic-gym-portal-link" style={{ marginTop: 8 }}>
                <ArrowLeft size={14} />
                <span>Return to Platform Home</span>
              </Link>
            </div>
          </div>
        )}

        {/* State C: Valid Token - Reset Password Form or Success */}
        {verifyState === 'valid' && (
          <div className="dynamic-gym-card">
            {isSuccess ? (
              <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1.5px solid rgba(34, 197, 94, 0.4)',
                    color: '#22C55E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px'
                  }}
                >
                  <CheckCircle2 size={36} />
                </div>
                <h2 className="dynamic-gym-title" style={{ fontSize: '1.45rem', marginBottom: 8 }}>
                  Password Reset Successful!
                </h2>
                <p className="dynamic-gym-subtitle" style={{ marginBottom: 20, lineHeight: 1.5 }}>
                  Your password has been updated securely. You can now sign in to your gym owner portal with your new credentials.
                </p>
                <div
                  style={{
                    backgroundColor: 'rgba(255, 107, 0, 0.1)',
                    borderLeft: '4px solid #FF6B00',
                    padding: '10px 14px',
                    borderRadius: 6,
                    marginBottom: 24,
                    fontSize: '0.85rem',
                    color: '#FED7AA'
                  }}
                >
                  Redirecting to Gym Sign In in <strong>{countdown}s</strong>...
                </div>
                <button
                  type="button"
                  className="dynamic-gym-submit-btn"
                  onClick={() => navigate(loginUrl)}
                >
                  <span>Sign In to Gym Portal Now</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <>
                <div className="dynamic-gym-header">
                  <div className="dynamic-gym-logo-wrapper">
                    {gym?.logo_url ? (
                      <img
                        src={gym.logo_url}
                        alt={gym.name || 'Gym'}
                        className="dynamic-gym-logo-img"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="dynamic-gym-logo-fallback">
                        <Building2 size={32} />
                      </div>
                    )}
                  </div>

                  <div className="dynamic-gym-brand-eyebrow">
                    {gym?.name || 'FiftyFifty Gym'}
                  </div>

                  <h1 className="dynamic-gym-title">Reset Your Password</h1>
                  <p className="dynamic-gym-subtitle">
                    Create a new secure password for {ownerEmail || 'your Gym Owner account'}
                  </p>
                </div>

                {errorMessage && (
                  <div className="dynamic-gym-alert error" style={{ marginBottom: 18 }}>
                    <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="dynamic-gym-form" noValidate>
                  {/* New Password */}
                  <div className="dynamic-gym-field">
                    <label className="dynamic-gym-label" htmlFor="reset-new-password">
                      New Password (Min. 8 characters)
                    </label>
                    <div className="dynamic-gym-input-wrapper">
                      <Lock size={18} className="dynamic-gym-input-icon" />
                      <input
                        id="reset-new-password"
                        type={showPassword ? 'text' : 'password'}
                        name="newPassword"
                        autoComplete="new-password"
                        required
                        placeholder="Enter your new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="dynamic-gym-input has-eye"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        className="dynamic-gym-eye-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {newPassword && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Strength:</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: strength.color }}>
                            {strength.label}
                          </span>
                        </div>
                        <div style={{ height: 4, width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 2, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${strength.percent}%`,
                              backgroundColor: strength.color,
                              transition: 'width 0.3s ease, background-color 0.3s ease'
                            }}
                          />
                        </div>
                        {/* Requirements checklist */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', marginTop: 8 }}>
                          {criteria.map((c, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: c.met ? '#22C55E' : '#64748B' }}>
                              {c.met ? <Check size={12} /> : <X size={12} />}
                              <span>{c.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="dynamic-gym-field">
                    <label className="dynamic-gym-label" htmlFor="reset-confirm-password">
                      Confirm New Password
                    </label>
                    <div className="dynamic-gym-input-wrapper">
                      <Lock size={18} className="dynamic-gym-input-icon" />
                      <input
                        id="reset-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        autoComplete="new-password"
                        required
                        placeholder="Re-enter your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="dynamic-gym-input has-eye"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        className="dynamic-gym-eye-btn"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <span style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: 4, display: 'block' }}>
                        Passwords do not match
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="dynamic-gym-submit-btn"
                    disabled={isSubmitting || newPassword.length < 8 || newPassword !== confirmPassword}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <span>Reset Password</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                <div className="dynamic-gym-footer">
                  <Link to={loginUrl} className="dynamic-gym-portal-link">
                    <ArrowLeft size={14} />
                    <span>Back to Gym Login</span>
                  </Link>

                  <div className="dynamic-gym-security-badge">
                    <Shield size={13} color="#FF6B00" />
                    <span>Protected by bcrypt hashing & 256-bit SSL</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GymResetPasswordScreen;
