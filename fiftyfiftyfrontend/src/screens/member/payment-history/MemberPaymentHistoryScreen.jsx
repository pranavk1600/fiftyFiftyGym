import React, { useState } from 'react';
import { Receipt, Printer } from 'lucide-react';
import { Table } from '../../../shared/components/Table/Table';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Button } from '../../../shared/components/Button/Button';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import { useAuth } from '../../../context/AuthContext';

export const MemberPaymentHistoryScreen = () => {
  const { user } = useAuth();
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [payments] = useState([]);

  const columns = [
    { header: 'Receipt No.', key: 'id' },
    {
      header: 'Plan Description',
      key: 'plan',
      render: (p) => <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.plan}</span>
    },
    {
      header: 'Amount Paid',
      key: 'amount',
      render: (p) => (
        <span style={{ fontWeight: 700, color: 'var(--brand-accent)' }}>
          {formatCurrency(p.amount)}
        </span>
      )
    },
    {
      header: 'Payment Method',
      key: 'mode',
      render: (p) => <Badge status="info">{p.mode}</Badge>
    },
    {
      header: 'Date',
      key: 'date',
      render: (p) => formatDate(p.date)
    },
    {
      header: 'Status',
      key: 'status',
      render: (p) => <Badge status={p.status} />
    },
    {
      header: 'Action',
      key: 'action',
      render: (p) => (
        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedReceipt(p)}>
          <Receipt size={14} />
          <span>Receipt</span>
        </button>
      )
    }
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.85rem', marginBottom: 4, color: 'var(--text-primary)' }}>My Payment History & Receipts</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          View past subscription fees, payment modes, and printable receipts
        </p>
      </div>

      <Table
        columns={columns}
        data={payments}
        emptyMessage="No payment receipts found. Transactions will appear here once recorded by your gym admin."
      />

      <Modal
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        title="Official Payment Receipt"
        footer={
          <Button onClick={() => window.print()}>
            <Printer size={16} />
            <span>Print Receipt</span>
          </Button>
        }
      >
        {selectedReceipt && (
          <div style={{
            padding: 20,
            border: '1px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-surface-elevated)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{user?.gymName || user?.gym?.name || 'FiftyFifty Gym'}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Official Payment Acknowledgment</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Receipt Number:</span>
              <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{selectedReceipt.id}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Plan Description:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedReceipt.plan}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Date:</span>
              <span style={{ color: 'var(--text-primary)' }}>{formatDate(selectedReceipt.date)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Payment Method:</span>
              <Badge status="info">{selectedReceipt.mode}</Badge>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 18,
              paddingTop: 16,
              borderTop: '1px solid var(--border-subtle)'
            }}>
              <strong style={{ color: 'var(--text-primary)' }}>Total Paid:</strong>
              <strong style={{ color: 'var(--brand-accent)', fontSize: '1.3rem' }}>
                {formatCurrency(selectedReceipt.amount)}
              </strong>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MemberPaymentHistoryScreen;
