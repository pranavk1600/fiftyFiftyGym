import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Button } from '../../../shared/components/Button/Button';
import { Input } from '../../../shared/components/Input/Input';
import { apiClient } from '../../../shared/services/apiClient';
import { Dumbbell, ArrowRight, Info } from 'lucide-react';
import '../../../styles/screens/auth/login.css';

export const GymAdminLoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, role } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // If already authenticated as Gym Owner, forward straight to owner dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const normalizedRole = (role || '').toUpperCase();
      if (normalizedRole === 'GYM_OWNER') {
        navigate('/owner/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, role, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Authenticate via dedicated Gym Admin endpoint with portal constraint
      const response = await apiClient.post('/auth/admin/login', {
        email: email.trim(),
        password,
        portal: 'GYM_ADMIN'
      });
      const { user, token } = response.data || response;

      const userRole = (user.role || '').toUpperCase();
      if (userRole !== 'GYM_OWNER') {
        showToast('Access denied: Only Gym Administrators / Owners can sign in here.', 'danger');
        return;
      }

      login(user, token);
      showToast(`Welcome back, ${user.fullName || 'Gym Owner'}!`, 'success');
      navigate('/owner/dashboard', { replace: true });
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Invalid email or password';
      showToast(errorMsg, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      {/* Gym Admin Badge Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        background: 'var(--brand-primary-soft, #FFF3E8)',
        border: '1px solid var(--brand-primary-soft-border, rgba(255, 107, 0, 0.25))',
        borderRadius: 8,
        padding: '8px 12px',
        marginBottom: 20,
        color: 'var(--brand-primary, #FF6B00)',
        fontSize: '0.825rem',
        fontWeight: 700,
        letterSpacing: '0.02em',
        textTransform: 'uppercase'
      }}>
        <Dumbbell size={16} />
        <span>Gym Admin & Owner Portal</span>
      </div>

      {/* Helpful note for newly invited gym owners */}
      <div style={{
        background: 'var(--bg-surface-elevated, #F1F5F9)',
        border: '1px solid var(--border-subtle, #E2E8F0)',
        borderRadius: 'var(--radius-md, 10px)',
        padding: '10px 12px',
        marginBottom: 18,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        fontSize: '0.8rem',
        color: 'var(--text-secondary, #64748B)',
        lineHeight: 1.45
      }}>
        <Info size={16} color="var(--brand-primary, #FF6B00)" style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          Received a gym invitation? Use the temporary credentials sent to your email to log in.
        </span>
      </div>

      <Input
        label="Gym Admin / Owner Email"
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="owner@yourgym.com"
        required
      />

      <Input
        label="Password"
        name="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <div style={{
        background: 'var(--bg-surface-elevated, #F1F5F9)',
        padding: '10px 14px',
        borderRadius: 'var(--radius-md, 10px)',
        marginBottom: 18,
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: '1px solid var(--border-subtle, #E2E8F0)'
      }}>
        <span style={{ color: 'var(--text-secondary, #64748B)' }}>Target Destination:</span>
        <span style={{ fontWeight: 700, color: 'var(--brand-primary, #FF6B00)' }}>
          🏋️ Operations Dashboard (/owner/dashboard)
        </span>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Authenticating...' : 'Sign In to Gym Portal'}
      </Button>

      {/* Link to Super Admin Console */}
      <div style={{
        marginTop: 20,
        paddingTop: 16,
        borderTop: '1px solid var(--border-subtle, #E2E8F0)',
        textAlign: 'center',
        fontSize: '0.85rem'
      }}>
        <span style={{ color: 'var(--text-secondary, #64748B)' }}>Platform Administrator? </span>
        <Link
          to="/superadmin/login"
          style={{
            color: 'var(--brand-secondary, #0284C7)',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <span>Super Admin Console</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="login-form-footer">
        <span>Protected by FiftyFifty Enterprise Gym Security</span>
      </div>
    </form>
  );
};

export default GymAdminLoginScreen;
