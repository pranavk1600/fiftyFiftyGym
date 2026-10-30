import React, { useState, useEffect } from 'react';
import { Users, CalendarCheck, IndianRupee, AlertTriangle, ArrowRight, Clock, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from '../../../shared/components/StatCard/StatCard';
import { Badge } from '../../../shared/components/Badge/Badge';
import { formatCurrency } from '../../../shared/utils/formatters';
import { WeeklyAttendanceChart } from './components/WeeklyAttendanceChart';
import { apiClient } from '../../../shared/services/apiClient';

export const OwnerDashboardScreen = () => {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    expiredMembers: 0,
    todayAttendance: 0,
    monthlyCollections: 0,
    expiringSoonCount: 0
  });

  const [weeklyAttendanceData, setWeeklyAttendanceData] = useState([]);
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [expiringMemberships, setExpiringMemberships] = useState([]);
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
      if (data) {
        if (data.stats) setStats(data.stats);
        if (Array.isArray(data.weeklyAttendanceData)) setWeeklyAttendanceData(data.weeklyAttendanceData);
        if (Array.isArray(data.recentCheckIns)) setRecentCheckIns(data.recentCheckIns);
        if (Array.isArray(data.expiringMemberships)) setExpiringMemberships(data.expiringMemberships);
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

  return (
    <div className="animate-fade-in">
      {/* Top Header & Fast Action Shortcuts */}
      <div className="dashboard-header-container">
        <div className="dashboard-title-group">
          <h1>Gym Operations Dashboard</h1>
          <p>Real-time analytics, daily attendance throughput, and membership oversight</p>
        </div>
        <div className="dashboard-header-actions">
          <Link to="/owner/attendance" className="btn btn-primary">
            <CalendarCheck size={17} />
            <span>Mark Attendance</span>
          </Link>
          <Link to="/owner/members" className="btn btn-secondary">
            <Users size={17} />
            <span>Manage Members</span>
          </Link>
        </div>
      </div>

      {/* 4-Column Responsive Modern KPI Cards Grid */}
      <div className="owner-dashboard-grid">
        <StatCard
          title="Total Registered Members"
          value={stats.totalMembers}
          subtitle={`${stats.activeMembers} Active • ${stats.expiredMembers} Expired`}
          icon={Users}
        />
        <StatCard
          title="Today's Attendance"
          value={stats.todayAttendance}
          subtitle="Check-ins recorded today"
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
          subtitle="Members need renewal follow-up"
          icon={AlertTriangle}
        />
      </div>

      {/* 2-Column Professional Analytics Grid: Chart + Supporting Widgets */}
      <div className="owner-dashboard-sections">
        {/* Left Primary Column: Weekly Attendance Activity Chart */}
        <div className="dashboard-panel">
          <WeeklyAttendanceChart data={weeklyAttendanceData} />
        </div>

        {/* Right Secondary Column: Stacked Recent Check-ins & Upcoming Expirations */}
        <div className="dashboard-side-column">
          {/* Today's Recent Check-ins Card */}
          <div className="dashboard-panel">
            <div className="dashboard-panel-header">
              <h2 className="dashboard-panel-title">Today's Recent Check-ins</h2>
              <Link to="/owner/attendance" className="dashboard-panel-action">
                View All <ArrowRight size={14} />
              </Link>
            </div>

            <div className="recent-checkins-list">
              {recentCheckIns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No check-ins recorded today.
                </div>
              ) : (
                recentCheckIns.map((item) => (
                  <div key={item.id} className="recent-checkin-item">
                    <div className="recent-checkin-info">
                      <span className="recent-checkin-name">{item.name}</span>
                      <span className="recent-checkin-plan">{item.plan}</span>
                    </div>
                    <div className="recent-checkin-meta">
                      <span className="recent-checkin-time">
                        <Clock size={12} color="var(--text-muted)" /> {item.time}
                      </span>
                      <Badge status={item.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Expirations Card */}
          <div className="dashboard-panel">
            <div className="dashboard-panel-header">
              <h2 className="dashboard-panel-title">Upcoming Expirations</h2>
              <Link to="/owner/notifications" className="dashboard-panel-action">
                Alerts <ArrowRight size={14} />
              </Link>
            </div>

            <div className="expirations-list">
              {expiringMemberships.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No memberships expiring within the next 7 days.
                </div>
              ) : (
                expiringMemberships.map((item) => (
                  <div
                    key={item.id}
                    className={`expiration-item ${item.isUrgent ? 'urgent' : ''}`}
                  >
                    <div className="expiration-info">
                      <span className="expiration-name">{item.name}</span>
                      <span className="expiration-details">
                        {item.plan} • {item.phone}
                      </span>
                    </div>
                    <Badge status={item.isUrgent ? 'danger' : 'warning'}>
                      {item.daysLeft} days left
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboardScreen;
