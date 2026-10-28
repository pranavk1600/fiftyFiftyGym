import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '../../../shared/components/Button/Button';
import { Input } from '../../../shared/components/Input/Input';
import { useToast } from '../../../context/ToastContext';
import { apiClient } from '../../../shared/services/apiClient';

export const ResetPasswordScreen = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isVerifying, setIsVerifying] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Verify token on component mount
  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setIsTokenValid(false);
      setTokenError('No password reset token was provided in the link.');
      return;
    }

    const verifyToken = async () => {
      try {
        await apiClient.get(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
        setIsTokenValid(true);
      } catch (err) {
        setIsTokenValid(false);
        setTokenError(err.message || 'This password reset link is invalid, expired, or has already been used.');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (newPassword.length < 8) {
      setValidationError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        newPassword
      });

      setIsSuccess(true);
      showToast('Password has been reset successfully!', 'success');
    } catch (err) {
      console.error('Password reset failed:', err);
      setValidationError(err.message || 'Failed to reset password. Please try again or request a new link.');
      showToast(err.message || 'Reset failed', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isVerifying) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '3px solid var(--border-subtle)',
          borderTopColor: 'var(--brand-primary, #FF6B00)',
          margin: '0 auto 16px',
          animation: 'spin 0.8s linear infinite'
        }} />
        <h2 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: 6 }}>
          Verifying Reset Link...
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Please wait while we validate your security token.
        </p>
      </div>
    );
  }

  if (!isTokenValid) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--color-danger-light, #FEE2E2)',
          color: 'var(--color-danger, #DC2626)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <AlertCircle size={32} />
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
          Reset Link Expired or Invalid
        </h2>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 24 }}>
          {tokenError || 'This password reset link is invalid, has expired, or has already been used.'}
        </p>

        <Link to="/superadmin/login" style={{ textDecoration: 'none' }}>
          <Button className="w-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <ArrowLeft size={16} />
            <span>Return to Super Admin Login</span>
          </Button>
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--color-success-light, #DCFCE7)',
          color: 'var(--color-success, #16A34A)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <CheckCircle2 size={32} />
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
          Password Reset Successfully
        </h2>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 24 }}>
          Your Super Admin password has been updated in Supabase. You can now log in with your new credentials.
        </p>

        <Button onClick={() => navigate('/superadmin/login')} className="w-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span>Proceed to Super Admin Login</span>
          <ArrowRight size={16} />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
          Create New Password
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
          Please choose a strong, secure password for your Super Admin account.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {validationError && (
          <div style={{
            background: 'var(--color-danger-light, #FEE2E2)',
            border: '1px solid var(--color-danger, #DC2626)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            color: 'var(--color-danger, #DC2626)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <AlertCircle size={16} />
            <span>{validationError}</span>
          </div>
        )}

        <Input
          label="New Password"
          name="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
        />

        <Input
          label="Confirm New Password"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your new password"
          required
        />

        <div style={{
          background: 'var(--bg-surface-elevated)',
          padding: '10px 14px',
          borderRadius: 8,
          marginBottom: 20,
          border: '1px solid var(--border-subtle)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)'
        }}>
          <div>• Minimum 8 characters</div>
          <div>• Single-use security token (expires in 15 minutes)</div>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Updating Password...' : 'Reset Password'}
        </Button>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <Link to="/superadmin/login" style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}>
            <ArrowLeft size={14} />
            <span>Back to Super Admin Login</span>
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ResetPasswordScreen;
