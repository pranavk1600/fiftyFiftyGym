import React from 'react';
import { Eye, FileText, Send, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import { formatCurrency, formatExcelDate } from '../../../../shared/utils/formatters';
import { Badge } from '../../../../shared/components/Badge/Badge';

/**
 * Builds the complete columns configuration for the Member Table.
 * First 11 columns match the Excel sheet layout in exact order,
 * followed by the platform's extra management columns.
 * All headers and data cells are strictly centered and rendered in one line.
 */
export const getMemberColumns = ({
  onSelectMember,
  onOpenReceipt,
  onResendInvitation,
  onEditMember,
  onDeleteMember,
  resendingId,
  renderInvitationBadge,
  selectedIds,
  onToggleSelectRow,
  onToggleSelectAll,
  isAllSelected,
  isIndeterminate
}) => {
  return [
    // -------------------------------------------------------------
    // SELECTION COLUMN
    // -------------------------------------------------------------
    {
      header: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <input
            type="checkbox"
            className="member-select-checkbox"
            checked={Boolean(isAllSelected)}
            ref={(el) => {
              if (el) el.indeterminate = Boolean(isIndeterminate);
            }}
            onChange={onToggleSelectAll}
            title={isAllSelected ? 'Deselect All' : 'Select All'}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--brand-primary, #FF6B00)' }}
          />
        </div>
      ),
      key: 'select',
      width: '45px',
      render: (m) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <input
            type="checkbox"
            className="member-select-checkbox"
            checked={selectedIds ? selectedIds.has(m.id) : false}
            onChange={() => onToggleSelectRow && onToggleSelectRow(m.id)}
            title={`Select ${m.name}`}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--brand-primary, #FF6B00)' }}
          />
        </div>
      )
    },

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
        <span
          style={{
            fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            display: 'inline-block'
          }}
          title={m.email ? `${m.name} (${m.email})` : m.name}
        >
          {m.name}
        </span>
      )
    },
    {
      header: 'Payment',
      key: 'paymentDate',
      width: '110px',
      render: (m) => (
        <span style={{ fontSize: '0.86rem', color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {formatExcelDate(m.paymentDate)}
        </span>
      )
    },
    {
      header: 'Start D',
      key: 'joinDate',
      width: '115px',
      render: (m) => (
        <span className="badge-excel-start">
          {formatExcelDate(m.joinDate)}
        </span>
      )
    },
    {
      header: 'End D',
      key: 'expiryDate',
      width: '115px',
      render: (m) => (
        <span className="badge-excel-end">
          {formatExcelDate(m.expiryDate)}
        </span>
      )
    },
    {
      header: 'Duration',
      key: 'durationMonths',
      width: '105px',
      render: (m) => (
        <span className="badge-excel-duration">
          {m.durationMonths ? `${m.durationMonths} ${m.durationMonths === 1 ? 'Month' : 'Months'}` : '1 Month'}
        </span>
      )
    },
    {
      header: 'M Type',
      key: 'membershipType',
      width: '160px',
      render: (m) => (
        <span className="badge-excel-type">
          {m.membershipType || m.plan || 'Gym + cardio'}
        </span>
      )
    },
    {
      header: 'Total Am',
      key: 'totalAmount',
      width: '110px',
      render: (m) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
          {formatCurrency(m.totalAmount)}
        </span>
      )
    },
    {
      header: 'Received Am',
      key: 'paidAmount',
      width: '115px',
      render: (m) => (
        <span style={{ fontWeight: 600, color: 'var(--color-success, #16A34A)', whiteSpace: 'nowrap' }}>
          {formatCurrency(m.paidAmount)}
        </span>
      )
    },
    {
      header: 'Bal. Am',
      key: 'balanceAmount',
      width: '115px',
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
      width: '95px',
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
    // EXTRA SOFTWARE / PLATFORM COLUMNS (12 - 15)
    // -------------------------------------------------------------
    {
      header: 'Phone Number',
      key: 'phone',
      width: '135px',
      render: (m) => (
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {m.phone || '—'}
        </span>
      )
    },
    {
      header: 'Invitation',
      key: 'invitationStatus',
      width: '110px',
      render: (m) => (
        <div style={{ display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap' }}>
          {renderInvitationBadge(m.invitationStatus)}
        </div>
      )
    },
    {
      header: 'Status',
      key: 'status',
      width: '100px',
      render: (m) => (
        <div style={{ display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap' }}>
          <Badge status={m.status} />
        </div>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      width: '245px',
      render: (m) => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>
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
            onClick={() => onDeleteMember && onDeleteMember(m)}
            title="Delete Member"
            style={{ color: 'var(--color-danger, #EF4444)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )
    }
  ];
};
