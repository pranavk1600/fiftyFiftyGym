import React, { useState } from 'react';
import { Bell, AlertTriangle, DollarSign, Calendar, CheckCheck, Trash2 } from 'lucide-react';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Button } from '../../../shared/components/Button/Button';
import { useToast } from '../../../context/ToastContext';

export const NotificationsScreen = () => {
  const { showToast } = useToast();
  const [filterType, setFilterType] = useState('ALL');

  const [alerts, setAlerts] = useState([
    {
      id: 1,
      type: 'EXPIRY',
      title: '3 Memberships Expiring in 48 Hours',
      description: 'Rahul Sharma, Sneha Gupta, and Arjun Das have memberships expiring soon. Renewal reminders ready to send.',
      time: '2 hours ago',
      level: 'warning',
      isUnread: true
    },
    {
      id: 2,
      type: 'DUE',
      title: 'Pending Balance Alert: ₹2,500',
      description: 'Priya Patel has an outstanding partial payment balance for Quarterly Pro plan due this week.',
      time: '5 hours ago',
      level: 'danger',
      isUnread: true
    },
    {
      id: 3,
      type: 'EXPIRED',
      title: 'Membership Expired: Vikram Singh',
      description: 'Monthly Standard plan expired on 2026-03-24. Membership status updated to inactive.',
      time: 'Yesterday',
      level: 'info',
      isUnread: false
    },
    {
      id: 4,
      type: 'SYSTEM',
      title: 'Daily Auto-Backup Completed',
      description: 'Gym attendance and membership database synchronized to secure storage.',
      time: '2 days ago',
      level: 'success',
      isUnread: false
    }
  ]);

  const markAllAsRead = () => {
    setAlerts(alerts.map((a) => ({ ...a, isUnread: false })));
    showToast('All notifications marked as read', 'success');
  };

  const dismissAlert = (id) => {
    setAlerts(alerts.filter((a) => a.id !== id));
    showToast('Notification dismissed', 'info');
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'UNREAD') return a.isUnread;
    return a.type === filterType;
  });

  const unreadCount = alerts.filter((a) => a.isUnread).length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: '1.85rem', color: 'var(--text-primary)' }}>Alerts & Notifications</h1>
            {unreadCount > 0 && (
              <Badge status="warning">{unreadCount} New</Badge>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>
            Operational alerts for membership expirations, payment balances, and system logs
          </p>
        </div>

        {unreadCount > 0 && (
          <Button variant="secondary" onClick={markAllAsRead}>
            <CheckCheck size={16} />
            <span>Mark All as Read</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 20,
        flexWrap: 'wrap',
        background: 'var(--bg-surface)',
        padding: '8px 12px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {[
          { key: 'ALL', label: 'All Alerts' },
          { key: 'UNREAD', label: `Unread (${unreadCount})` },
          { key: 'EXPIRY', label: 'Expirations' },
          { key: 'DUE', label: 'Due Payments' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`btn btn-sm ${filterType === tab.key ? 'btn-primary' : 'btn-secondary'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filteredAlerts.length === 0 ? (
          <div style={{
            padding: 48,
            textAlign: 'center',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)'
          }}>
            <Bell size={36} color="var(--text-muted)" style={{ marginBottom: 12 }} />
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 4 }}>All Clear</h3>
            <p style={{ fontSize: '0.875rem' }}>No alerts found in this category.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                padding: '20px 24px',
                background: alert.isUnread ? 'var(--bg-surface)' : 'var(--bg-surface-elevated)',
                border: alert.isUnread ? '1px solid var(--brand-primary-soft-border)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: alert.isUnread ? 'var(--shadow-sm)' : 'none',
                position: 'relative',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Unread indicator dot */}
              {alert.isUnread && (
                <div style={{
                  position: 'absolute',
                  top: 20,
                  left: 8,
                  width: 6,
                  height: 6,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--brand-primary)'
                }} />
              )}

              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background:
                    alert.level === 'warning'
                      ? 'var(--color-warning-bg)'
                      : alert.level === 'danger'
                      ? 'var(--color-danger-bg)'
                      : alert.level === 'success'
                      ? 'var(--color-success-bg)'
                      : 'var(--color-info-bg)',
                  color:
                    alert.level === 'warning'
                      ? 'var(--color-warning)'
                      : alert.level === 'danger'
                      ? 'var(--color-danger)'
                      : alert.level === 'success'
                      ? 'var(--color-success)'
                      : 'var(--color-info)'
                }}
              >
                {alert.level === 'warning' ? (
                  <AlertTriangle size={22} />
                ) : alert.level === 'danger' ? (
                  <DollarSign size={22} />
                ) : alert.level === 'success' ? (
                  <CheckCheck size={22} />
                ) : (
                  <Calendar size={22} />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: alert.isUnread ? 700 : 600 }}>
                    {alert.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{alert.time}</span>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px' }}
                      title="Dismiss alert"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {alert.description}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsScreen;
