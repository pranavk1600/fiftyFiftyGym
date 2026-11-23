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
  HelpCircle,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { apiClient } from '../../../shared/services/apiClient';
import { CommonLoginModal } from '../../../shared/components/CommonLoginModal/CommonLoginModal';
import '../../../styles/screens/auth/dynamicGymLogin.css';

export const DynamicGymLoginScreen = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [gym, setGym] = useState(null);
  const [loadState, setLoadState] = useState('loading'); // 'loading' | 'welcome' | 'ready' | 'not_found'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  // Default high-resolution gym atmosphere background image used ONLY when a gym has no configured image
  const DEFAULT_FALLBACK_GYM_BG = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1920&q=80';

  // 1. Fetch Gym details on component mount
  useEffect(() => {
    let isMounted = true;

    const fetchGym = async () => {
      if (!slug) {
        if (isMounted) setLoadState('not_found');
        return;
      }

      setLoadState('loading');
      setErrorMessage('');

      // Normalize slug to handle potential encoded spaces or case variations
      const normalizedSlug = (slug || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const targetSlug = normalizedSlug || slug;

      if (slug && slug !== normalizedSlug) {
        navigate(`/gym/${normalizedSlug}/login`, { replace: true });
        return;
      }

      try {
        let gymData = null;
        try {
          const res = await apiClient.get(`/gyms/slug/${targetSlug}`);
          gymData = res.data?.data || res.data?.gym || res.data || res.gym || res;
        } catch (apiErr) {
          if (apiErr.response?.status === 404 || apiErr.status === 404) {
            if (isMounted) setLoadState('not_found');
            return;
          }
          // Fallback to /public/gyms/:slug
          try {
            const fallbackRes = await apiClient.get(`/public/gyms/${targetSlug}`);
            const fallbackData = fallbackRes.data?.data || fallbackRes.data?.gym || fallbackRes.data || fallbackRes;
            gymData = fallbackData?.gym || fallbackData;
          } catch (fallbackErr) {
            if (fallbackErr.response?.status === 404 || fallbackErr.status === 404) {
              if (isMounted) setLoadState('not_found');
              return;
            }
            throw fallbackErr;
          }
        }

        if (gymData && gymData.name) {
          if (isMounted) {
            setGym(gymData);
            // Present smooth dynamic welcome screen before displaying login
            setLoadState('welcome');
            setTimeout(() => {
              if (isMounted) {
                setLoadState('ready');
              }
            }, 1000);
          }
        } else {
          if (isMounted) setLoadState('not_found');
        }
      } catch (err) {
        console.error('Failed to load gym info:', err);
        if (isMounted) {
          if (err.response?.status === 404 || err.status === 404) {
            setLoadState('not_found');
          } else {
            setErrorMessage(err.response?.data?.message || err.message || 'Failed to connect to gym portal');
            setLoadState('ready');
          }
        }
      }
    };

    fetchGym();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // 2. Handle Form Submission
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
      const response = await apiClient.post('/auth/gym/login', {
        email: email.trim(),
        identifier: email.trim(),
        phone: email.trim(),
        password,
        gymSlug: (gym?.slug || slug || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      });

      const data = response.data?.data || response.data || response;
      const { user, token } = data;

      if (!token || !user) {
        throw new Error('Authentication response was incomplete');
      }

      // Preserve the authenticated owner's gym slug and gym metadata
      const authenticatedUser = {
        ...user,
        gymSlug: user.gymSlug || slug,
        gymName: user.gymName || gym?.name,
        gymLogoUrl: user.gymLogoUrl || gym?.logo_url || user.logo_url
      };

      login(authenticatedUser, token);
      try {
        localStorage.setItem('fiftyfifty_last_gym_slug', authenticatedUser.gymSlug);
      } catch (_e) {}

      showToast(`Welcome to ${gym?.name || 'Gym'} Owner Portal, ${user.fullName || 'Owner'}!`, 'success');
      navigate('/owner/dashboard');
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Authentication failed. Please verify your credentials.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenForgotModal = () => {
    setIsForgotModalOpen(true);
  };

  const configuredBg = gym?.cover_url || gym?.banner_url || gym?.background_url || gym?.gym_image || gym?.logo_url;
  const bgPhoto = configuredBg || DEFAULT_FALLBACK_GYM_BG;

  return (
    <div className="dynamic-gym-page">
      {/* Dynamic Background Backdrop */}
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
                {gym?.logo_url ? (
                  <img src={gym.logo_url} alt={gym.name} />
                ) : (
                  <Dumbbell size={24} />
                )}
              </div>
            </div>

            <div className="dynamic-gym-welcome-badge">
              <Sparkles size={12} />
              <span>FIFTYFIFTY GYM PLATFORM</span>
            </div>

            <h1 className="dynamic-gym-welcome-title">
              {loadState === 'welcome' && gym?.name
                ? `Welcome to ${gym.name}`
                : 'Loading Gym Portal...'}
            </h1>

            <p className="dynamic-gym-welcome-subtitle">
              "Your fitness journey starts here."
            </p>

            <div className="dynamic-gym-loading-progress-bar">
              <div className="dynamic-gym-loading-progress-fill" />
            </div>
          </div>
        )}

        {/* State B: Gym Not Found Screen */}
        {loadState === 'not_found' && (
          <div className="dynamic-gym-card dynamic-gym-not-found">
            <div className="dynamic-gym-not-found-icon">
              <AlertCircle size={32} />
            </div>
            <h2 className="dynamic-gym-not-found-title">Gym Portal Not Found</h2>
            <p className="dynamic-gym-not-found-desc">
              We couldn't locate a gym registered with the address <strong>/gym/{slug}</strong>.
              Please check the URL or contact your platform administrator.
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

        {/* State C: Branded Gym Login Screen */}
        {loadState === 'ready' && (
          <div className="dynamic-gym-card">
            {/* Header / Gym Branding */}
            <div className="dynamic-gym-header">
              <div className="dynamic-gym-logo-wrapper">
                {gym?.logo_url && !logoFailed ? (
                  <img
                    src={gym.logo_url}
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
                {gym?.name || 'FiftyFifty Gym'}
              </div>

              <h1 className="dynamic-gym-title">Welcome Back</h1>
              <p className="dynamic-gym-subtitle">
                Sign in to manage your gym portal and members
              </p>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="dynamic-gym-alert error">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="dynamic-gym-form" noValidate>
              {/* Email Field */}
              <div className="dynamic-gym-field">
                <label className="dynamic-gym-label" htmlFor="gym-owner-email">
                  Owner Email or Mobile Number
                </label>
                <div className="dynamic-gym-input-wrapper">
                  <Mail size={18} className="dynamic-gym-input-icon" />
                  <input
                    id="gym-owner-email"
                    type="text"
                    name="email"
                    autoComplete="username"
                    required
                    placeholder="e.g. owner@pranavfitness.com or 9876543210"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="dynamic-gym-input"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="dynamic-gym-field">
                <div className="dynamic-gym-label-row">
                  <label className="dynamic-gym-label" htmlFor="gym-owner-password">
                    Password
                  </label>
                  <button
                    type="button"
                    className="dynamic-gym-forgot-btn"
                    onClick={handleOpenForgotModal}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="dynamic-gym-input-wrapper">
                  <Lock size={18} className="dynamic-gym-input-icon" />
                  <input
                    id="gym-owner-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                className="dynamic-gym-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Signing in to Portal...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Gym Portal</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Footer Navigation & Security */}
            <div className="dynamic-gym-footer">
              <Link to={`/gym/${slug}`} className="dynamic-gym-portal-link">
                <ArrowLeft size={14} />
                <span>Back to {gym?.name || 'Gym'} Public Portal</span>
              </Link>

              <div className="dynamic-gym-security-badge">
                <Shield size={13} color="#FF6B00" />
                <span>Protected by LeopardxGyms RBAC & 256-bit SSL</span>
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
        initialRole="GYM_OWNER"
      />
    </div>
  );
};

export default DynamicGymLoginScreen;
