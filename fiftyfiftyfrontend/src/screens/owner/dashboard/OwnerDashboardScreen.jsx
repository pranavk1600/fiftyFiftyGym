import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CalendarCheck,
  IndianRupee,
  AlertTriangle,
  UserPlus,
  Upload,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { StatCard } from '../../../shared/components/StatCard/StatCard';
import { formatCurrency } from '../../../shared/utils/formatters';
import { apiClient } from '../../../shared/services/apiClient';
import { useAuth } from '../../../context/AuthContext';

export const OwnerDashboardScreen = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    expiredMembers: 0,
    todayAttendance: 0,
    monthlyCollections: 0,
    expiringSoonCount: 0
  });

  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      let res;
      try {
        res = await apiClient.get('/dashboard');
      } catch (_e) {
        res = await apiClient.get('/owner/dashboard');
      }
      const data = res.data?.data || res.data;
      if (data && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.warn('[Dashboard Fetch Notice]:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute active member percentage
  const activeRate = stats.totalMembers > 0
    ? Math.round((stats.activeMembers / stats.totalMembers) * 100)
    : 0;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      {/* Top Executive Header */}
      <div className="dashboard-header-container">
        <div className="dashboard-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1>Gym Operations Dashboard</h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px',
              borderRadius: 20,
              background: 'var(--color-success-bg)',
              color: 'var(--color-success)',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: '1px solid var(--color-success-border)'
            }}>
              ● Live System
            </span>
          </div>
          <p>
            Real-time analytics, member throughput, and financial metrics for{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{user?.gymName || 'your gym'}</strong>
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="dashboard-header-actions">
          <button
            type="button"
            onClick={() => navigate('/owner/members')}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
          >
            <Upload size={14} />
            <span>Import CSV</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/owner/attendance')}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
          >
            <CalendarCheck size={14} />
            <span>Mark Attendance</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/owner/members')}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            <UserPlus size={14} />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* 4-Column Responsive Modern KPI Cards Grid */}
      <div className="owner-dashboard-grid">
        {isLoading ? (
          <>
            <div className="stat-card skeleton-shimmer" style={{ height: 100 }} />
            <div className="stat-card skeleton-shimmer" style={{ height: 100 }} />
            <div className="stat-card skeleton-shimmer" style={{ height: 100 }} />
            <div className="stat-card skeleton-shimmer" style={{ height: 100 }} />
          </>
        ) : (
          <>
            <StatCard
              title="Total Registered Members"
              value={stats.totalMembers}
              subtitle={`${stats.activeMembers} Active • ${stats.expiredMembers} Expired`}
              icon={Users}
            />
            <StatCard
              title="Today's Attendance"
              value={stats.todayAttendance}
              subtitle="Daily check-ins verified"
              icon={CalendarCheck}
            />
            <StatCard
              title="Monthly Collections"
              value={formatCurrency(stats.monthlyCollections)}
              subtitle="Collected this calendar month"
              icon={IndianRupee}
            />
            <StatCard
              title="Expiring Within 7 Days"
              value={stats.expiringSoonCount}
              subtitle="Members due for renewal"
              icon={AlertTriangle}
            />
          </>
        )}
      </div>

      {/* 2-Column Analytics & Operational Shortcuts Section */}
      <div className="owner-dashboard-sections">
        {/* Left Column: Membership Health & Retention Metrics */}
        <div className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2 className="dashboard-panel-title">Membership Health & Retention</h2>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                Current distribution of active vs expiring subscriptions
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/owner/members')}
              className="dashboard-panel-action"
            >
              <span>View All Members</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Retention Progress Bar */}
          <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border-subtle)', marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Active Member Ratio
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
                {activeRate}% Active
              </span>
            </div>
            <div style={{
              width: '100%',
              height: 10,
              background: 'var(--bg-surface-elevated)',
              borderRadius: 6,
              overflow: 'hidden',
              display: 'flex'
            }}>
              <div
                style={{
                  width: `${activeRate}%`,
                  background: 'linear-gradient(90deg, var(--brand-primary) 0%, #16A34A 100%)',
                  borderRadius: 6,
                  transition: 'width 0.5s ease'
                }}
              />
            </div>
          </div>

          {/* Metrics Breakdown Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <div style={{
              padding: '14px',
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Active Members</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#16A34A', marginTop: 4 }}>
                {stats.activeMembers}
              </div>
            </div>

            <div style={{
              padding: '14px',
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Expired Subscriptions</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-muted)', marginTop: 4 }}>
                {stats.expiredMembers}
              </div>
            </div>

            <div style={{
              padding: '14px',
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Expiring Soon</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#D97706', marginTop: 4 }}>
                {stats.expiringSoonCount}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Operational Quick Access & Modules */}
        <div className="dashboard-side-column">
          <div className="dashboard-panel">
            <h2 className="dashboard-panel-title" style={{ marginBottom: 14 }}>
              Operational Quick Access
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                onClick={() => navigate('/owner/members')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                className="shortcut-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'var(--brand-primary-soft)',
                    color: 'var(--brand-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Users size={16} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.875rem' }}>Member Directory</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Search, edit & CSV bulk import</div>
                  </div>
                </div>
                <ArrowRight size={15} color="var(--text-muted)" />
              </div>

              <div
                onClick={() => navigate('/owner/attendance')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                className="shortcut-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'var(--color-success-bg)',
                    color: 'var(--color-success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CalendarCheck size={16} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.875rem' }}>Attendance Terminal</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Instant member check-ins</div>
                  </div>
                </div>
                <ArrowRight size={15} color="var(--text-muted)" />
              </div>

              <div
                onClick={() => navigate('/owner/plans')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                className="shortcut-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(37, 99, 235, 0.1)',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CreditCard size={16} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.875rem' }}>Membership Plans</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Configure duration & pricing</div>
                  </div>
                </div>
                <ArrowRight size={15} color="var(--text-muted)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboardScreen;
