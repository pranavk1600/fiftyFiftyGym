import React, { useState } from 'react';
import { Table } from '../../../shared/components/Table/Table';
import { Badge } from '../../../shared/components/Badge/Badge';
import { formatDate } from '../../../shared/utils/formatters';

export const MemberAttendanceHistoryScreen = () => {
  const [checkIns] = useState([]);

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

      <Table
        columns={columns}
        data={checkIns}
        emptyMessage="No attendance check-ins recorded yet. Check in at the gym reception desk to start tracking your visits."
      />
    </div>
  );
};

export default MemberAttendanceHistoryScreen;
