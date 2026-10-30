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
  ArrowLeft
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { apiClient } from '../../../shared/services/apiClient';
import '../../../styles/screens/auth/dynamicGymLogin.css';

export const GymSetupPasswordScreen = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [verifyState, setVerifyState] = useState('verifying'); // 'verifying' | 'valid' | 'invalid'
  const [gym, setGym] = useState(null);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // 1. Fetch gym information and verify invitation token
  useEffect(() => {
    let isMounted = true;

    const verifyTokenAndLoadGym = async () => {
      if (!token) {
        if (isMounted) {
          setErrorMessage('No invitation activation token provided in the link.');
          setVerifyState('invalid');
        }
        return;
      }

      try {
        // Load gym public branding
        try {
          const gymRes = await apiClient.get(`/gyms/slug/${slug}`);
          const gymData = gymRes.data?.data || gymRes.data;
          if (isMounted && gymData) setGym(gymData);
        } catch (_gErr) {
          // Non-fatal if gym lookup fails
        }

        // Verify token against backend
        const verifyRes = await apiClient.get(`/auth/verify-reset-token?token=${encodeURIComponent(token.trim())}`);
        const verifyData = verifyRes.data?.data || verifyRes.data;

        if (isMounted) {
          if (verifyData && verifyData.valid) {
            setVerifyState('valid');
            if (verifyData.email) setOwnerEmail(verifyData.email);
            if (verifyData.gymName && !gym) setGym({ name: verifyData.gymName });
          } else {
            setVerifyState('invalid');
            setErrorMessage('The activation link is invalid or has expired.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setVerifyState('invalid');
          setErrorMessage(err.response?.data?.message || 'This activation link is invalid or has expired.');
        }
      }
    };

    verifyTokenAndLoadGym();

    return () => {
      isMounted = false;
    };
  }, [slug, token]);

  // 2. Submit new password
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
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
        showToast('Password setup complete! You can now sign in.', 'success');
      } else {
        throw new Error('Password setup could not be completed.');
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to set password. Please request a new invitation.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const DEFAULT_FALLBACK_GYM_BG = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1920&q=80';
  const loginUrl = `/gym/${slug}/login`;
  const configuredBg = gym?.cover_url || gym?.banner_url || gym?.background_url || gym?.gym_image;
  const bgPhoto = configuredBg || DEFAULT_FALLBACK_GYM_BG;

  return (
    <div className="dynamic-gym-page">
      <div className="dynamic-gym-backdrop">
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
            <h2 className="dynamic-gym-welcome-title">Validating Invitation...</h2>
            <p className="dynamic-gym-welcome-subtitle">
              Verifying your secure gym owner activation link
            </p>
          </div>
        )}

        {/* State B: Invalid Token Screen */}
        {verifyState === 'invalid' && (
          <div className="dynamic-gym-card dynamic-gym-not-found">
            <div className="dynamic-gym-not-found-icon">
              <AlertCircle size={32} />
            </div>
            <h2 className="dynamic-gym-not-found-title">Activation Link Expired</h2>
            <p className="dynamic-gym-not-found-desc">
              {errorMessage || 'This activation link is no longer valid or has already been used.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link
                to={loginUrl}
                className="dynamic-gym-submit-btn"
                style={{ textDecoration: 'none', display: 'inline-flex' }}
              >
                <span>Go to Gym Sign In</span>
                <ArrowRight size={16} />
              </Link>
              <Link to="/" className="dynamic-gym-portal-link" style={{ marginTop: 8 }}>
                <ArrowLeft size={14} />
                <span>Return to Platform Home</span>
              </Link>
            </div>
          </div>
        )}

        {/* State C: Valid Token - Form or Success */}
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
                  Password Setup Complete!
                </h2>
                <p className="dynamic-gym-subtitle" style={{ marginBottom: 24, lineHeight: 1.5 }}>
                  Your password has been configured successfully. You can now sign in to your branded gym owner portal.
                </p>
                <button
                  type="button"
                  className="dynamic-gym-submit-btn"
                  onClick={() => navigate(loginUrl)}
                >
                  <span>Proceed to Gym Sign In</span>
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
                        alt={gym.name}
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

                  <h1 className="dynamic-gym-title">Set Up Your Password</h1>
                  <p className="dynamic-gym-subtitle">
                    Activate your owner portal access
                    {ownerEmail ? ` for ${ownerEmail}` : ''}
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
                    <label className="dynamic-gym-label" htmlFor="setup-new-password">
                      New Password (Min. 8 characters)
                    </label>
                    <div className="dynamic-gym-input-wrapper">
                      <Lock size={18} className="dynamic-gym-input-icon" />
                      <input
                        id="setup-new-password"
                        type={showPassword ? 'text' : 'password'}
                        name="newPassword"
                        autoComplete="new-password"
                        required
                        placeholder="Create a strong password"
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
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="dynamic-gym-field">
                    <label className="dynamic-gym-label" htmlFor="setup-confirm-password">
                      Confirm New Password
                    </label>
                    <div className="dynamic-gym-input-wrapper">
                      <Lock size={18} className="dynamic-gym-input-icon" />
                      <input
                        id="setup-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        autoComplete="new-password"
                        required
                        placeholder="Re-enter your password"
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
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="dynamic-gym-submit-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>Activating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Activate Account & Save Password</span>
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
                    <span>256-bit Encrypted Password Setup</span>
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

export default GymSetupPasswordScreen;
