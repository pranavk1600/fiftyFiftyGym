import React, { useState, useEffect } from 'react';
import { Users, CalendarCheck, IndianRupee, AlertTriangle } from 'lucide-react';
import { StatCard } from '../../../shared/components/StatCard/StatCard';
import { formatCurrency } from '../../../shared/utils/formatters';
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

  return (
    <div className="animate-fade-in">
      {/* Top Header */}
      <div className="dashboard-header-container">
        <div className="dashboard-title-group">
          <h1>Gym Operations Dashboard</h1>
          <p>Real-time analytics, daily attendance throughput, and membership oversight</p>
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
    </div>
  );
};

export default OwnerDashboardScreen;
