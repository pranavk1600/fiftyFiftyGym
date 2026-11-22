import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, MapPin, Building, Shield, KeyRound,
  CheckCircle, AlertCircle, RefreshCw, Eye, EyeOff, Lock, X
} from 'lucide-react';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Button } from '../../../shared/components/Button/Button';
import { apiClient } from '../../../shared/services/apiClient';
import '../styles/ownerProfileModal.css';

export const OwnerProfileModal = ({ isOpen, onClose, user }) => {
  const [profile, setProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Change Password State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Status and error messages
  const [feedback, setFeedback] = useState({ type: null, message: '' });

  // Fetch full enriched profile
  const fetchProfile = async () => {
    setIsLoadingProfile(true);
    try {
      const res = await apiClient.get('/auth/profile');
      const data = res.data?.data || res.data;
      if (data) {
        setProfile(data);
      }
    } catch (_err) {
      // Fallback to layout user
      if (user) {
        setProfile({
          fullName: user.fullName || 'Gym Owner',
          email: user.email,
          role: 'Gym Owner',
          gym: { name: user.gymName || 'FiftyFifty Gym' }
        });
      }
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
      // Reset form states
      setIsChangingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      setOtpSent(false);
      setFeedback({ type: null, message: '' });
      setResendTimer(0);
    }
  }, [isOpen]);

  // Resend countdown timer
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Handle Request OTP
  const handleRequestOtp = async () => {
    setFeedback({ type: null, message: '' });

    if (!newPassword || newPassword.length < 8) {
      setFeedback({ type: 'error', message: 'Password must be at least 8 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'Passwords do not match. Please re-enter.' });
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await apiClient.post('/auth/send-password-otp');
      const data = res.data?.data || res.data;
      setOtpSent(true);
      setMaskedEmail(data?.email || profile?.email || 'your email');
      setResendTimer(30);
      setFeedback({
        type: 'success',
        message: `Verification code sent to ${data?.email || profile?.email || 'your email'}. Check your inbox!`
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to dispatch verification code.'
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Handle Verify OTP & Change Password
  const handleUpdatePassword = async () => {
    setFeedback({ type: null, message: '' });

    if (!otp || otp.trim().length !== 6) {
      setFeedback({ type: 'error', message: 'Please enter the 6-digit verification code.' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await apiClient.post('/auth/change-password-with-otp', {
        otp: otp.trim(),
        newPassword
      });

      setFeedback({
        type: 'success',
        message: 'Password changed successfully! You can continue using your account.'
      });
      // Reset inputs after 2 seconds
      setTimeout(() => {
        setIsChangingPassword(false);
        setNewPassword('');
        setConfirmPassword('');
        setOtp('');
        setOtpSent(false);
      }, 2000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Verification failed. Please check the code.'
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (!isOpen) return null;

  const displayName = profile?.fullName || user?.fullName || 'Gym Owner';
  const displayEmail = profile?.email || user?.email || 'owner@fiftyfiftygym.com';
  const initial = displayName.charAt(0).toUpperCase();
  const gymData = profile?.gym || {};

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gym Owner Profile & Account"
      maxWidth={580}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="secondary" onClick={onClose} size="sm" style={{ padding: '7px 18px' }}>
            Close
          </Button>
        </div>
      }
    >
      <div className="opm-container">
        {/* Top Header Card */}
        <div className="opm-header-card">
          <div className="opm-avatar">
            {initial}
          </div>
          <div className="opm-header-info">
            <div className="opm-name-row">
              <h3 className="opm-name">{displayName}</h3>
              <span className="opm-badge">Gym Owner</span>
            </div>
            <div className="opm-email-row">
              <Mail size={14} className="opm-icon" />
              <span>{displayEmail}</span>
            </div>
          </div>
        </div>

        {/* Facility Information Card */}
        <div className="opm-section-card">
          <div className="opm-card-title">
            <Building size={16} className="opm-card-title-icon" />
            <span>Gym Facility Information</span>
          </div>

          <div className="opm-grid">
            <div className="opm-grid-item">
              <span className="opm-label">Gym Facility Name</span>
              <span className="opm-value">{gymData.name || 'FiftyFifty Gym'}</span>
            </div>

            {gymData.slug && (
              <div className="opm-grid-item">
                <span className="opm-label">Facility Slug</span>
                <span className="opm-value">/{gymData.slug}</span>
              </div>
            )}

            {gymData.phone && (
              <div className="opm-grid-item">
                <span className="opm-label">Contact Phone</span>
                <span className="opm-value">{gymData.phone}</span>
              </div>
            )}

            {(gymData.address || gymData.city) && (
              <div className="opm-grid-item opm-grid-full">
                <span className="opm-label">Location / Address</span>
                <span className="opm-value">
                  {[gymData.address, gymData.city, gymData.state].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Security & Password Card */}
        <div className="opm-section-card">
          <div className="opm-card-title-between">
            <div className="opm-card-title" style={{ margin: 0 }}>
              <Shield size={16} className="opm-card-title-icon" />
              <span>Security & Credentials</span>
            </div>

            {!isChangingPassword && (
              <button
                type="button"
                className="opm-action-btn"
                onClick={() => {
                  setIsChangingPassword(true);
                  setFeedback({ type: null, message: '' });
                }}
              >
                <KeyRound size={14} />
                <span>Change Password</span>
              </button>
            )}
          </div>

          {/* Collapsible Change Password Box */}
          {isChangingPassword ? (
            <div className="opm-password-box">
              <div className="opm-password-header">
                <div>
                  <h4 className="opm-password-title">Update Your Password</h4>
                  <p className="opm-password-subtitle">
                    For your security, a 6-digit verification code will be sent to your registered email.
                  </p>
                </div>
                <button
                  type="button"
                  className="opm-cancel-text-btn"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setOtpSent(false);
                    setFeedback({ type: null, message: '' });
                  }}
                >
                  Cancel
                </button>
              </div>

              {/* Feedback Alert */}
              {feedback.message && (
                <div className={`opm-alert ${feedback.type === 'success' ? 'opm-alert-success' : 'opm-alert-error'}`}>
                  {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  <span>{feedback.message}</span>
                </div>
              )}

              {!otpSent ? (
                /* Step 1: Password inputs & Send OTP */
                <div className="opm-form-fields">
                  <div className="opm-field-group">
                    <label className="opm-field-label">New Password</label>
                    <div className="opm-input-wrapper">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="opm-input"
                        placeholder="At least 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="opm-eye-btn"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="opm-field-group">
                    <label className="opm-field-label">Confirm New Password</label>
                    <div className="opm-input-wrapper">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="opm-input"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="opm-button-row">
                    <Button
                      onClick={handleRequestOtp}
                      disabled={isSendingOtp || !newPassword || !confirmPassword}
                      style={{ width: '100%' }}
                    >
                      {isSendingOtp ? (
                        <>
                          <RefreshCw size={15} className="spin" />
                          <span>Sending Verification Code...</span>
                        </>
                      ) : (
                        <>
                          <Mail size={15} />
                          <span>Send OTP to Email</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Step 2: Enter OTP & Confirm */
                <div className="opm-form-fields">
                  <div className="opm-field-group">
                    <label className="opm-field-label">
                      6-Digit Verification Code (OTP)
                    </label>
                    <div className="opm-input-wrapper">
                      <input
                        type="text"
                        maxLength={6}
                        className="opm-input opm-otp-input"
                        placeholder="• • • • • •"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        autoFocus
                      />
                      <Lock size={15} className="opm-input-inner-icon" />
                    </div>
                  </div>

                  <div className="opm-otp-actions">
                    <button
                      type="button"
                      className="opm-resend-btn"
                      onClick={handleRequestOtp}
                      disabled={resendTimer > 0 || isSendingOtp}
                    >
                      {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend Code'}
                    </button>
                  </div>

                  <div className="opm-button-row">
                    <Button
                      onClick={handleUpdatePassword}
                      disabled={isUpdatingPassword || otp.length !== 6}
                      style={{ width: '100%' }}
                    >
                      {isUpdatingPassword ? (
                        <>
                          <RefreshCw size={15} className="spin" />
                          <span>Verifying & Updating...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={15} />
                          <span>Verify OTP & Change Password</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="opm-security-status">
              <span className="opm-status-text">
                Password protected with bcrypt encryption. You can change your password anytime with email verification.
              </span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OwnerProfileModal;
