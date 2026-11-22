import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Lock, User, Calendar, CreditCard } from 'lucide-react';
import { Modal } from '../../../../shared/components/Modal/Modal';
import { Button } from '../../../../shared/components/Button/Button';
import { PlanSelectDropdown } from './PlanSelectDropdown';

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

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

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
      setErrors({});
      setTouched({});
    }
  }, [member]);

  const calculateEndDate = (startDateStr, months = 1) => {
    const start = startDateStr ? new Date(startDateStr) : new Date();
    if (isNaN(start.getTime())) return '';
    const d = new Date(start);
    d.setMonth(d.getMonth() + parseInt(months || 1, 10));
    return d.toISOString().split('T')[0];
  };

  // Validation function
  const validateField = (fieldName, value, currentForm = form) => {
    let error = '';
    if (fieldName === 'customMemberId') {
      if (!value || !String(value).trim()) error = 'Member ID is required';
    } else if (fieldName === 'name') {
      if (!value || !value.trim()) error = 'Full name is required';
      else if (value.trim().length < 2) error = 'Name must be at least 2 characters';
    } else if (fieldName === 'phone') {
      const digits = (value || '').replace(/\D/g, '');
      if (!value || !value.trim()) error = 'Phone number is required';
      else if (digits.length !== 10) error = 'Enter a valid 10-digit mobile number';
    } else if (fieldName === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value || !value.trim()) error = 'Email address is required';
      else if (!emailRegex.test(value.trim())) error = 'Enter a valid email address';
    } else if (fieldName === 'totalAmount') {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) error = 'Total amount must be ₹0 or greater';
    } else if (fieldName === 'paidAmount') {
      const num = parseFloat(value);
      const total = parseFloat(currentForm.totalAmount) || 0;
      if (isNaN(num) || num < 0) error = 'Received amount must be ₹0 or greater';
      else if (num > total) error = 'Received amount cannot exceed total fee';
    }
    return error;
  };

  const handleBlur = (fieldName) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    const error = validateField(fieldName, form[fieldName]);
    setErrors((prev) => ({ ...prev, [fieldName]: error }));
  };

  const handleChange = (fieldName, value) => {
    let cleanValue = value;
    if (fieldName === 'phone') {
      cleanValue = String(value).replace(/\D/g, '').slice(0, 10);
    }
    setForm((prev) => {
      const updated = { ...prev, [fieldName]: cleanValue };
      if (touched[fieldName]) {
        const error = validateField(fieldName, cleanValue, updated);
        setErrors((errs) => ({ ...errs, [fieldName]: error }));
      }
      return updated;
    });
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
    const balance = Math.max(0, total - paid);
    setForm((prev) => {
      const updated = { ...prev, totalAmount: val, balanceAmount: balance };
      if (touched.totalAmount) {
        setErrors((errs) => ({
          ...errs,
          totalAmount: validateField('totalAmount', val, updated),
          paidAmount: touched.paidAmount ? validateField('paidAmount', form.paidAmount, updated) : errs.paidAmount
        }));
      }
      return updated;
    });
  };

  const handlePaidChange = (val) => {
    const total = parseFloat(form.totalAmount) || 0;
    const paid = parseFloat(val) || 0;
    const balance = Math.max(0, total - paid);
    setForm((prev) => {
      const updated = { ...prev, paidAmount: val, balanceAmount: balance };
      if (touched.paidAmount) {
        setErrors((errs) => ({
          ...errs,
          paidAmount: validateField('paidAmount', val, updated)
        }));
      }
      return updated;
    });
  };

  const handlePlanSelect = (planName) => {
    const selected = plans.find((p) => p.name === planName);
    const durationDays = selected ? selected.duration_days || selected.durationDays || 30 : 30;
    const months = durationDays >= 360 ? 12 : durationDays >= 180 ? 6 : durationDays >= 90 ? 3 : 1;
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

    setErrors((prev) => ({
      ...prev,
      totalAmount: '',
      paidAmount: ''
    }));
  };

  const validateAll = () => {
    const fieldsToValidate = ['customMemberId', 'name', 'phone', 'email', 'totalAmount', 'paidAmount'];
    const newErrors = {};
    const newTouched = {};

    fieldsToValidate.forEach((f) => {
      newTouched[f] = true;
      const err = validateField(f, form[f]);
      if (err) newErrors[f] = err;
    });

    setTouched((prev) => ({ ...prev, ...newTouched }));
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateAll()) {
      return;
    }

    onSubmit({
      ...form,
      receiptNumber: form.customMemberId,
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
        <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
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
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Section 1: Member Identity */}
        <div className="modal-form-card">
          <div className="modal-card-header">
            <User size={16} className="modal-card-icon" />
            <span>Member Information</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 14 }}>
            <div className="input-group">
              <label className="input-label" htmlFor="edit-member-id">
                ID
              </label>
              <input
                id="edit-member-id"
                type="text"
                className="input-control"
                value={form.customMemberId}
                readOnly
                disabled
                style={{
                  textAlign: 'center',
                  fontWeight: 700,
                  backgroundColor: 'var(--bg-surface-elevated, #F8FAFC)',
                  color: 'var(--text-primary)',
                  cursor: 'default'
                }}
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="edit-member-name">
                Full Name <span className="label-required">*</span>
              </label>
              <input
                id="edit-member-name"
                type="text"
                className={`input-control ${errors.name ? 'input-error is-invalid' : ''}`}
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                disabled={isSubmitting}
              />
              {errors.name && <span className="form-error-text">{errors.name}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
            <div className="input-group">
              <label className="input-label" htmlFor="edit-member-phone">
                Phone Number <span className="label-required">*</span>
              </label>
              <input
                id="edit-member-phone"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                className={`input-control ${errors.phone ? 'input-error is-invalid' : ''}`}
                placeholder="10-digit mobile number"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                onBlur={() => handleBlur('phone')}
                onKeyDown={(e) => {
                  if (['Backspace', 'Tab', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) return;
                  if (!/^[0-9]$/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                disabled={isSubmitting}
              />
              {errors.phone && <span className="form-error-text">{errors.phone}</span>}
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="edit-member-email">
                Email Address <span className="label-required">*</span>
              </label>
              <input
                id="edit-member-email"
                type="email"
                className={`input-control ${errors.email ? 'input-error is-invalid' : ''}`}
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                disabled={isSubmitting}
              />
              {errors.email && <span className="form-error-text">{errors.email}</span>}
            </div>
          </div>
        </div>

        {/* Section 2: Membership Plan & Dates */}
        <div className="modal-form-card">
          <div className="modal-card-header">
            <Calendar size={16} className="modal-card-icon" />
            <span>Membership & Validity</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14 }}>
            <div className="input-group">
              <label className="input-label" htmlFor="edit-membership-type">
                Membership Type <span className="label-required">*</span>
              </label>
              <input
                id="edit-membership-type"
                type="text"
                className="input-control"
                value={form.membershipType}
                onChange={(e) => handleChange('membershipType', e.target.value)}
                placeholder="e.g. Gym + cardio"
                disabled={isSubmitting}
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="edit-select-plan">
                Select Plan <span className="label-required">*</span>
              </label>
              <PlanSelectDropdown
                plans={plans}
                selectedPlanName={form.plan}
                selectedMonths={form.durationMonths}
                onSelectPlan={(selected) => {
                  const months = selected.durationMonths || 1;
                  const newEnd = calculateEndDate(form.joinDate, months);
                  const price = selected.price !== undefined ? selected.price : form.totalAmount;
                  setForm((prev) => ({
                    ...prev,
                    plan: selected.name,
                    durationMonths: months,
                    expiryDate: newEnd,
                    totalAmount: price,
                    paidAmount: price,
                    balanceAmount: 0
                  }));
                  setErrors((errs) => ({ ...errs, totalAmount: '', paidAmount: '' }));
                }}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
            <div className="input-group">
              <label className="input-label" htmlFor="edit-member-payment-date">
                Payment Date
              </label>
              <input
                id="edit-member-payment-date"
                type="date"
                className="input-control"
                value={form.paymentDate}
                onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                disabled={isSubmitting}
                style={{ height: '42px', fontSize: '0.85rem' }}
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="edit-member-start-date">
                Start Date
              </label>
              <input
                id="edit-member-start-date"
                type="date"
                className="input-control"
                value={form.joinDate}
                onChange={(e) => handleJoinDateChange(e.target.value)}
                disabled={isSubmitting}
                style={{ height: '42px', fontSize: '0.85rem' }}
              />
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="input-label" htmlFor="edit-member-end-date" style={{ marginBottom: 0 }}>
                  End Date
                </label>
                <span className="auto-calc-badge">Auto</span>
              </div>
              <input
                id="edit-member-end-date"
                type="date"
                className="input-control"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                disabled={isSubmitting}
                style={{
                  height: '42px',
                  fontSize: '0.85rem',
                  backgroundColor: 'var(--bg-surface-elevated, #F8FAFC)',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Billing & Receipt */}
        <div className="modal-form-card">
          <div className="modal-card-header">
            <CreditCard size={16} className="modal-card-icon" />
            <span>Billing & Receipt Details</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div className="input-group">
              <label className="input-label" htmlFor="edit-member-total">
                Total Fee (₹) <span className="label-required">*</span>
              </label>
              <input
                id="edit-member-total"
                type="number"
                min="0"
                className={`input-control ${errors.totalAmount ? 'input-error is-invalid' : ''}`}
                value={form.totalAmount}
                onChange={(e) => handleTotalChange(e.target.value)}
                onBlur={() => handleBlur('totalAmount')}
                disabled={isSubmitting}
                style={{ fontWeight: 600 }}
              />
              {errors.totalAmount && <span className="form-error-text">{errors.totalAmount}</span>}
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="edit-member-paid">
                Received (₹) <span className="label-required">*</span>
              </label>
              <input
                id="edit-member-paid"
                type="number"
                min="0"
                className={`input-control ${errors.paidAmount ? 'input-error is-invalid' : ''}`}
                value={form.paidAmount}
                onChange={(e) => handlePaidChange(e.target.value)}
                onBlur={() => handleBlur('paidAmount')}
                disabled={isSubmitting}
                style={{ fontWeight: 600, color: 'var(--color-success, #16A34A)' }}
              />
              {errors.paidAmount && <span className="form-error-text">{errors.paidAmount}</span>}
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="input-label" htmlFor="edit-member-balance" style={{ marginBottom: 0 }}>
                  Balance Due
                </label>
                {parseFloat(form.balanceAmount) > 0 && <span className="due-pill">Due</span>}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="edit-member-balance"
                  type="text"
                  className="input-control"
                  value={`₹${form.balanceAmount}`}
                  readOnly
                  disabled
                  style={{
                    height: '42px',
                    backgroundColor: parseFloat(form.balanceAmount) > 0 ? '#FEE2E2' : 'var(--bg-surface-elevated, #F8FAFC)',
                    color: parseFloat(form.balanceAmount) > 0 ? '#991B1B' : '#166534',
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
                    color: 'var(--text-muted)'
                  }}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="edit-member-receipt-no">
                Receipt Number
              </label>
              <input
                id="edit-member-receipt-no"
                type="text"
                className="input-control"
                value={form.customMemberId}
                readOnly
                disabled
                style={{
                  fontWeight: 700,
                  backgroundColor: 'var(--bg-surface-elevated, #F8FAFC)',
                  color: 'var(--text-primary)',
                  cursor: 'default'
                }}
              />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
