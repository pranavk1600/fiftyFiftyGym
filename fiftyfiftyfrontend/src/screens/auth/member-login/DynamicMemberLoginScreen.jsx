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
import { CommonLoginModal } from '../../../shared/components/CommonLoginModal/CommonLoginModal';
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
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

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
      setErrorMessage('Please enter your email address or mobile number');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.post('/auth/member/login', {
        email: email.trim(),
        identifier: email.trim(),
        phone: email.trim(),
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
                  Member Email or Mobile Number
                </label>
                <div className="dynamic-gym-input-wrapper">
                  <Mail size={18} className="dynamic-gym-input-icon" />
                  <input
                    id="member-email"
                    type="text"
                    name="email"
                    autoComplete="username"
                    required
                    placeholder="e.g. member@fitness.com or 9876543210"
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
                    onClick={() => setIsForgotModalOpen(true)}
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

      {/* Forgot Password OTP Modal */}
      <CommonLoginModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        startInForgot={true}
        initialEmail={email}
        initialRole="MEMBER"
      />
    </div>
  );
};

export default DynamicMemberLoginScreen;
