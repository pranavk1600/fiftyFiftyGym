import React from 'react';
import { Eye, FileText, Send, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import { formatCurrency, formatExcelDate } from '../../../../shared/utils/formatters';
import { Badge } from '../../../../shared/components/Badge/Badge';

/**
 * Builds the complete columns configuration for the Member Table.
 * First 11 columns match the Excel sheet layout in exact order,
 * followed by the platform's extra management columns.
 */
export const getMemberColumns = ({
  onSelectMember,
  onOpenReceipt,
  onResendInvitation,
  onEditMember,
  onDeleteMember,
  resendingId,
  renderInvitationBadge
}) => {
  return [
    // -------------------------------------------------------------
    // EXCEL SHEET COLUMNS (1 - 11)
    // -------------------------------------------------------------
    {
      header: 'ID',
      key: 'customMemberId',
      width: '90px',
      render: (m) => (
        <span className="badge-excel-id" title={`System ID: ${m.id}`}>
          {m.customMemberId || m.id?.slice(-5) || '—'}
        </span>
      )
    },
    {
      header: 'NAME',
      key: 'name',
      width: '180px',
      render: (m) => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
            {m.name}
          </span>
          {m.email && (
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>
              {m.email}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Payment',
      key: 'paymentDate',
      width: '105px',
      render: (m) => (
        <span style={{ fontSize: '0.86rem', color: 'var(--text-primary)', fontWeight: 500 }}>
          {formatExcelDate(m.paymentDate)}
        </span>
      )
    },
    {
      header: 'Start D',
      key: 'joinDate',
      width: '105px',
      render: (m) => (
        <span className="badge-excel-start">
          {formatExcelDate(m.joinDate)}
        </span>
      )
    },
    {
      header: 'End D',
      key: 'expiryDate',
      width: '105px',
      render: (m) => (
        <span className="badge-excel-end">
          {formatExcelDate(m.expiryDate)}
        </span>
      )
    },
    {
      header: 'Duration',
      key: 'durationMonths',
      width: '95px',
      render: (m) => (
        <span className="badge-excel-duration">
          {m.durationMonths ? `${m.durationMonths} ${m.durationMonths === 1 ? 'Month' : 'Months'}` : '1 Month'}
        </span>
      )
    },
    {
      header: 'M Type',
      key: 'membershipType',
      width: '130px',
      render: (m) => (
        <span className="badge-excel-type">
          {m.membershipType || m.plan || 'Gym + cardio'}
        </span>
      )
    },
    {
      header: 'Total Am',
      key: 'totalAmount',
      width: '100px',
      render: (m) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {formatCurrency(m.totalAmount)}
        </span>
      )
    },
    {
      header: 'Received Am',
      key: 'paidAmount',
      width: '110px',
      render: (m) => (
        <span style={{ fontWeight: 600, color: 'var(--color-success, #16A34A)' }}>
          {formatCurrency(m.paidAmount)}
        </span>
      )
    },
    {
      header: 'Bal. Am',
      key: 'balanceAmount',
      width: '110px',
      render: (m) => {
        const bal = parseFloat(m.balanceAmount || 0);
        return bal > 0 ? (
          <span className="badge-balance-due" title="Pending Balance Fee">
            {formatCurrency(bal)}
          </span>
        ) : (
          <span className="badge-balance-cleared">
            ₹0
          </span>
        );
      }
    },
    {
      header: 'Rc N',
      key: 'receiptNumber',
      width: '90px',
      render: (m) => (
        m.receiptNumber ? (
          <button
            type="button"
            className="receipt-no-link"
            onClick={() => onOpenReceipt(m)}
            title="Click to view receipt"
          >
            #{m.receiptNumber}
          </button>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>—</span>
        )
      )
    },

    // -------------------------------------------------------------
    // EXTRA SOFTWARE / PLATFORM COLUMNS (12 - 16)
    // -------------------------------------------------------------
    {
      header: 'Phone Number',
      key: 'phone',
      width: '130px',
      render: (m) => (
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {m.phone || '—'}
        </span>
      )
    },
    {
      header: 'Invitation',
      key: 'invitationStatus',
      width: '110px',
      render: (m) => renderInvitationBadge(m.invitationStatus)
    },
    {
      header: 'Status',
      key: 'status',
      width: '100px',
      render: (m) => <Badge status={m.status} />
    },
    {
      header: 'Actions',
      key: 'actions',
      width: '260px',
      render: (m) => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onSelectMember(m)}
            title="View Details"
          >
            <Eye size={13} />
            <span>Profile</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onOpenReceipt(m)}
            title="View Membership Receipt"
            style={{
              color: 'var(--brand-primary)',
              borderColor: 'rgba(255, 107, 0, 0.35)',
              background: 'rgba(255, 107, 0, 0.05)',
              fontWeight: 500
            }}
          >
            <FileText size={13} />
            <span>Receipt</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onResendInvitation(m)}
            disabled={resendingId === m.id}
            title="Resend Activation Email"
            style={{ color: 'var(--brand-primary)' }}
          >
            {resendingId === m.id ? (
              <RefreshCw size={13} className="spin" />
            ) : (
              <Send size={13} />
            )}
            <span>Invite</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onEditMember(m)}
            title="Edit Member / Renew"
          >
            <Edit2 size={13} />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onDeleteMember(m)}
            title="Delete Member"
            style={{ color: 'var(--color-danger, #DC2626)' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )
    }
  ];
};
