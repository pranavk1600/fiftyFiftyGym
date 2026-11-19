import React, { useState } from 'react';
import { Input } from '../../../shared/components/Input/Input';
import { Button } from '../../../shared/components/Button/Button';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

export const MemberProfileScreen = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    showToast('Profile information successfully updated', 'success');
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast('Please provide current and new password', 'warning');
      return;
    }
    showToast('Password successfully changed!', 'success');
    setCurrentPassword('');
    setNewPassword('');
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.85rem', marginBottom: 4, color: 'var(--text-primary)' }}>Account Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your personal details, emergency contact, and password security</p>
      </div>

      {/* Personal Info Card */}
      <div style={{
        background: 'var(--bg-surface)',
        padding: 28,
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 24
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: 20, color: 'var(--text-primary)' }}>Personal Information</h2>
        <form onSubmit={handleUpdateProfile}>
          <Input
            label="Full Name"
            name="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            label="Phone Number"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <Input
            label="Email Address"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit">Save Profile Changes</Button>
        </form>
      </div>

      {/* Password Change Card */}
      <div style={{
        background: 'var(--bg-surface)',
        padding: 28,
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: 20, color: 'var(--text-primary)' }}>Security & Password</h2>
        <form onSubmit={handleChangePassword}>
          <Input
            label="Current Password"
            name="currentPassword"
            type="password"
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label="New Password"
            name="newPassword"
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button type="submit" variant="secondary">Update Password</Button>
        </form>
      </div>
    </div>
  );
};

export default MemberProfileScreen;
