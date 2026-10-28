import React, { useState } from 'react';
import { CheckCircle2, Clock, LogOut } from 'lucide-react';
import { Button } from '../../../shared/components/Button/Button';
import { Table } from '../../../shared/components/Table/Table';
import { Badge } from '../../../shared/components/Badge/Badge';
import { useToast } from '../../../context/ToastContext';

export const AttendanceScreen = () => {
  const [memberQuery, setMemberQuery] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('TODAY');
  const { showToast } = useToast();

  const [attendanceLogs, setAttendanceLogs] = useState([
    { id: 1, memberName: 'Rahul Sharma', phone: '+91 98765 43210', checkInTime: '07:15 AM', checkOutTime: null, plan: 'Quarterly Pro', status: 'IN_GYM' },
    { id: 2, memberName: 'Ananya Roy', phone: '+91 98111 22334', checkInTime: '07:45 AM', checkOutTime: '08:50 AM', plan: 'Annual Gold Elite', status: 'COMPLETED' },
    { id: 3, memberName: 'Vikram Singh', phone: '+91 98333 44556', checkInTime: '08:20 AM', checkOutTime: null, plan: 'Monthly Standard', status: 'IN_GYM' },
    { id: 4, memberName: 'Priya Patel', phone: '+91 98444 55667', checkInTime: '09:05 AM', checkOutTime: '10:15 AM', plan: 'Annual Gold Elite', status: 'COMPLETED' },
    { id: 5, memberName: 'Karan Mehra', phone: '+91 98555 66778', checkInTime: '09:30 AM', checkOutTime: null, plan: 'Monthly Standard', status: 'IN_GYM' }
  ]);

  const handleQuickCheckIn = (e) => {
    e.preventDefault();
    if (!memberQuery.trim()) return;

    const alreadyCheckedIn = attendanceLogs.some(
      (log) => log.memberName.toLowerCase() === memberQuery.toLowerCase() && log.status === 'IN_GYM'
    );

    if (alreadyCheckedIn) {
      showToast(`${memberQuery} is currently active on the gym floor!`, 'warning');
      return;
    }

    const newLog = {
      id: Date.now(),
      memberName: memberQuery,
      phone: '+91 98000 12345',
      checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      checkOutTime: null,
      plan: 'Active Member',
      status: 'IN_GYM'
    };

    setAttendanceLogs([newLog, ...attendanceLogs]);
    showToast(`Check-in recorded for ${memberQuery}`, 'success');
    setMemberQuery('');
  };

  const handleCheckOut = (logId, name) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAttendanceLogs(
      attendanceLogs.map((log) =>
        log.id === logId ? { ...log, checkOutTime: timeNow, status: 'COMPLETED' } : log
      )
    );
    showToast(`Checked out ${name} at ${timeNow}`, 'info');
  };

  const inGymCount = attendanceLogs.filter((l) => l.status === 'IN_GYM').length;
  const completedCount = attendanceLogs.filter((l) => l.status === 'COMPLETED').length;

  const columns = [
    {
      header: 'Member Name',
      key: 'memberName',
      render: (log) => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.memberName}</span>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.phone}</div>
        </div>
      )
    },
    { header: 'Current Plan', key: 'plan' },
    {
      header: 'Check-in Time',
      key: 'checkInTime',
      render: (log) => (
        <span style={{ color: 'var(--brand-accent)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Clock size={14} /> {log.checkInTime}
        </span>
      )
    },
    {
      header: 'Check-out Time',
      key: 'checkOutTime',
      render: (log) =>
        log.checkOutTime ? (
          <span style={{ color: 'var(--text-secondary)' }}>{log.checkOutTime}</span>
        ) : (
          <span style={{ color: 'var(--brand-primary)', fontStyle: 'italic', fontSize: '0.85rem' }}>Active on floor</span>
        )
    },
    {
      header: 'Floor Status',
      key: 'status',
      render: (log) => (
        <Badge status={log.status === 'IN_GYM' ? 'active' : 'info'}>
          {log.status === 'IN_GYM' ? 'In Gym' : 'Completed'}
        </Badge>
      )
    },
    {
      header: 'Action',
      key: 'action',
      render: (log) =>
        log.status === 'IN_GYM' ? (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleCheckOut(log.id, log.memberName)}
            title="Mark Check-out"
          >
            <LogOut size={14} />
            <span>Check-out</span>
          </button>
        ) : (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Session finished</span>
        )
    }
  ];

  const filteredLogs = attendanceLogs.filter(
    (l) =>
      l.memberName.toLowerCase().includes(tableSearch.toLowerCase()) ||
      l.phone.includes(tableSearch)
  );

  return (
    <div className="animate-fade-in">
      {/* Top Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.85rem', marginBottom: 4, color: 'var(--text-primary)' }}>Daily Attendance Management</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Record manual check-ins, oversee live floor occupancy, and manage workout sessions
        </p>
      </div>

      {/* Attendance Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <div style={{
          background: 'var(--bg-surface)',
          padding: '18px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>Total Check-ins Today</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
            {attendanceLogs.length}
          </div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          padding: '18px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>Currently On Floor</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: 4 }}>
            {inGymCount} Members
          </div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          padding: '18px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>Completed Workouts</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-accent)', marginTop: 4 }}>
            {completedCount} Finished
          </div>
        </div>
      </div>

      {/* Quick Check-in Form Card */}
      <form
        onSubmit={handleQuickCheckIn}
        style={{
          display: 'flex',
          gap: 12,
          padding: 20,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 24,
          alignItems: 'center',
          boxShadow: 'var(--shadow-sm)',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: 1, minWidth: 260 }}>
          <input
            type="text"
            className="input-control"
            placeholder="Type member name to record check-in (e.g. Priya Patel)..."
            value={memberQuery}
            onChange={(e) => setMemberQuery(e.target.value)}
          />
        </div>
        <Button type="submit">
          <CheckCircle2 size={18} />
          <span>Record Member Check-in</span>
        </Button>
      </form>

      {/* Table Controls Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12
      }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
          Today's Live Check-ins ({filteredLogs.length})
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {['TODAY', 'YESTERDAY', 'WEEK'].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`btn btn-sm ${dateFilter === tab ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setDateFilter(tab)}
            >
              {tab === 'TODAY' ? 'Today' : tab === 'YESTERDAY' ? 'Yesterday' : 'Past 7 Days'}
            </button>
          ))}
          <input
            type="text"
            className="input-control"
            placeholder="Search member..."
            style={{ width: 180, padding: '6px 12px' }}
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
          />
        </div>
      </div>

      <Table columns={columns} data={filteredLogs} emptyMessage="No attendance logs recorded for this filter." />
    </div>
  );
};

export default AttendanceScreen;
