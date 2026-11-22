import React from 'react';
import { Mail, Phone, Calendar, CreditCard, User, FileText, Send, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../../../shared/components/Modal/Modal';
import { Button } from '../../../../shared/components/Button/Button';
import { Badge } from '../../../../shared/components/Badge/Badge';
import { formatCurrency, formatExcelDate } from '../../../../shared/utils/formatters';

export const MemberProfileModal = ({
  isOpen,
  onClose,
  member,
  onOpenReceipt,
  onResendInvitation,
  isResending,
  renderInvitationBadge
}) => {
  if (!member) return null;

  const total = parseFloat(member.totalAmount || 0);
  const paid = parseFloat(member.paidAmount || 0);
  const balance = parseFloat(member.balanceAmount || 0);
  const initial = (member.name || 'M').charAt(0).toUpperCase();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Member Profile Details"
      maxWidth={680}
      footer={
        <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Button
              variant="secondary"
              onClick={() => onOpenReceipt(member)}
              style={{ color: 'var(--brand-primary)', borderColor: 'rgba(255, 107, 0, 0.35)' }}
            >
              <FileText size={15} />
              <span>View Receipt</span>
            </Button>

            {member.email && member.invitationStatus !== 'active' && onResendInvitation && (
              <Button
                variant="secondary"
                onClick={() => onResendInvitation(member)}
                disabled={isResending}
                style={{ fontSize: '0.85rem' }}
              >
                {isResending ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    <span>Resending...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Resend Invite</span>
                  </>
                )}
              </Button>
            )}
          </div>

          <Button variant="secondary" onClick={onClose}>
            Close Profile
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Header Profile Summary */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'var(--bg-surface-elevated, #F8FAFC)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle, #E2E8F0)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="profile-avatar-circle">
              {initial}
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                {member.name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge-excel-id">ID: {member.customMemberId || member.id}</span>
                {member.slug && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontFamily: 'monospace' }}>
                    /{member.slug}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {renderInvitationBadge && renderInvitationBadge(member.invitationStatus)}
            <Badge status={member.status} />
          </div>
        </div>

        {/* Section 1: Membership & Validity */}
        <div className="modal-form-card">
          <div className="modal-card-header">
            <Calendar size={16} className="modal-card-icon" />
            <span>Membership & Validity</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.9fr', gap: 12, marginBottom: 12 }}>
            <div className="profile-stat-box">
              <span className="profile-stat-label">Membership Type</span>
              <span className="profile-stat-value" style={{ color: 'var(--brand-primary)' }}>
                {member.membershipType || member.plan || 'Gym + cardio'}
              </span>
            </div>

            <div className="profile-stat-box">
              <span className="profile-stat-label">Plan Duration</span>
              <span className="profile-stat-value">
                {member.durationMonths || 1} Month{parseInt(member.durationMonths || 1, 10) > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div className="profile-stat-box">
              <span className="profile-stat-label">Payment Date</span>
              <span className="profile-stat-value">{formatExcelDate(member.paymentDate)}</span>
            </div>

            <div className="profile-stat-box" style={{ background: '#FEF9C3', borderColor: '#FDE047' }}>
              <span className="profile-stat-label" style={{ color: '#854D0E' }}>Start Date</span>
              <span className="profile-stat-value" style={{ color: '#854D0E' }}>
                {formatExcelDate(member.joinDate)}
              </span>
            </div>

            <div className="profile-stat-box" style={{ background: '#FFEDD5', borderColor: '#FDBA74' }}>
              <span className="profile-stat-label" style={{ color: '#9A3412' }}>End Date</span>
              <span className="profile-stat-value" style={{ color: '#9A3412' }}>
                {formatExcelDate(member.expiryDate)}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Billing & Payment Status */}
        <div className="modal-form-card">
          <div className="modal-card-header">
            <CreditCard size={16} className="modal-card-icon" />
            <span>Billing & Payment Status</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div className="profile-stat-box">
              <span className="profile-stat-label">Total Fee</span>
              <span className="profile-stat-value">{formatCurrency(total)}</span>
            </div>

            <div className="profile-stat-box" style={{ background: '#DCFCE7', borderColor: '#86EFAC' }}>
              <span className="profile-stat-label" style={{ color: '#166534' }}>Received</span>
              <span className="profile-stat-value" style={{ color: '#166534' }}>
                {formatCurrency(paid)}
              </span>
            </div>

            <div
              className="profile-stat-box"
              style={{
                background: balance > 0 ? '#FEE2E2' : '#F8FAFC',
                borderColor: balance > 0 ? '#FCA5A5' : 'var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  className="profile-stat-label"
                  style={{ color: balance > 0 ? '#991B1B' : 'var(--text-secondary)' }}
                >
                  Balance Due
                </span>
                {balance > 0 && <span className="due-pill">Due</span>}
              </div>
              <span
                className="profile-stat-value"
                style={{ color: balance > 0 ? '#991B1B' : '#166534' }}
              >
                {formatCurrency(balance)}
              </span>
            </div>

            <div className="profile-stat-box">
              <span className="profile-stat-label">Receipt #</span>
              {member.receiptNumber ? (
                <button
                  type="button"
                  onClick={() => onOpenReceipt(member)}
                  className="receipt-no-link"
                  style={{ marginTop: 2, padding: '2px 8px', fontSize: '0.85rem' }}
                  title="Click to view official receipt"
                >
                  <FileText size={12} />
                  <span>#{member.receiptNumber}</span>
                </button>
              ) : (
                <span className="profile-stat-value" style={{ color: 'var(--text-muted)' }}>
                  —
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Contact & Communication */}
        <div className="modal-form-card">
          <div className="modal-card-header">
            <User size={16} className="modal-card-icon" />
            <span>Contact Information</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="profile-stat-box">
              <span className="profile-stat-label">Contact Phone</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Phone size={14} style={{ color: 'var(--brand-primary)' }} />
                <span className="profile-stat-value" style={{ fontSize: '0.9rem' }}>
                  {member.phone || '—'}
                </span>
              </div>
            </div>

            <div className="profile-stat-box">
              <span className="profile-stat-label">Email Address</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Mail size={14} style={{ color: 'var(--brand-primary)' }} />
                <span className="profile-stat-value" style={{ fontSize: '0.9rem' }}>
                  {member.email || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
