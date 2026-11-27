import React from 'react';
import { Eye, FileText, Send, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import { formatCurrency, formatExcelDate } from '../../../../shared/utils/formatters';
import { Badge } from '../../../../shared/components/Badge/Badge';

// Authentic WhatsApp SVG Icon Component
const WhatsAppIcon = ({ size = 13, style }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ flexShrink: 0, ...style }}
  >
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);

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
  onSendWhatsAppBalanceReminder,
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
      width: '180px',
      render: (m) => {
        const bal = parseFloat(m.balanceAmount || 0);
        return bal > 0 ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <span className="badge-balance-due" title="Pending Balance Fee">
              {formatCurrency(bal)}
            </span>
            <button
              type="button"
              className="btn-whatsapp-remind-inline"
              onClick={(e) => {
                e.stopPropagation();
                onSendWhatsAppBalanceReminder && onSendWhatsAppBalanceReminder(m);
              }}
              title={`Send WhatsApp Due Reminder to ${m.name} (Due: ₹${bal})`}
            >
              <WhatsAppIcon size={12} />
              <span>Remind</span>
            </button>
          </div>
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
      width: '305px',
      render: (m) => {
        const bal = parseFloat(m.balanceAmount || 0);
        return (
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
            {bal > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm btn-whatsapp-action"
                onClick={() => onSendWhatsAppBalanceReminder && onSendWhatsAppBalanceReminder(m)}
                title={`Send WhatsApp Balance Reminder to ${m.name} (Due: ₹${bal})`}
              >
                <WhatsAppIcon size={12} />
                <span>Due Remind</span>
              </button>
            )}
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
        );
      }
    }
  ];
};
