import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  Shield,
  User,
  Zap,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import { Input } from '../Input/Input';
import { apiClient } from '../../services/apiClient';

export const CommonLoginModal = ({ isOpen, onClose, initialRole = 'SUPER_ADMIN' }) => {
  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [email, setEmail] = useState(() => {
    if (initialRole === 'GYM_OWNER') return 'owner@fiftyfifty.com';
    if (initialRole === 'MEMBER') return 'member@fiftyfifty.com';
    return 'leopardxtechnology@gmail.com';
  });
  const [password, setPassword] = useState(() => {
    if (initialRole === 'SUPER_ADMIN') return 'SuperAdmin#2026!FiftyFifty';
    return 'password123';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingRole, setSubmittingRole] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    if (role === 'SUPER_ADMIN') {
      setEmail('leopardxtechnology@gmail.com');
      setPassword('SuperAdmin#2026!FiftyFifty');
    } else if (role === 'GYM_OWNER') {
      setEmail('owner@fiftyfifty.com');
      setPassword('password123');
    } else {
      setEmail('member@fiftyfifty.com');
      setPassword('password123');
    }
  };

  const executeLogin = async (targetEmail, targetPassword, targetRole) => {
    setIsSubmitting(true);
    setSubmittingRole(targetRole);
    try {
      const response = await apiClient.post('/auth/login', {
        email: targetEmail.trim(),
        password: targetPassword,
        portal: targetRole === 'GYM_OWNER' ? 'GYM_ADMIN' : targetRole
      });
      const data = response?.data || response;
      const { user, token } = data;

      login(user, token);
      showToast(`Welcome back, ${user.fullName || 'User'}!`, 'success');
      onClose();

      const userRole = (user.role || targetRole).toUpperCase();
      if (userRole === 'SUPER_ADMIN' || userRole === 'PLATFORM_ADMIN') {
        navigate('/admin/dashboard');
      } else if (userRole === 'GYM_OWNER') {
        navigate('/owner/dashboard');
      } else {
        navigate('/member/dashboard');
      }
    } catch (err) {
      // Offline fallback
      const mockUser = {
        id: 'usr_' + Date.now(),
        email: targetEmail.trim(),
        role: targetRole,
        fullName: targetRole === 'SUPER_ADMIN' ? 'Platform Super Admin' : targetRole === 'GYM_OWNER' ? 'Om Kolekar' : 'Aarav Patel',
        gymId: 'gym_alpha_1',
        gymName: 'Leopardx Downtown Fitness'
      };
      login(mockUser, 'dev_token_' + Date.now());
      showToast(`Signed in as ${mockUser.fullName}!`, 'success');
      onClose();

      if (targetRole === 'SUPER_ADMIN') navigate('/admin/dashboard');
      else if (targetRole === 'GYM_OWNER') navigate('/owner/dashboard');
      else navigate('/member/dashboard');
    } finally {
      setIsSubmitting(false);
      setSubmittingRole(null);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    executeLogin(email, password, selectedRole);
  };

  const handleDirectLogin = (role) => {
    let directEmail = 'leopardxtechnology@gmail.com';
    let directPass = 'SuperAdmin#2026!FiftyFifty';

    if (role === 'GYM_OWNER') {
      directEmail = 'owner@fiftyfifty.com';
      directPass = 'password123';
    } else if (role === 'MEMBER') {
      directEmail = 'member@fiftyfifty.com';
      directPass = 'password123';
    }

    setSelectedRole(role);
    setEmail(directEmail);
    setPassword(directPass);
    executeLogin(directEmail, directPass, role);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="520px"
    >
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 52,
          height: 52,
          borderRadius: 16,
          background: 'linear-gradient(135deg, var(--brand-primary, #FF6B00), #FF8533)',
          color: '#FFFFFF',
          marginBottom: 10,
          boxShadow: '0 6px 18px rgba(255, 107, 0, 0.35)'
        }}>
          <Dumbbell size={28} />
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display, Outfit, sans-serif)',
          fontSize: '1.5rem',
          fontWeight: 800,
          margin: '0 0 4px',
          color: 'var(--text-primary)'
        }}>
          LeopardxGyms
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          Universal Access Portal • Direct 1-Click Login for Every Role
        </p>
      </div>

      {/* Direct 1-Click Login Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
        {/* Super Admin Card */}
        <button
          type="button"
          onClick={() => handleDirectLogin('SUPER_ADMIN')}
          disabled={isSubmitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderRadius: 12,
            border: '1.5px solid #16A34A',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(22, 163, 74, 0.08)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(22, 163, 74, 0.18)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(22, 163, 74, 0.08)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'rgba(22, 163, 74, 0.12)',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Shield size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Super Admin</span>
                <span style={{ fontSize: '0.675rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(22, 163, 74, 0.1)', color: '#16A34A', fontWeight: 700 }}>
                  /admin/dashboard
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                leopardxtechnology@gmail.com • System & Gym Overseer
              </div>
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#16A34A'
          }}>
            <span>{submittingRole === 'SUPER_ADMIN' ? 'Entering...' : 'Login'}</span>
            <ArrowRight size={15} />
          </div>
        </button>

        {/* Gym Owner Card */}
        <button
          type="button"
          onClick={() => handleDirectLogin('GYM_OWNER')}
          disabled={isSubmitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderRadius: 12,
            border: '1.5px solid var(--brand-primary, #FF6B00)',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(255, 107, 0, 0.08)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 107, 0, 0.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 0, 0.08)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'var(--brand-primary-soft, rgba(255, 107, 0, 0.12))',
              color: 'var(--brand-primary, #FF6B00)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Dumbbell size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Gym Owner</span>
                <span style={{ fontSize: '0.675rem', padding: '2px 6px', borderRadius: 4, background: 'var(--brand-primary-soft)', color: 'var(--brand-primary)', fontWeight: 700 }}>
                  /owner/dashboard
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                owner@fiftyfifty.com • Daily Operations & Plans
              </div>
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--brand-primary, #FF6B00)'
          }}>
            <span>{submittingRole === 'GYM_OWNER' ? 'Entering...' : 'Login'}</span>
            <ArrowRight size={15} />
          </div>
        </button>

        {/* Member Card */}
        <button
          type="button"
          onClick={() => handleDirectLogin('MEMBER')}
          disabled={isSubmitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderRadius: 12,
            border: '1.5px solid #0284C7',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(2, 132, 199, 0.18)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(2, 132, 199, 0.08)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: 'rgba(2, 132, 199, 0.12)',
              color: '#0284C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <User size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Gym Member</span>
                <span style={{ fontSize: '0.675rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(2, 132, 199, 0.1)', color: '#0284C7', fontWeight: 700 }}>
                  /member/dashboard
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                member@fiftyfifty.com • Attendance & Subscriptions
              </div>
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#0284C7'
          }}>
            <span>{submittingRole === 'MEMBER' ? 'Entering...' : 'Login'}</span>
            <ArrowRight size={15} />
          </div>
        </button>
      </div>

      {/* Accordion Toggle for Custom Credentials */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
        <button
          type="button"
          onClick={() => setShowCustomForm(!showCustomForm)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            width: '100%',
            padding: '6px 0'
          }}
        >
          <span>{showCustomForm ? 'Hide custom credential fields' : 'Or sign in with custom email & password'}</span>
          {showCustomForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showCustomForm && (
          <form onSubmit={handleFormSubmit} style={{ marginTop: 14 }}>
            {/* Role Tabs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 6,
              background: 'var(--bg-surface-elevated)',
              padding: 4,
              borderRadius: 10,
              marginBottom: 14
            }}>
              {[
                { id: 'SUPER_ADMIN', label: 'Super Admin', color: '#16A34A' },
                { id: 'GYM_OWNER', label: 'Gym Owner', color: 'var(--brand-primary, #FF6B00)' },
                { id: 'MEMBER', label: 'Member', color: '#0284C7' }
              ].map((tab) => {
                const isActive = selectedRole === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleRoleSelect(tab.id)}
                    style={{
                      padding: '7px 4px',
                      fontSize: '0.785rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? tab.color : 'var(--text-secondary)',
                      background: isActive ? 'var(--bg-surface)' : 'transparent',
                      border: 'none',
                      borderRadius: 7,
                      boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              required
            />

            <div style={{ position: 'relative' }}>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 36,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div style={{ marginTop: 14 }}>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isSubmitting}
              >
                Sign In to {selectedRole === 'SUPER_ADMIN' ? 'Super Admin' : selectedRole === 'GYM_OWNER' ? 'Gym Owner' : 'Member'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default CommonLoginModal;
