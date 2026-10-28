import React from 'react';
import { Table } from '../../../shared/components/Table/Table';
import { Badge } from '../../../shared/components/Badge/Badge';
import { formatDate } from '../../../shared/utils/formatters';

export const MemberAttendanceHistoryScreen = () => {
  const checkIns = [
    { id: 1, date: '2026-03-24', time: '07:15 AM', session: 'Morning Strength Workout' },
    { id: 2, date: '2026-03-22', time: '07:30 AM', session: 'Cardio & Core Fitness' },
    { id: 3, date: '2026-03-20', time: '06:55 AM', session: 'Leg Day & Squats' },
    { id: 4, date: '2026-03-18', time: '07:10 AM', session: 'Chest & Triceps Push' },
    { id: 5, date: '2026-03-16', time: '07:05 AM', session: 'Back & Biceps Pull' }
  ];

  const columns = [
    {
      header: 'Date',
      key: 'date',
      render: (r) => <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatDate(r.date)}</span>
    },
    {
      header: 'Check-in Time',
      key: 'time',
      render: (r) => <span style={{ color: 'var(--text-secondary)' }}>{r.time}</span>
    },
    {
      header: 'Workout Focus',
      key: 'session',
      render: (r) => <span style={{ color: 'var(--brand-primary)', fontWeight: 500 }}>{r.session}</span>
    },
    {
      header: 'Attendance Status',
      key: 'status',
      render: () => <Badge status="active">Present</Badge>
    }
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.85rem', marginBottom: 4, color: 'var(--text-primary)' }}>My Attendance History</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Review all your gym check-ins, monthly visit records, and workout consistency
        </p>
      </div>

      <Table columns={columns} data={checkIns} />
    </div>
  );
};

export default MemberAttendanceHistoryScreen;
