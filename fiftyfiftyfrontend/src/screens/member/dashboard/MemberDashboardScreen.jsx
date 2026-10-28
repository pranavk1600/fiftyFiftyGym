import React from 'react';
import { Dumbbell } from 'lucide-react';
import { Badge } from '../../../shared/components/Badge/Badge';
import { formatDate } from '../../../shared/utils/formatters';

export const MemberDashboardScreen = () => {
  const membershipInfo = {
    planName: 'Quarterly Pro Membership',
    startDate: '2026-01-15',
    expiryDate: '2026-04-15',
    status: 'active',
    visitsThisMonth: 14,
    totalVisits: 38,
    daysLeft: 22
  };

  return (
    <div className="animate-fade-in">
      {/* Current Membership Hero Card */}
      <div className="member-card-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              CURRENT MEMBERSHIP
            </span>
            <div className="member-plan-name">{membershipInfo.planName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <Badge status={membershipInfo.status}>{membershipInfo.status} Member</Badge>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {membershipInfo.daysLeft} days remaining
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gym Location</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>FiftyFifty Downtown Fitness</div>
          </div>
        </div>

        <div className="member-hero-grid">
          <div className="member-hero-stat-card">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Start Date</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
              {formatDate(membershipInfo.startDate)}
            </div>
          </div>

          <div className="member-hero-stat-card">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Valid Until (Expiry)</div>
            <div style={{ fontWeight: 600, color: 'var(--brand-accent)', marginTop: 2 }}>
              {formatDate(membershipInfo.expiryDate)}
            </div>
          </div>

          <div className="member-hero-stat-card">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Visits This Month</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
              {membershipInfo.visitsThisMonth} Sessions
            </div>
          </div>

          <div className="member-hero-stat-card">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Check-ins</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
              {membershipInfo.totalVisits} Workouts
            </div>
          </div>
        </div>
      </div>

      {/* Motivational Card */}
      <div style={{
        background: 'var(--bg-surface)',
        padding: 24,
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 'var(--radius-md)',
          background: 'var(--brand-primary-soft)',
          color: 'var(--brand-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Dumbbell size={24} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 4, color: 'var(--text-primary)' }}>Workout Motivation</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.5 }}>
            "Consistency is what transforms average into excellence. 14 workouts completed this month — keep pushing your limits!"
          </p>
        </div>
      </div>
    </div>
  );
};

export default MemberDashboardScreen;
