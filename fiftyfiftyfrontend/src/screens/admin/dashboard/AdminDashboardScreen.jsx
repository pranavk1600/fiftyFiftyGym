import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  ShieldCheck,
  Database,
  ArrowRight,
  Settings,
  Sparkles
} from 'lucide-react';
import { Button } from '../../../shared/components/Button/Button';
import { useAuth } from '../../../context/AuthContext';

export const AdminDashboardScreen = () => {
  const { user } = useAuth();

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1080, margin: '0 auto', padding: '8px 0 32px' }}>
      {/* Welcome Hero Banner */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 20,
        padding: '36px 32px',
        marginBottom: 28,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24
      }}>
        <div style={{ maxWidth: 620 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--brand-primary-light, #FFF7ED)',
            color: 'var(--brand-primary, #FF6B00)',
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: 16
          }}>
            <Sparkles size={14} />
            <span>Platform Administration</span>
          </div>

          <h1 style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 10px',
            letterSpacing: '-0.02em'
          }}>
            Welcome to Super Admin
          </h1>

          <p style={{
            fontSize: '1.05rem',
            color: 'var(--text-secondary)',
            margin: '0 0 24px',
            lineHeight: 1.55
          }}>
            Manage your gym profile and application settings from one place.
          </p>

          <Link to="/admin/gyms" style={{ textDecoration: 'none' }}>
            <Button style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 22px',
              fontSize: '0.95rem',
              fontWeight: 600
            }}>
              <span>Go to Gym Management</span>
              <ArrowRight size={17} />
            </Button>
          </Link>
        </div>

        <div style={{
          width: 80,
          height: 80,
          borderRadius: 22,
          background: 'var(--brand-primary-light, #FFF7ED)',
          color: 'var(--brand-primary, #FF6B00)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Settings size={40} />
        </div>
      </div>

      {/* Administrative Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 20
      }}>
        {/* Module Card: Gym Management */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 18,
          padding: 26,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: 'var(--brand-primary-light, #FFF7ED)',
              color: 'var(--brand-primary, #FF6B00)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <Building2 size={24} />
            </div>

            <h2 style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 8px'
            }}>
              Gym Management
            </h2>

            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              margin: '0 0 20px'
            }}>
              View and update your gym's official profile, logo, address, operating hours, and business contact information.
            </p>
          </div>

          <Link to="/admin/gyms" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" className="w-full" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}>
              <span>Manage Gym Profile</span>
              <ArrowRight size={15} />
            </Button>
          </Link>
        </div>

        {/* Security & Access Card */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 18,
          padding: 26,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: 'var(--brand-primary-light, #FFF7ED)',
              color: 'var(--brand-primary, #FF6B00)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <ShieldCheck size={24} />
            </div>

            <h2 style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 8px'
            }}>
              Super Admin Access
            </h2>

            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              margin: '0 0 20px'
            }}>
              Authenticated as <strong>{user?.email || 'Super Admin'}</strong> with system-wide administrative authorization.
            </p>
          </div>

          <div style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: '0.825rem',
            color: 'var(--color-success, #16A34A)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <span>●</span>
            <span>Role: SUPER_ADMIN</span>
          </div>
        </div>

        {/* Database & Infrastructure Card */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 18,
          padding: 26,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: 'var(--brand-primary-light, #FFF7ED)',
              color: 'var(--brand-primary, #FF6B00)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <Database size={24} />
            </div>

            <h2 style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 8px'
            }}>
              Database Connectivity
            </h2>

            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              margin: '0 0 20px'
            }}>
              Direct connection to Supabase PostgreSQL with TLS/SSL encryption and connection pooling.
            </p>
          </div>

          <div style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: '0.825rem',
            color: 'var(--color-success, #16A34A)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <span>●</span>
            <span>Status: Connected to Supabase</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardScreen;
