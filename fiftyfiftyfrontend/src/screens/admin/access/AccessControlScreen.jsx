import React, { useState } from 'react';
import { Shield, ShieldCheck, Check } from 'lucide-react';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Button } from '../../../shared/components/Button/Button';
import { useToast } from '../../../context/ToastContext';

export const AccessControlScreen = () => {
  const { showToast } = useToast();

  const [roles] = useState([
    {
      role: 'PLATFORM_ADMIN',
      title: 'Platform Super Admin',
      usersCount: 3,
      description: 'Full global system administration, gym tenant onboarding, security controls',
      permissions: ['Global Multi-Gym View', 'Tenant Onboarding & Suspension', 'Database Management', 'Security Audit Logs']
    },
    {
      role: 'GYM_OWNER',
      title: 'Gym Owner & Director',
      usersCount: 28,
      description: 'Complete branch operational control, financial records, plan management',
      permissions: ['Member Management', 'Financial Receipts & Collections', 'Plan Pricing & Setup', 'Staff Access Delegation']
    },
    {
      role: 'MEMBER',
      title: 'Gym Member',
      usersCount: 4120,
      description: 'Self-service portal for attendance check-ins, fee receipts, workout logs',
      permissions: ['View Active Membership', 'Personal Check-in Logs', 'Download Receipts', 'Update Profile']
    }
  ]);

  const handleUpdatePolicy = () => {
    showToast('RBAC security policies re-validated and active', 'success');
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: 4, color: 'var(--text-primary)' }}>Access Control & Security (RBAC)</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Configure Role-Based Access Control policies and permissions across FiftyFifty Gym
          </p>
        </div>
        <Button onClick={handleUpdatePolicy}>
          <ShieldCheck size={18} />
          <span>Enforce Security Matrix</span>
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {roles.map((r) => (
          <div
            key={r.role}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              padding: 28,
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                background: r.role === 'PLATFORM_ADMIN' ? 'var(--brand-secondary-bg)' : r.role === 'GYM_OWNER' ? 'var(--brand-primary-soft)' : 'var(--color-success-bg)',
                color: r.role === 'PLATFORM_ADMIN' ? 'var(--brand-secondary)' : r.role === 'GYM_OWNER' ? 'var(--brand-primary)' : 'var(--brand-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Shield size={22} />
              </div>
              <Badge status={r.role === 'PLATFORM_ADMIN' ? 'info' : 'active'}>
                {r.usersCount} Active Users
              </Badge>
            </div>

            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: 4 }}>{r.title}</h3>
            <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{r.role}</span>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '14px 0', lineHeight: 1.5 }}>
              {r.description}
            </p>

            <div style={{ flex: 1, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                GRANTED PRIVILEGES:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {r.permissions.map((p, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    <Check size={14} color="var(--brand-accent)" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccessControlScreen;
