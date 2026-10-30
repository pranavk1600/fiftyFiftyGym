import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Dumbbell,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Building2,
  KeyRound,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { apiClient } from '../../../shared/services/apiClient';
import '../../../styles/screens/auth/dynamicGymLogin.css';

export const DynamicMemberLoginScreen = () => {
  const { gymSlug, memberSlug } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [gym, setGym] = useState(null);
  const [member, setMember] = useState(null);
  const [loadState, setLoadState] = useState('loading'); // 'loading' | 'welcome' | 'ready' | 'not_found'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [logoFailed, setLogoFailed] = useState(false);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingForgot, setIsSendingForgot] = useState(false);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const DEFAULT_FALLBACK_GYM_BG = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1920&q=80';

  useEffect(() => {
    let isMounted = true;

    const fetchDetails = async () => {
      if (!gymSlug || !memberSlug) {
        if (isMounted) setLoadState('not_found');
        return;
      }

      setLoadState('loading');
      setErrorMessage('');

      try {
        const res = await apiClient.get(`/auth/member/portal-details/${gymSlug}/${memberSlug}`);
        const data = res.data?.data || res.data;

        if (data?.gym && data?.member) {
          if (isMounted) {
            setGym(data.gym);
            setMember(data.member);
            setEmail(data.member.email || '');
            setForgotEmail(data.member.email || '');
            setLoadState('welcome');
            setTimeout(() => {
              if (isMounted) setLoadState('ready');
            }, 800);
          }
        } else {
          if (isMounted) setLoadState('not_found');
        }
      } catch (err) {
        console.error('Failed to load member portal details:', err);
        if (isMounted) {
          if (err.response?.status === 404) {
            setLoadState('not_found');
          } else {
            setErrorMessage(err.response?.data?.message || 'Failed to connect to member portal');
            setLoadState('ready');
          }
        }
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [gymSlug, memberSlug]);

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.post('/auth/member/login', {
        email: email.trim().toLowerCase(),
        password,
        gymSlug,
        memberSlug
      });

      const data = response.data?.data || response.data || response;
      const { user, token } = data;

      if (!token || !user) {
        throw new Error('Authentication response was incomplete');
      }

      login(user, token);
      showToast(`Welcome back, ${user.fullName || member?.name || 'Member'}!`, 'success');
      navigate('/member/dashboard', { replace: true });
    } catch (err) {
      console.error('Member login error:', err);
      const msg = err.response?.data?.message || err.message || 'Invalid email or password';
      setErrorMessage(msg);
      showToast(msg, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Forgot Password
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');

    if (!forgotEmail.trim()) {
      setForgotError('Please enter your registered email address');
      return;
    }

    setIsSendingForgot(true);

    try {
      await apiClient.post('/auth/member/forgot-password', {
        email: forgotEmail.trim(),
        gymSlug,
        memberSlug
      });
      setForgotSubmitted(true);
      showToast('Password reset link sent! Check your inbox.', 'success');
    } catch (err) {
      if (err.response?.status === 429) {
        setForgotError(err.response?.data?.message || 'Too many reset attempts. Please wait 15 minutes.');
      } else {
        setForgotSubmitted(true);
      }
    } finally {
      setIsSendingForgot(false);
    }
  };

  const configuredBg = gym?.cover_url || gym?.banner_url || gym?.background_url || gym?.gym_image;
  const bgPhoto = configuredBg || DEFAULT_FALLBACK_GYM_BG;

  return (
    <div className="dynamic-gym-page">
      {/* Background Backdrop */}
      <div className="dynamic-gym-backdrop" aria-hidden="true">
        {bgPhoto && (
          <div
            className="dynamic-gym-bg-image"
            style={{ backgroundImage: `url("${bgPhoto}")` }}
          />
        )}
        <div className="dynamic-gym-backdrop-overlay" />
        <div className="dynamic-gym-radial-glow" />
        <div className="dynamic-gym-grid-pattern" />
      </div>

      <div className="dynamic-gym-container">
        {/* State A: Loading / Welcome Screen */}
        {(loadState === 'loading' || loadState === 'welcome') && (
          <div className="dynamic-gym-welcome-screen">
            <div className="dynamic-gym-loading-ring-wrap">
              <div className="dynamic-gym-pulsing-orb" />
              <div className="dynamic-gym-loading-spinner" />
              <div className="dynamic-gym-loading-logo-center">
                {gym?.logo_url || gym?.logoUrl ? (
                  <img src={gym.logo_url || gym.logoUrl} alt={gym.name} />
                ) : (
                  <Dumbbell size={24} />
                )}
              </div>
            </div>

            <div className="dynamic-gym-welcome-badge">
              <Sparkles size={12} />
              <span>FIFTYFIFTY MEMBER PORTAL</span>
            </div>

            <h1 className="dynamic-gym-welcome-title">
              {member?.name ? `Welcome, ${member.name}` : `Welcome to ${gym?.name || 'Your Gym'}`}
            </h1>

            <p className="dynamic-gym-welcome-subtitle">
              "Your fitness journey starts here."
            </p>

            <div className="dynamic-gym-loading-progress-bar">
              <div className="dynamic-gym-loading-progress-fill" />
            </div>
          </div>
        )}

        {/* State B: Member Portal Not Found */}
        {loadState === 'not_found' && (
          <div className="dynamic-gym-card dynamic-gym-not-found">
            <div className="dynamic-gym-not-found-icon">
              <AlertCircle size={32} />
            </div>
            <h2 className="dynamic-gym-not-found-title">Member Portal Not Found</h2>
            <p className="dynamic-gym-not-found-desc">
              We couldn't locate a member account matching <strong>/gym/{gymSlug}/{memberSlug}</strong>.
              Please verify the link in your email or contact your gym administrator.
            </p>
            <Link
              to="/"
              className="dynamic-gym-submit-btn"
              style={{ textDecoration: 'none', display: 'inline-flex' }}
            >
              <ArrowLeft size={16} />
              <span>Return to Platform Home</span>
            </Link>
          </div>
        )}

        {/* State C: Ready / Login Card */}
        {loadState === 'ready' && (
          <div className="dynamic-gym-card">
            {/* Header / Gym & Member Branding */}
            <div className="dynamic-gym-header">
              <div className="dynamic-gym-logo-wrapper">
                {(gym?.logo_url || gym?.logoUrl) && !logoFailed ? (
                  <img
                    src={gym.logo_url || gym.logoUrl}
                    alt={gym.name}
                    className="dynamic-gym-logo-img"
                    onError={() => setLogoFailed(true)}
                  />
                ) : (
                  <div className="dynamic-gym-logo-fallback">
                    <Building2 size={32} />
                  </div>
                )}
              </div>

              <div className="dynamic-gym-brand-eyebrow">
                {gym?.name || 'FiftyFifty Gym'} &bull; MEMBER ACCESS
              </div>

              <h1 className="dynamic-gym-title">
                {member?.name ? `Welcome, ${member.name}` : 'Member Sign In'}
              </h1>
              <p className="dynamic-gym-subtitle">
                {member?.plan
                  ? `${member.plan} &bull; Valid member portal`
                  : 'Sign in to access your workout attendance and membership profile'}
              </p>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="dynamic-gym-alert error">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Member Login Form */}
            <form onSubmit={handleSubmit} className="dynamic-gym-form" noValidate>
              {/* Email Field */}
              <div className="dynamic-gym-field">
                <label className="dynamic-gym-label" htmlFor="member-email">
                  Member Email Address
                </label>
                <div className="dynamic-gym-input-wrapper">
                  <Mail size={18} className="dynamic-gym-input-icon" />
                  <input
                    id="member-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    placeholder="e.g. member@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="dynamic-gym-input"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="dynamic-gym-field">
                <div className="dynamic-gym-field-header">
                  <label className="dynamic-gym-label" htmlFor="member-password">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotModalOpen(true);
                      setForgotSubmitted(false);
                      setForgotError('');
                    }}
                    className="dynamic-gym-forgot-link"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="dynamic-gym-input-wrapper">
                  <Lock size={18} className="dynamic-gym-input-icon" />
                  <input
                    id="member-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="dynamic-gym-input"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="dynamic-gym-toggle-password"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Member Portal</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Footer / Public Links */}
            <div className="dynamic-gym-footer">
              <Link to={`/gym/${gymSlug}`} className="dynamic-gym-back-link">
                <ArrowLeft size={14} />
                <span>Back to {gym?.name || 'Gym Portal'}</span>
              </Link>

              <div className="dynamic-gym-security-badge">
                <Shield size={13} />
                <span>Protected by FiftyFifty RBAC &bull; Member Tier</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="dynamic-gym-modal-overlay" onClick={() => setIsForgotModalOpen(false)}>
          <div
            className="dynamic-gym-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="forgot-modal-title"
          >
            <div className="dynamic-gym-modal-header">
              <div className="dynamic-gym-modal-icon-badge">
                <KeyRound size={22} />
              </div>
              <div>
                <h3 id="forgot-modal-title" className="dynamic-gym-modal-title">
                  Reset Member Password
                </h3>
                <p className="dynamic-gym-modal-subtitle">
                  We'll send a secure password reset link to your registered member email.
                </p>
              </div>
            </div>

            {forgotSubmitted ? (
              <div className="dynamic-gym-modal-success">
                <CheckCircle2 size={36} className="dynamic-gym-modal-success-icon" />
                <h4 className="dynamic-gym-modal-success-title">Check Your Inbox</h4>
                <p className="dynamic-gym-modal-success-text">
                  If an active account exists for <strong>{forgotEmail}</strong> at {gym?.name || 'this gym'}, a secure password reset link has been dispatched.
                </p>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(false)}
                  className="dynamic-gym-submit-btn"
                  style={{ marginTop: 16 }}
                >
                  Return to Member Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="dynamic-gym-form">
                {forgotError && (
                  <div className="dynamic-gym-alert error">
                    <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div className="dynamic-gym-field">
                  <label className="dynamic-gym-label" htmlFor="forgot-email">
                    Member Email Address
                  </label>
                  <div className="dynamic-gym-input-wrapper">
                    <Mail size={18} className="dynamic-gym-input-icon" />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      placeholder="e.g. member@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="dynamic-gym-input"
                      disabled={isSendingForgot}
                    />
                  </div>
                </div>

                <div className="dynamic-gym-modal-actions">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="dynamic-gym-btn-secondary"
                    disabled={isSendingForgot}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="dynamic-gym-submit-btn"
                    disabled={isSendingForgot}
                    style={{ flex: 1 }}
                  >
                    {isSendingForgot ? (
                      <>
                        <RefreshCw size={16} className="dynamic-gym-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>Send Reset Link</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicMemberLoginScreen;
