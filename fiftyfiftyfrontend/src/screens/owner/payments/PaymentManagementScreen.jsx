import React, { useState } from 'react';
import { Receipt, Plus, Printer } from 'lucide-react';
import { Button } from '../../../shared/components/Button/Button';
import { Table } from '../../../shared/components/Table/Table';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Input } from '../../../shared/components/Input/Input';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import { useToast } from '../../../context/ToastContext';

export const PaymentManagementScreen = () => {
  const { showToast } = useToast();
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState('ALL');

  const [paymentForm, setPaymentForm] = useState({
    memberName: '',
    amount: '',
    mode: 'UPI',
    plan: 'Quarterly Pro',
    status: 'paid'
  });

  const [payments, setPayments] = useState([
    {
      id: 'RCP-2026-90412',
      memberName: 'Rahul Sharma',
      amount: 4500,
      mode: 'UPI',
      date: '2026-03-20',
      status: 'paid',
      plan: 'Quarterly Pro'
    },
    {
      id: 'RCP-2026-88123',
      memberName: 'Ananya Roy',
      amount: 14000,
      mode: 'ONLINE',
      date: '2026-03-18',
      status: 'paid',
      plan: 'Annual Gold Elite'
    },
    {
      id: 'RCP-2026-77341',
      memberName: 'Vikram Singh',
      amount: 1800,
      mode: 'CASH',
      date: '2026-03-15',
      status: 'paid',
      plan: 'Monthly Standard'
    },
    {
      id: 'RCP-2026-66522',
      memberName: 'Priya Patel',
      amount: 2000,
      mode: 'UPI',
      date: '2026-03-12',
      status: 'partial',
      plan: 'Quarterly Pro'
    }
  ]);

  const handleRecordPayment = (e) => {
    e.preventDefault();
    if (!paymentForm.memberName || !paymentForm.amount) {
      showToast('Please enter member name and payment amount', 'warning');
      return;
    }

    const newPayment = {
      id: `RCP-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      memberName: paymentForm.memberName,
      amount: Number(paymentForm.amount),
      mode: paymentForm.mode,
      date: new Date().toISOString().split('T')[0],
      status: paymentForm.status,
      plan: paymentForm.plan
    };

    setPayments([newPayment, ...payments]);
    setIsRecordModalOpen(false);
    setPaymentForm({
      memberName: '',
      amount: '',
      mode: 'UPI',
      plan: 'Quarterly Pro',
      status: 'paid'
    });
    showToast(`Payment of ₹${newPayment.amount} recorded for ${newPayment.memberName}`, 'success');
  };

  const columns = [
    { header: 'Receipt No.', key: 'id' },
    {
      header: 'Member',
      key: 'memberName',
      render: (p) => <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.memberName}</span>
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
      header: 'Payment Mode',
      key: 'mode',
      render: (p) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
          <Badge status="info">{p.mode}</Badge>
        </span>
      )
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
      header: 'Receipt',
      key: 'actions',
      render: (p) => (
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setSelectedReceipt(p)}
          title="Print or view receipt"
        >
          <Receipt size={14} />
          <span>Receipt</span>
        </button>
      )
    }
  ];

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMode = modeFilter === 'ALL' || p.mode === modeFilter;
    return matchesSearch && matchesMode;
  });

  return (
    <div className="animate-fade-in">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: 4, color: 'var(--text-primary)' }}>Payment Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Track collections, record cash/UPI transactions, and issue receipts
          </p>
        </div>
        <Button onClick={() => setIsRecordModalOpen(true)}>
          <Plus size={18} />
          <span>Record New Payment</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 28 }}>
        <div style={{
          background: 'var(--bg-surface)',
          padding: 24,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Today's Collections</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>₹4,500</div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          padding: 24,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>This Month's Collections</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--brand-accent)', marginTop: 4 }}>₹1,85,000</div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          padding: 24,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Pending Dues Balance</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: 4 }}>₹12,500</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div style={{
        display: 'flex',
        gap: 16,
        marginBottom: 20,
        flexWrap: 'wrap',
        background: 'var(--bg-surface)',
        padding: '16px 20px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <input
            type="text"
            className="input-control"
            placeholder="Search payments by member name or receipt number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Payment Mode:</span>
          <select
            className="input-control"
            style={{ width: 'auto', padding: '10px 16px' }}
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
          >
            <option value="ALL">All Modes</option>
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="ONLINE">Online</option>
            <option value="CARD">Card</option>
          </select>
        </div>
      </div>

      <Table columns={columns} data={filteredPayments} emptyMessage="No payment records found." />

      {/* Record Payment Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record New Fee Payment"
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={() => setIsRecordModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment}>
              Save Payment
            </Button>
          </div>
        }
      >
        <form onSubmit={handleRecordPayment}>
          <Input
            label="Member Full Name"
            placeholder="e.g. Rahul Sharma"
            value={paymentForm.memberName}
            onChange={(e) => setPaymentForm({ ...paymentForm, memberName: e.target.value })}
            required
          />
          <Input
            label="Amount Paid (INR ₹)"
            type="number"
            placeholder="e.g. 4500"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
            required
          />
          <div className="input-group">
            <label className="input-label">Payment Method *</label>
            <select
              className="input-control"
              value={paymentForm.mode}
              onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })}
            >
              <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
              <option value="CASH">Cash Payment</option>
              <option value="ONLINE">Online Net Banking</option>
              <option value="CARD">Debit / Credit Card</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Membership Plan</label>
            <select
              className="input-control"
              value={paymentForm.plan}
              onChange={(e) => setPaymentForm({ ...paymentForm, plan: e.target.value })}
            >
              <option value="Monthly Standard">Monthly Standard</option>
              <option value="Quarterly Pro">Quarterly Pro</option>
              <option value="Annual Gold Elite">Annual Gold Elite</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Payment Status</label>
            <select
              className="input-control"
              value={paymentForm.status}
              onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value })}
            >
              <option value="paid">Fully Paid</option>
              <option value="partial">Partial Payment (Balance Due)</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Printable Receipt Modal */}
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
              <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)' }}>FiftyFifty Gym</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Official Payment Acknowledgment & Tax Invoice</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Receipt Number:</span>
              <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{selectedReceipt.id}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Member Name:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{selectedReceipt.memberName}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Plan Description:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedReceipt.plan}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Payment Mode:</span>
              <Badge status="info">{selectedReceipt.mode}</Badge>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Date:</span>
              <span style={{ color: 'var(--text-primary)' }}>{formatDate(selectedReceipt.date)}</span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 18,
              paddingTop: 16,
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '1.15rem'
            }}>
              <strong style={{ color: 'var(--text-primary)' }}>Total Amount Paid:</strong>
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

export default PaymentManagementScreen;
