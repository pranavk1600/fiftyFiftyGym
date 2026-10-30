import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Trash2,
  Eye,
  RotateCcw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Mail,
  Send,
  Calendar,
  Lock,
  CheckCircle2,
  Clock,
  Sparkles,
  FileText,
  Download,
  ExternalLink,
  Receipt
} from 'lucide-react';
import { Button } from '../../../shared/components/Button/Button';
import { Table } from '../../../shared/components/Table/Table';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Input } from '../../../shared/components/Input/Input';
import { formatDate } from '../../../shared/utils/formatters';
import { calculateMembershipEndDate } from '../../../shared/utils/dateUtils';
import { useToast } from '../../../context/ToastContext';
import { apiClient } from '../../../shared/services/apiClient';

export const MemberManagementScreen = () => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendingId, setResendingId] = useState(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  // Receipt Modal state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptMember, setReceiptMember] = useState(null);
  const [memberReceipts, setMemberReceipts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isResendingReceipt, setIsResendingReceipt] = useState(false);

  const getInitialJoinDate = () => new Date().toISOString().split('T')[0];

  // Form states
  const [newMemberForm, setNewMemberForm] = useState(() => ({
    name: '',
    phone: '',
    email: '',
    plan: 'General Membership',
    planId: null,
    planDays: 30,
    joinDate: getInitialJoinDate(),
    expiryDate: calculateMembershipEndDate(getInitialJoinDate(), 30),
    status: 'active'
  }));

  // Reset Add Form
  const resetAddForm = () => {
    const today = getInitialJoinDate();
    const defaultPlan = plans[0];
    const days = Number(defaultPlan?.duration_days || defaultPlan?.durationDays) || 30;
    setNewMemberForm({
      name: '',
      phone: '',
      email: '',
      plan: defaultPlan?.name || 'General Membership',
      planId: defaultPlan?.id || null,
      planDays: days,
      joinDate: today,
      expiryDate: calculateMembershipEndDate(today, days),
      status: 'active'
    });
  };

  // Fetch members and plans from database
  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/members');
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) {
        setMembers(data);
      }
    } catch (err) {
      console.warn('[Members Load Notice]:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await apiClient.get('/plans');
      const data = res.data?.data || res.data;
      if (Array.isArray(data) && data.length > 0) {
        setPlans(data);
        const first = data[0];
        const days = Number(first.duration_days || first.durationDays) || 30;
        const today = getInitialJoinDate();
        setNewMemberForm((prev) => ({
          ...prev,
          plan: first.name,
          planId: first.id,
          planDays: days,
          expiryDate: calculateMembershipEndDate(prev.joinDate || today, days)
        }));
      }
    } catch (_e) {}
  };

  useEffect(() => {
    fetchMembers();
    fetchPlans();
  }, []);

  // Update plan and recalculate end date
  const handlePlanSelect = (selectedName) => {
    const found = plans.find((p) => p.name === selectedName || String(p.id) === String(selectedName));
    const days = Number(found?.duration_days || found?.durationDays) || 30;
    const end = calculateMembershipEndDate(newMemberForm.joinDate, days);
    setNewMemberForm((prev) => ({
      ...prev,
      plan: found?.name || selectedName,
      planId: found?.id || null,
      planDays: days,
      expiryDate: end
    }));
  };

  // Update join date and recalculate end date
  const handleJoinDateChange = (newDate) => {
    const days = newMemberForm.planDays || 30;
    const end = calculateMembershipEndDate(newDate, days);
    setNewMemberForm((prev) => ({
      ...prev,
      joinDate: newDate,
      expiryDate: end
    }));
  };

  // Handle Add Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberForm.name.trim()) {
      showToast('Please provide member full name', 'warning');
      return;
    }
    if (!newMemberForm.phone.trim()) {
      showToast('Please provide phone number', 'warning');
      return;
    }
    if (!newMemberForm.email.trim()) {
      showToast('Please provide member email for account invitation', 'warning');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMemberForm.email.trim())) {
      showToast('Please provide a valid email address', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/members', {
        name: newMemberForm.name.trim(),
        phone: newMemberForm.phone.trim(),
        email: newMemberForm.email.trim().toLowerCase(),
        plan: newMemberForm.plan,
        joinDate: newMemberForm.joinDate,
        status: 'active'
      });
      const created = res.data?.data || res.data;
      setMembers((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      resetAddForm();
      showToast(`Member ${created.name || newMemberForm.name} registered and invitation sent!`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to register member', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Resend Invitation
  const handleResendInvitation = async (member) => {
    if (!member.email) {
      showToast('This member has no email address configured.', 'warning');
      return;
    }
    setResendingId(member.id);
    try {
      const res = await apiClient.post(`/members/${member.id}/resend-invitation`);
      const msg = res.data?.message || `Invitation successfully resent to ${member.email}`;
      showToast(msg, 'success');
      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id
            ? { ...m, invitationStatus: 'sent', invitationSentAt: new Date().toISOString() }
            : m
        )
      );
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to resend invitation email', 'danger');
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, invitationStatus: 'failed' } : m))
      );
    } finally {
      setResendingId(null);
    }
  };

  // Handle Edit / Renew
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedMember) return;
    try {
      await apiClient.put(`/members/${selectedMember.id}`, selectedMember);
      setMembers(members.map((m) => (m.id === selectedMember.id ? selectedMember : m)));
      setIsEditModalOpen(false);
      showToast(`Member ${selectedMember.name} updated successfully!`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to update member', 'danger');
    }
  };

  // Handle Delete Confirmation
  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;
    try {
      await apiClient.delete(`/members/${memberToDelete.id}`);
      setMembers(members.filter((m) => m.id !== memberToDelete.id));
      setIsDeleteModalOpen(false);
      showToast(`Member ${memberToDelete.name} has been removed.`, 'info');
      setMemberToDelete(null);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to delete member', 'danger');
    }
  };

  // Open Membership Receipt Modal
  const handleOpenReceiptModal = async (member) => {
    setReceiptMember(member);
    setIsReceiptModalOpen(true);
    setReceiptLoading(true);
    setMemberReceipts([]);
    setSelectedReceipt(null);

    try {
      let receipts = [];
      try {
        const res = await apiClient.get(`/receipts/member/${member.id}`);
        receipts = res.data?.data || res.data || [];
      } catch (firstErr) {
        // Fallback to /members/:id/receipts
        const fbRes = await apiClient.get(`/members/${member.id}/receipts`);
        receipts = fbRes.data?.data || fbRes.data || [];
      }
      setMemberReceipts(receipts);
      if (receipts.length > 0) {
        setSelectedReceipt(receipts[0]);
      }
    } catch (err) {
      console.error('Failed to load member receipts:', err);
      showToast('Could not load receipt details. Please try again.', 'warning');
    } finally {
      setReceiptLoading(false);
    }
  };

  // Resend Receipt Email with PDF attachment via Brevo
  const handleResendReceiptEmail = async (receiptId) => {
    if (!receiptId) return;
    setIsResendingReceipt(true);
    try {
      await apiClient.post(`/receipts/${receiptId}/resend`);
      showToast('Official receipt email successfully resent with PDF attachment!', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to resend receipt email', 'danger');
    } finally {
      setIsResendingReceipt(false);
    }
  };

  // Render invitation badge helper
  const renderInvitationBadge = (status) => {
    const norm = (status || 'pending').toLowerCase();
    if (norm === 'accepted' || norm === 'active') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 12,
          fontSize: '0.75rem',
          fontWeight: 600,
          background: 'rgba(16, 185, 129, 0.12)',
          color: '#10B981',
          border: '1px solid rgba(16, 185, 129, 0.25)'
        }}>
          <CheckCircle2 size={12} /> Active
        </span>
      );
    }
    if (norm === 'sent') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 12,
          fontSize: '0.75rem',
          fontWeight: 600,
          background: 'rgba(255, 107, 0, 0.12)',
          color: '#FF6B00',
          border: '1px solid rgba(255, 107, 0, 0.25)'
        }}>
          <Mail size={12} /> Invited
        </span>
      );
    }
    if (norm === 'failed') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 12,
          fontSize: '0.75rem',
          fontWeight: 600,
          background: 'rgba(239, 68, 68, 0.12)',
          color: '#EF4444',
          border: '1px solid rgba(239, 68, 68, 0.25)'
        }}>
          <AlertTriangle size={12} /> Failed
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: '0.75rem',
        fontWeight: 600,
        background: 'rgba(148, 163, 184, 0.12)',
        color: '#94A3B8',
        border: '1px solid rgba(148, 163, 184, 0.25)'
      }}>
        <Clock size={12} /> Pending
      </span>
    );
  };

  const columns = [
    { header: 'Member ID', key: 'id' },
    {
      header: 'Member Name',
      key: 'name',
      render: (m) => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</span>
          {m.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.email}</div>}
          {m.slug && (
            <div style={{ fontSize: '0.7rem', color: 'var(--brand-primary)', fontFamily: 'monospace' }}>
              /{m.slug}
            </div>
          )}
        </div>
      )
    },
    { header: 'Phone Number', key: 'phone' },
    {
      header: 'Current Plan',
      key: 'plan',
      render: (m) => <span style={{ fontWeight: 500, color: 'var(--brand-primary)' }}>{m.plan || 'No Plan'}</span>
    },
    {
      header: 'Joining Date',
      key: 'joinDate',
      render: (m) => formatDate(m.joinDate)
    },
    {
      header: 'Expiry Date',
      key: 'expiryDate',
      render: (m) => (
        <span style={{ fontWeight: 500, color: m.expiryDate ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
          {m.expiryDate ? formatDate(m.expiryDate) : '—'}
        </span>
      )
    },
    {
      header: 'Invitation',
      key: 'invitationStatus',
      render: (m) => renderInvitationBadge(m.invitationStatus)
    },
    {
      header: 'Status',
      key: 'status',
      render: (m) => <Badge status={m.status} />
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (m) => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSelectedMember(m)}
            title="View Details"
          >
            <Eye size={14} />
            <span>Profile</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenReceiptModal(m)}
            title="View Membership Receipt"
            style={{
              color: 'var(--brand-primary)',
              borderColor: 'rgba(255, 107, 0, 0.35)',
              background: 'rgba(255, 107, 0, 0.05)',
              fontWeight: 500
            }}
          >
            <FileText size={14} />
            <span>Receipt</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleResendInvitation(m)}
            disabled={resendingId === m.id}
            title="Resend Activation Email"
            style={{ color: 'var(--brand-primary)' }}
          >
            {resendingId === m.id ? (
              <RefreshCw size={14} className="spin" />
            ) : (
              <Send size={14} />
            )}
            <span>Invite</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSelectedMember({ ...m });
              setIsEditModalOpen(true);
            }}
            title="Edit / Renew"
          >
            <RotateCcw size={14} />
            <span>Renew</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setMemberToDelete(m);
              setIsDeleteModalOpen(true);
            }}
            style={{ color: 'var(--color-danger)' }}
            title="Delete Member"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  const filteredMembers = members.filter((m) => {
    const nameMatch = m.name ? m.name.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const phoneMatch = m.phone ? m.phone.includes(searchTerm) : false;
    const idMatch = m.id ? m.id.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const emailMatch = m.email ? m.email.toLowerCase().includes(searchTerm.toLowerCase()) : false;
    const matchesSearch = nameMatch || phoneMatch || idMatch || emailMatch;
    const matchesStatus = statusFilter === 'ALL' || (m.status && m.status.toUpperCase() === statusFilter);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="animate-fade-in">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: 4, color: 'var(--text-primary)' }}>Member Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>View, add, search, renew, and invite members to their personal portal</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <UserPlus size={18} />
          <span>Add New Member</span>
        </Button>
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
            placeholder="Search member by name, ID, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Status:</span>
          <select
            className="input-control"
            style={{ width: 'auto', padding: '10px 16px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Members</option>
            <option value="EXPIRED">Expired Members</option>
          </select>
        </div>
      </div>

      {/* Members Table */}
      <Table
        columns={columns}
        data={filteredMembers}
        emptyMessage={
          members.length === 0
            ? "No members registered yet. Click 'Add New Member' to register your first member."
            : "No members found matching your search."
        }
      />

      {/* Pagination Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        padding: '12px 16px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)'
      }}>
        <span>
          Showing <strong>{filteredMembers.length}</strong> of <strong>{members.length}</strong> registered members
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" disabled>
            <ChevronLeft size={16} /> Previous
          </button>
          <button className="btn btn-secondary btn-sm" disabled>
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Improved Compact Centered Add Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          if (!isSubmitting) setIsAddModalOpen(false);
        }}
        title="Add New Gym Member"
        footer={
          <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={isSubmitting}>
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
        <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Subtle Banner explaining invitation dispatch */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: 'var(--brand-primary-light, #FFF7ED)',
            borderRadius: 8,
            border: '1px solid rgba(255, 107, 0, 0.2)',
            fontSize: '0.82rem',
            color: 'var(--brand-primary)'
          }}>
            <Sparkles size={16} style={{ flexShrink: 0 }} />
            <span>A secure invitation link will be sent to the member's email to set up their password.</span>
          </div>

          {/* Form Row 1: Full Name & Phone Number */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <Input
              label="Full Name *"
              name="name"
              placeholder="e.g. Rahul Sharma"
              value={newMemberForm.name}
              onChange={(e) => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
              required
              disabled={isSubmitting}
            />
            <Input
              label="Phone Number *"
              name="phone"
              placeholder="e.g. +91 98765 43210"
              value={newMemberForm.phone}
              onChange={(e) => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Form Row 2: Email & Membership Plan */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <Input
              label="Email Address *"
              name="email"
              type="email"
              placeholder="e.g. rahul@example.com"
              value={newMemberForm.email}
              onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
              required
              disabled={isSubmitting}
            />

            <div className="input-group">
              <label className="input-label">Membership Plan *</label>
              {plans.length > 0 ? (
                <select
                  className="input-control"
                  value={newMemberForm.plan}
                  onChange={(e) => handlePlanSelect(e.target.value)}
                  disabled={isSubmitting}
                  required
                >
                  {plans.map((p) => {
                    const days = p.duration_days || p.durationDays || 30;
                    return (
                      <option key={p.id} value={p.name}>
                        {p.name} (₹{p.price} • {days} Days)
                      </option>
                    );
                  })}
                </select>
              ) : (
                <Input
                  name="plan"
                  placeholder="e.g. Standard Membership"
                  value={newMemberForm.plan}
                  onChange={(e) => handlePlanSelect(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              )}
            </div>
          </div>

          {/* Form Row 3: Joining Date & Membership End Date (Auto-calculated, read-only) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">Joining Date *</label>
              <input
                type="date"
                className="input-control"
                value={newMemberForm.joinDate}
                onChange={(e) => handleJoinDateChange(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Membership End Date</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--brand-primary)', fontWeight: 600 }}>
                  Auto-calculated ({newMemberForm.planDays || 30} days)
                </span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  className="input-control"
                  value={newMemberForm.expiryDate}
                  readOnly
                  disabled
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated, #F8FAFC)',
                    cursor: 'not-allowed',
                    color: 'var(--text-primary)',
                    fontWeight: 600
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
          </div>
        </form>
      </Modal>

      {/* View Member Profile Modal */}
      <Modal
        isOpen={Boolean(selectedMember && !isEditModalOpen)}
        onClose={() => setSelectedMember(null)}
        title="Member Profile Details"
        footer={
          <Button variant="secondary" onClick={() => setSelectedMember(null)}>
            Close Profile
          </Button>
        }
      >
        {selectedMember && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              background: 'var(--bg-surface-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: 2, color: 'var(--text-primary)' }}>{selectedMember.name}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID: {selectedMember.id}</span>
                {selectedMember.slug && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--brand-primary)', marginLeft: 8, fontFamily: 'monospace' }}>
                    /{selectedMember.slug}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {renderInvitationBadge(selectedMember.invitationStatus)}
                <Badge status={selectedMember.status} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ padding: 12, background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Contact Phone</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{selectedMember.phone}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Email</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{selectedMember.email || 'N/A'}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Assigned Plan</div>
                <div style={{ fontWeight: 600, color: 'var(--brand-primary)', marginTop: 2 }}>{selectedMember.plan || 'None'}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Joining Date</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{formatDate(selectedMember.joinDate)}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Expiry Date</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {selectedMember.expiryDate ? formatDate(selectedMember.expiryDate) : 'N/A'}
                </div>
              </div>
              <div style={{ padding: 12, background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Invitation Status</div>
                <div style={{ marginTop: 4 }}>{renderInvitationBadge(selectedMember.invitationStatus)}</div>
              </div>
            </div>

            <div style={{
              padding: 16,
              background: 'var(--brand-primary-soft)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--brand-primary-soft-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Completed Check-ins:</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                  {selectedMember.visits || 0} Workouts
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleResendInvitation(selectedMember)}
                  disabled={resendingId === selectedMember.id}
                >
                  <Send size={14} />
                  <span>Resend Invite</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const m = selectedMember;
                    setSelectedMember({ ...m });
                    setIsEditModalOpen(true);
                  }}
                >
                  Renew Plan
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit / Renew Member Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit / Renew Membership"
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Updates
            </Button>
          </div>
        }
      >
        {selectedMember && (
          <form onSubmit={handleSaveEdit}>
            <Input
              label="Member Full Name"
              name="name"
              value={selectedMember.name}
              onChange={(e) => setSelectedMember({ ...selectedMember, name: e.target.value })}
              required
            />
            <Input
              label="Phone Number"
              name="phone"
              value={selectedMember.phone}
              onChange={(e) => setSelectedMember({ ...selectedMember, phone: e.target.value })}
              required
            />
            <div className="input-group">
              <label className="input-label">Membership Plan</label>
              {plans.length > 0 ? (
                <select
                  className="input-control"
                  value={selectedMember.plan}
                  onChange={(e) => setSelectedMember({ ...selectedMember, plan: e.target.value })}
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} (₹{p.price})
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  name="plan"
                  value={selectedMember.plan || ''}
                  onChange={(e) => setSelectedMember({ ...selectedMember, plan: e.target.value })}
                />
              )}
            </div>
            <div className="input-group">
              <label className="input-label">Membership Status</label>
              <select
                className="input-control"
                value={selectedMember.status}
                onChange={(e) => setSelectedMember({ ...selectedMember, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Member Deletion"
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteMember}>
              Delete Member
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 4 }}>
              Are you sure you want to remove this member?
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Member <strong>{memberToDelete?.name}</strong> ({memberToDelete?.id}) will be permanently deleted from the gym records.
            </p>
          </div>
        </div>
      </Modal>

      {/* Receipt Details Modal */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title={selectedReceipt ? `Receipt: ${selectedReceipt.receiptNumber}` : 'Membership Receipt'}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 10, flexWrap: 'wrap' }}>
            <div>
              {selectedReceipt && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleResendReceiptEmail(selectedReceipt.id)}
                  disabled={isResendingReceipt}
                  title="Resend receipt with PDF via Brevo"
                  style={{ color: 'var(--brand-primary)', borderColor: 'rgba(255, 107, 0, 0.3)' }}
                >
                  {isResendingReceipt ? <RefreshCw size={14} className="spin" /> : <Send size={14} />}
                  <span>Resend Receipt Email</span>
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" onClick={() => setIsReceiptModalOpen(false)}>
                Close
              </Button>
              {selectedReceipt?.previewUrl && (
                <Button
                  variant="secondary"
                  onClick={() => window.open(selectedReceipt.previewUrl, '_blank', 'noopener,noreferrer')}
                  title="Preview PDF in new tab"
                >
                  <ExternalLink size={15} />
                  <span>Preview PDF</span>
                </Button>
              )}
              {selectedReceipt?.downloadUrl && (
                <a
                  href={selectedReceipt.downloadUrl}
                  download={`${selectedReceipt.receiptNumber || 'receipt'}.pdf`}
                  className="btn btn-primary"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  title="Download Official PDF Receipt"
                >
                  <Download size={15} />
                  <span>Download PDF</span>
                </a>
              )}
            </div>
          </div>
        }
      >
        {receiptLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <RefreshCw size={28} className="spin" style={{ color: 'var(--brand-primary)', marginBottom: 12 }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Retrieving official receipt and generating signed access links...
            </p>
          </div>
        ) : memberReceipts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12
            }}>
              <FileText size={26} />
            </div>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: 6 }}>No Receipt Available</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: 380, margin: '0 auto' }}>
              No official receipt has been issued yet for <strong>{receiptMember?.name}</strong>. A receipt is automatically generated upon member registration or when recording a membership payment.
            </p>
          </div>
        ) : (
          <div>
            {/* Multiple Receipts Selector */}
            {memberReceipts.length > 1 && (
              <div style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                paddingBottom: 12,
                marginBottom: 16,
                borderBottom: '1px solid var(--border-subtle)'
              }}>
                {memberReceipts.map((rcp) => {
                  const isSel = selectedReceipt?.id === rcp.id;
                  return (
                    <button
                      key={rcp.id}
                      type="button"
                      onClick={() => setSelectedReceipt(rcp)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: isSel ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                        background: isSel ? 'var(--brand-primary-light, #FFF7ED)' : 'var(--bg-surface-elevated)',
                        color: isSel ? 'var(--brand-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {rcp.receiptNumber} ({rcp.paymentStatus === 'PAID' ? 'PAID' : 'PENDING'})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Receipt Summary Card */}
            {selectedReceipt && (
              <div style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}>
                {/* Header Banner */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: 14,
                  flexWrap: 'wrap',
                  gap: 10
                }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--brand-primary)', fontWeight: 700, letterSpacing: '0.05em' }}>
                      {selectedReceipt.receiptType === 'PAYMENT_RECEIPT' ? 'Official Payment Receipt' : 'Registration Acknowledgement'}
                    </span>
                    <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginTop: 2, fontWeight: 700 }}>
                      {selectedReceipt.receiptNumber}
                    </h3>
                  </div>
                  <div>
                    {selectedReceipt.paymentStatus === 'PAID' ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#10B981',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}>
                        <CheckCircle2 size={14} /> PAID
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        background: 'rgba(255, 107, 0, 0.12)',
                        color: '#FF6B00',
                        border: '1px solid rgba(255, 107, 0, 0.3)'
                      }}>
                        <Clock size={14} /> PAYMENT PENDING
                      </span>
                    )}
                  </div>
                </div>

                {/* Grid of metadata */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '14px 20px',
                  fontSize: '0.875rem'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Member Name</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                      {receiptMember?.name || selectedReceipt.memberName}
                    </div>
                    {receiptMember?.email && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{receiptMember.email}</div>
                    )}
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Gym Facility</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                      {selectedReceipt.gymName || 'FiftyFifty Gym'}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Membership Plan</span>
                    <div style={{ fontWeight: 600, color: 'var(--brand-primary)', marginTop: 2 }}>
                      {selectedReceipt.planName}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Membership Amount</span>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.05rem', marginTop: 2 }}>
                      ₹{parseFloat(selectedReceipt.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Membership Validity</span>
                    <div style={{ fontWeight: 500, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {formatDate(receiptMember?.joinDate || selectedReceipt.issuedDate)} → {formatDate(receiptMember?.expiryDate || '—')}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Issue Date</span>
                    <div style={{ fontWeight: 500, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {formatDate(selectedReceipt.issuedDate || selectedReceipt.createdAt)}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Payment Mode</span>
                    <div style={{ fontWeight: 500, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {selectedReceipt.paymentMode || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Reference / Transaction ID</span>
                    <div style={{ fontWeight: 500, color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.8rem', marginTop: 2 }}>
                      {selectedReceipt.paymentReference || 'N/A'}
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '10px 14px',
                  background: 'var(--bg-surface)',
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <Sparkles size={14} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
                  <span>
                    Secured by Supabase Private Storage with HMAC-verified 15-minute expiring access tokens.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MemberManagementScreen;
