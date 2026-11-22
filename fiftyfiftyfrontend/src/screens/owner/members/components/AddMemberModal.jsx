import React, { useState, useEffect } from 'react';
import { UserPlus, RefreshCw, Sparkles, Lock, Calculator } from 'lucide-react';
import { Modal } from '../../../../shared/components/Modal/Modal';
import { Input } from '../../../../shared/components/Input/Input';
import { Button } from '../../../../shared/components/Button/Button';

export const AddMemberModal = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  plans = [],
  nextId = '2106',
  nextReceiptNo = '4372'
}) => {
  const getToday = () => new Date().toISOString().split('T')[0];

  const calculateEndDate = (startDateStr, months = 1) => {
    const start = startDateStr ? new Date(startDateStr) : new Date();
    if (isNaN(start.getTime())) return getToday();
    const d = new Date(start);
    d.setMonth(d.getMonth() + parseInt(months || 1, 10));
    return d.toISOString().split('T')[0];
  };

  const [form, setForm] = useState({
    customMemberId: nextId,
    name: '',
    phone: '',
    email: '',
    membershipType: 'Gym + cardio',
    plan: '',
    durationMonths: 1,
    paymentDate: getToday(),
    joinDate: getToday(),
    expiryDate: calculateEndDate(getToday(), 1),
    totalAmount: 1200,
    paidAmount: 1200,
    balanceAmount: 0,
    receiptNumber: nextReceiptNo
  });

  // Keep ID and receipt number updated when prop changes
  useEffect(() => {
    if (nextId) {
      setForm((prev) => ({
        ...prev,
        customMemberId: prev.customMemberId && prev.customMemberId !== '2106' ? prev.customMemberId : nextId
      }));
    }
  }, [nextId]);

  useEffect(() => {
    if (nextReceiptNo) {
      setForm((prev) => ({
        ...prev,
        receiptNumber: prev.receiptNumber && prev.receiptNumber !== '4372' ? prev.receiptNumber : nextReceiptNo
      }));
    }
  }, [nextReceiptNo]);

  // Recalculate end date whenever joinDate or durationMonths changes
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

  // Recalculate balance amount whenever total or paid amount changes
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

  const handlePlanSelect = (planName) => {
    const selected = plans.find((p) => p.name === planName);
    const durationDays = selected ? (selected.duration_days || selected.durationDays || 30) : 30;
    const months = durationDays >= 360 ? 12 : (durationDays >= 180 ? 6 : (durationDays >= 90 ? 3 : 1));
    const price = selected?.price ? parseFloat(selected.price) : 1200;
    const newEnd = calculateEndDate(form.joinDate, months);

    setForm((prev) => ({
      ...prev,
      plan: planName,
      membershipType: planName,
      durationMonths: months,
      expiryDate: newEnd,
      totalAmount: price,
      paidAmount: price,
      balanceAmount: 0
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Add New Gym Member (Excel Aligned)"
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
                <span>Registering...</span>
              </>
            ) : (
              <>
                <UserPlus size={16} />
                <span>Register & Send Invitation</span>
              </>
            )}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: 'var(--brand-primary-light, #FFF7ED)',
            borderRadius: 8,
            border: '1px solid rgba(255, 107, 0, 0.2)',
            fontSize: '0.84rem',
            color: 'var(--brand-primary)'
          }}
        >
          <Sparkles size={16} style={{ flexShrink: 0 }} />
          <span>This member record will be saved matching your Excel sheet columns and send an activation invite.</span>
        </div>

        {/* Section 1: Member Identity */}
        <div className="form-section-title">1. Member Identity & Contact</div>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 14 }}>
          <Input
            label="ID"
            name="customMemberId"
            value={form.customMemberId}
            onChange={(e) => setForm({ ...form, customMemberId: e.target.value })}
            placeholder="2106"
            required
            disabled={isSubmitting}
          />
          <Input
            label="Full Name"
            name="name"
            placeholder="e.g. Yasa Jadhav"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            disabled={isSubmitting}
          />
          <Input
            label="Phone Number"
            name="phone"
            placeholder="e.g. 9876543210"
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
            placeholder="e.g. yasa@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            disabled={isSubmitting}
          />
          <div className="input-group">
            <label className="input-label" htmlFor="add-m-type">
              Membership Type (M Type) <span style={{ color: 'var(--color-danger, #DC2626)' }}>*</span>
            </label>
            {plans.length > 0 ? (
              <select
                id="add-m-type"
                className="input-control"
                value={form.membershipType}
                onChange={(e) => handlePlanSelect(e.target.value)}
                disabled={isSubmitting}
                style={{ height: '42px', fontSize: '0.9rem' }}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} (₹{p.price})
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="add-m-type"
                className="input-control"
                value={form.membershipType}
                onChange={(e) => setForm({ ...form, membershipType: e.target.value, plan: e.target.value })}
                placeholder="Gym + cardio"
                disabled={isSubmitting}
                style={{ height: '42px', fontSize: '0.9rem' }}
              />
            )}
          </div>
        </div>

        {/* Section 2: Dates & Duration */}
        <div className="form-section-title">2. Dates & Plan Duration</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div className="input-group">
            <label className="input-label" htmlFor="add-payment-date">
              Payment Date
            </label>
            <input
              id="add-payment-date"
              type="date"
              className="input-control"
              value={form.paymentDate}
              onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
              disabled={isSubmitting}
              style={{ height: '42px', fontSize: '0.85rem' }}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="add-start-date">
              Start Date (Start D)
            </label>
            <input
              id="add-start-date"
              type="date"
              className="input-control"
              value={form.joinDate}
              onChange={(e) => handleJoinDateChange(e.target.value)}
              disabled={isSubmitting}
              style={{ height: '42px', fontSize: '0.85rem' }}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="add-duration">
              Duration
            </label>
            <select
              id="add-duration"
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
            <label className="input-label" htmlFor="add-end-date" style={{ color: '#C2410C' }}>
              End Date (End D)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="add-end-date"
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
              <label className="input-label" htmlFor="add-balance" style={{ marginBottom: 0 }}>
                Bal. Am (₹)
              </label>
              {parseFloat(form.balanceAmount) > 0 && (
                <span style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 700 }}>Due</span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="add-balance"
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
