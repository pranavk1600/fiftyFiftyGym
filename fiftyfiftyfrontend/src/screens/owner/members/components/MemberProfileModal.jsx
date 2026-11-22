import React from 'react';
import { Mail, Send, Calendar, Clock, Lock, Sparkles, FileText, CheckCircle2 } from 'lucide-react';
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Member Profile Details"
      maxWidth={680}
      footer={
        <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'space-between' }}>
          <Button
            variant="secondary"
            onClick={() => onOpenReceipt(member)}
            style={{ color: 'var(--brand-primary)', borderColor: 'rgba(255, 107, 0, 0.35)' }}
          >
            <FileText size={15} />
            <span>View Receipt</span>
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Close Profile
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Header Summary */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            background: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: 4, color: 'var(--text-primary)' }}>
              {member.name}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge-excel-id">ID: {member.customMemberId || member.id}</span>
              {member.slug && (
                <span style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontFamily: 'monospace' }}>
                  /{member.slug}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {renderInvitationBadge && renderInvitationBadge(member.invitationStatus)}
            <Badge status={member.status} />
          </div>
        </div>

        {/* Excel Alignment Overview Card */}
        <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 14 }}>
          <div className="form-section-title" style={{ marginTop: 0, marginBottom: 12 }}>
            Excel Sheet Data Fields
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div style={{ padding: 10, background: 'var(--bg-surface-elevated)', borderRadius: 6 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Payment Date</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>{formatExcelDate(member.paymentDate)}</div>
            </div>
            <div style={{ padding: 10, background: '#FEF9C3', borderRadius: 6 }}>
              <div style={{ fontSize: '0.72rem', color: '#854D0E' }}>Start Date (Start D)</div>
              <div style={{ fontWeight: 700, color: '#854D0E', marginTop: 2 }}>{formatExcelDate(member.joinDate)}</div>
            </div>
            <div style={{ padding: 10, background: '#FFEDD5', borderRadius: 6 }}>
              <div style={{ fontSize: '0.72rem', color: '#9A3412' }}>End Date (End D)</div>
              <div style={{ fontWeight: 700, color: '#9A3412', marginTop: 2 }}>{formatExcelDate(member.expiryDate)}</div>
            </div>
            <div style={{ padding: 10, background: 'var(--bg-surface-elevated)', borderRadius: 6 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Duration</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>{member.durationMonths || 1} Month(s)</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 12 }}>
            <div style={{ padding: 10, background: 'var(--bg-surface-elevated)', borderRadius: 6 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Membership Type</div>
              <div style={{ fontWeight: 600, color: 'var(--brand-primary)', marginTop: 2 }}>
                {member.membershipType || member.plan || 'Gym + cardio'}
              </div>
            </div>
            <div style={{ padding: 10, background: 'var(--bg-surface-elevated)', borderRadius: 6 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Total Amount</div>
              <div style={{ fontWeight: 700, marginTop: 2 }}>{formatCurrency(total)}</div>
            </div>
            <div style={{ padding: 10, background: '#DCFCE7', borderRadius: 6 }}>
              <div style={{ fontSize: '0.72rem', color: '#166534' }}>Received Amount</div>
              <div style={{ fontWeight: 700, color: '#166534', marginTop: 2 }}>{formatCurrency(paid)}</div>
            </div>
            <div style={{ padding: 10, background: balance > 0 ? '#FEE2E2' : '#F1F5F9', borderRadius: 6 }}>
              <div style={{ fontSize: '0.72rem', color: balance > 0 ? '#991B1B' : 'var(--text-secondary)' }}>Balance Due</div>
              <div style={{ fontWeight: 700, color: balance > 0 ? '#991B1B' : 'var(--text-primary)', marginTop: 2 }}>
                {formatCurrency(balance)}
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Portal Access */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ padding: 12, background: 'var(--bg-surface-elevated)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Contact Phone</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{member.phone || '—'}</div>
          </div>
          <div style={{ padding: 12, background: 'var(--bg-surface-elevated)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Email Address</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{member.email || '—'}</div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
