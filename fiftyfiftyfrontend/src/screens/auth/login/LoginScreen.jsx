import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Button } from '../../../shared/components/Button/Button';
import { Input } from '../../../shared/components/Input/Input';
import { CommonLoginModal } from '../../../shared/components/CommonLoginModal/CommonLoginModal';
import { apiClient } from '../../../shared/services/apiClient';
import '../../../styles/screens/auth/login.css';

export const LoginScreen = ({ defaultRole }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

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
            onClick={() => setIsForgotModalOpen(true)}
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

      {/* Forgot Password OTP Modal */}
      <CommonLoginModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        startInForgot={true}
        initialEmail={email}
        initialRole={defaultRole || 'GYM_OWNER'}
      />
    </>
  );
};

export default LoginScreen;
