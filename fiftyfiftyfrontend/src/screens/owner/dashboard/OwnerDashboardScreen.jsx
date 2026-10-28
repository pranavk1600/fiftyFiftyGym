import React from 'react';
import { Users, CalendarCheck, IndianRupee, AlertTriangle, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from '../../../shared/components/StatCard/StatCard';
import { Badge } from '../../../shared/components/Badge/Badge';
import { formatCurrency } from '../../../shared/utils/formatters';
import { WeeklyAttendanceChart } from './components/WeeklyAttendanceChart';

export const OwnerDashboardScreen = () => {
  // Operational dashboard KPI metrics
  const stats = {
    totalMembers: 148,
    activeMembers: 132,
    expiredMembers: 16,
    todayAttendance: 42,
    monthlyCollections: 185000,
    expiringSoonCount: 5
  };

  // 7-Day Attendance Activity records
  const weeklyAttendanceData = [
    { day: 'Mon', count: 48, fullDay: 'Monday' },
    { day: 'Tue', count: 52, fullDay: 'Tuesday' },
    { day: 'Wed', count: 45, fullDay: 'Wednesday' },
    { day: 'Thu', count: 58, fullDay: 'Thursday' },
    { day: 'Fri', count: 54, fullDay: 'Friday' },
    { day: 'Sat', count: 60, fullDay: 'Saturday' },
    { day: 'Sun', count: 32, fullDay: 'Sunday' }
  ];

  const recentCheckIns = [
    { id: 1, name: 'Rahul Sharma', time: '18:45', plan: 'Quarterly Pro', status: 'active' },
    { id: 2, name: 'Ananya Roy', time: '18:32', plan: 'Annual Gold Elite', status: 'active' },
    { id: 3, name: 'Vikram Singh', time: '17:50', plan: 'Monthly Standard', status: 'active' },
    { id: 4, name: 'Priya Patel', time: '17:15', plan: 'Annual Gold Elite', status: 'active' }
  ];

  const expiringMemberships = [
    { id: 101, name: 'Karan Mehra', daysLeft: 2, plan: 'Monthly Standard', phone: '+91 98765 43210', isUrgent: true },
    { id: 102, name: 'Sneha Gupta', daysLeft: 4, plan: 'Quarterly Pro', phone: '+91 98123 45678', isUrgent: false },
    { id: 103, name: 'Arjun Das', daysLeft: 5, plan: 'Monthly Standard', phone: '+91 98989 12345', isUrgent: false }
  ];

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
        {/* Left Primary Column: Weekly Attendance Activity Real Chart */}
        <div className="dashboard-panel">
          <WeeklyAttendanceChart data={weeklyAttendanceData} highlightDay="Sat" />
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
              {recentCheckIns.map((item) => (
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
              ))}
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
              {expiringMemberships.map((item) => (
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboardScreen;
