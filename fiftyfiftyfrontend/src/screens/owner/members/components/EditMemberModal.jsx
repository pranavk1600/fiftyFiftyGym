import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Lock } from 'lucide-react';
import { Modal } from '../../../../shared/components/Modal/Modal';
import { Input } from '../../../../shared/components/Input/Input';
import { Button } from '../../../../shared/components/Button/Button';

export const EditMemberModal = ({
  isOpen,
  onClose,
  onSubmit,
  member,
  isSubmitting,
  plans = []
}) => {
  const [form, setForm] = useState({
    customMemberId: '',
    name: '',
    phone: '',
    email: '',
    membershipType: '',
    plan: '',
    durationMonths: 1,
    paymentDate: '',
    joinDate: '',
    expiryDate: '',
    totalAmount: 0,
    paidAmount: 0,
    balanceAmount: 0,
    receiptNumber: '',
    status: 'active'
  });

  useEffect(() => {
    if (member) {
      const total = parseFloat(member.totalAmount || 0);
      const paid = parseFloat(member.paidAmount || 0);
      const bal = member.balanceAmount !== undefined ? parseFloat(member.balanceAmount) : Math.max(0, total - paid);

      setForm({
        customMemberId: member.customMemberId || '',
        name: member.name || '',
        phone: member.phone || '',
        email: member.email || '',
        membershipType: member.membershipType || member.plan || 'Gym + cardio',
        plan: member.plan || member.membershipType || 'Gym + cardio',
        durationMonths: parseInt(member.durationMonths || 1, 10),
        paymentDate: member.paymentDate || member.joinDate || '',
        joinDate: member.joinDate || '',
        expiryDate: member.expiryDate || '',
        totalAmount: total,
        paidAmount: paid,
        balanceAmount: bal,
        receiptNumber: member.receiptNumber || '',
        status: member.status || 'active'
      });
    }
  }, [member]);

  const calculateEndDate = (startDateStr, months = 1) => {
    const start = startDateStr ? new Date(startDateStr) : new Date();
    if (isNaN(start.getTime())) return '';
    const d = new Date(start);
    d.setMonth(d.getMonth() + parseInt(months || 1, 10));
    return d.toISOString().split('T')[0];
  };

  const handleDurationChange = (months) => {
    const m = parseInt(months, 10) || 1;
    const newEnd = calculateEndDate(form.joinDate, m);
    setForm((prev) => ({
      ...prev,
      durationMonths: m,
      expiryDate: newEnd
    }));
  };

  const handleJoinDateChange = (date) => {
    const newEnd = calculateEndDate(date, form.durationMonths);
    setForm((prev) => ({
      ...prev,
      joinDate: date,
      expiryDate: newEnd
    }));
  };

  const handleTotalChange = (val) => {
    const total = parseFloat(val) || 0;
    const paid = parseFloat(form.paidAmount) || 0;
    setForm((prev) => ({
      ...prev,
      totalAmount: val,
      balanceAmount: Math.max(0, total - paid)
    }));
  };

  const handlePaidChange = (val) => {
    const total = parseFloat(form.totalAmount) || 0;
    const paid = parseFloat(val) || 0;
    setForm((prev) => ({
      ...prev,
      paidAmount: val,
      balanceAmount: Math.max(0, total - paid)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      totalAmount: parseFloat(form.totalAmount) || 0,
      paidAmount: parseFloat(form.paidAmount) || 0,
      balanceAmount: parseFloat(form.balanceAmount) || 0
    });
  };

  if (!member) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title={`Edit Member: ${member.name} (${member.customMemberId || member.id})`}
      maxWidth={680}
      footer={
        <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <RefreshCw size={16} className="spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Section 1: Member Identity */}
        <div className="form-section-title">1. Member Identity & Contact</div>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 14 }}>
          <Input
            label="ID"
            name="customMemberId"
            value={form.customMemberId}
            onChange={(e) => setForm({ ...form, customMemberId: e.target.value })}
            disabled={isSubmitting}
          />
          <Input
            label="Full Name"
            name="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            disabled={isSubmitting}
          />
          <Input
            label="Phone Number"
            name="phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
            disabled={isSubmitting}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Input
            label="Email Address"
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={isSubmitting}
          />
          <Input
            label="Membership Type (M Type)"
            name="membershipType"
            value={form.membershipType}
            onChange={(e) => setForm({ ...form, membershipType: e.target.value, plan: e.target.value })}
            disabled={isSubmitting}
          />
        </div>

        {/* Section 2: Dates & Duration */}
        <div className="form-section-title">2. Dates & Duration</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div className="input-group">
            <label className="input-label" htmlFor="edit-payment-date">
              Payment Date
            </label>
            <input
              id="edit-payment-date"
              type="date"
              className="input-control"
              value={form.paymentDate}
              onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
              disabled={isSubmitting}
              style={{ height: '42px', fontSize: '0.85rem' }}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="edit-start-date">
              Start Date
            </label>
            <input
              id="edit-start-date"
              type="date"
              className="input-control"
              value={form.joinDate}
              onChange={(e) => handleJoinDateChange(e.target.value)}
              disabled={isSubmitting}
              style={{ height: '42px', fontSize: '0.85rem' }}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="edit-duration">
              Duration
            </label>
            <select
              id="edit-duration"
              className="input-control"
              value={form.durationMonths}
              onChange={(e) => handleDurationChange(e.target.value)}
              disabled={isSubmitting}
              style={{ height: '42px', fontSize: '0.88rem' }}
            >
              <option value="1">1 Month</option>
              <option value="2">2 Months</option>
              <option value="3">3 Months</option>
              <option value="4">4 Months</option>
              <option value="6">6 Months</option>
              <option value="12">12 Months</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="edit-end-date" style={{ color: '#C2410C' }}>
              End Date
            </label>
            <input
              id="edit-end-date"
              type="date"
              className="input-control"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              disabled={isSubmitting}
              style={{
                height: '42px',
                fontSize: '0.85rem',
                backgroundColor: 'var(--bg-surface-elevated)',
                fontWeight: 600
              }}
            />
          </div>
        </div>

        {/* Section 3: Financials & Receipt */}
        <div className="form-section-title">3. Payment & Receipt</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <Input
            label="Total Am (₹)"
            name="totalAmount"
            type="number"
            value={form.totalAmount}
            onChange={(e) => handleTotalChange(e.target.value)}
            disabled={isSubmitting}
          />

          <Input
            label="Received Am (₹)"
            name="paidAmount"
            type="number"
            value={form.paidAmount}
            onChange={(e) => handlePaidChange(e.target.value)}
            disabled={isSubmitting}
          />

          <div className="input-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="input-label" htmlFor="edit-balance" style={{ marginBottom: 0 }}>
                Bal. Am (₹)
              </label>
              {parseFloat(form.balanceAmount) > 0 && (
                <span style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 700 }}>Due</span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="edit-balance"
                type="number"
                className="input-control"
                value={form.balanceAmount}
                readOnly
                disabled
                style={{
                  height: '42px',
                  backgroundColor: parseFloat(form.balanceAmount) > 0 ? '#FEE2E2' : 'var(--bg-surface-elevated)',
                  color: parseFloat(form.balanceAmount) > 0 ? '#991B1B' : 'var(--text-primary)',
                  fontWeight: 700
                }}
              />
              <Lock
                size={14}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)'
                }}
              />
            </div>
          </div>

          <Input
            label="Rc N (Receipt #)"
            name="receiptNumber"
            value={form.receiptNumber}
            onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })}
            placeholder="4372"
            disabled={isSubmitting}
          />
        </div>
      </form>
    </Modal>
  );
};
