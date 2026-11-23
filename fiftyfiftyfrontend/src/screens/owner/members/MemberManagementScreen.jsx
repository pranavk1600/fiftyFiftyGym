import React, { useState, useEffect, useMemo } from 'react';
import { UserPlus, ChevronLeft, ChevronRight, Upload, Trash2, RefreshCw, Search, X } from 'lucide-react';
import { Button } from '../../../shared/components/Button/Button';
import { Table } from '../../../shared/components/Table/Table';
import { ImportMembersModal } from './ImportMembersModal';
import { useToast } from '../../../context/ToastContext';
import { apiClient } from '../../../shared/services/apiClient';

import { formatExcelDate } from '../../../shared/utils/formatters';

// Modular Subcomponents & Columns
import { getMemberColumns } from './components/memberTableColumns';
import { AddMemberModal } from './components/AddMemberModal';
import { EditMemberModal } from './components/EditMemberModal';
import { MemberProfileModal } from './components/MemberProfileModal';
import { ReceiptViewerModal } from './components/ReceiptViewerModal';
import { CustomAlertModal } from './components/CustomAlertModal';

// Styles
import './styles/memberManagement.css';

export const MemberManagementScreen = () => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendingId, setResendingId] = useState(null);

  // Selection & Bulk Actions state
  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);

  // Custom Alert Modal state
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'warning',
    title: '',
    message: '',
    details: null,
    existingMember: null,
    confirmText: 'Got It',
    cancelText: null,
    onConfirm: null
  });

  const showAlert = ({
    type = 'warning',
    title = 'Notice',
    message = '',
    details = null,
    existingMember = null,
    confirmText = 'Got It',
    cancelText = null,
    onConfirm = null
  }) => {
    setAlertModal({
      isOpen: true,
      type,
      title,
      message,
      details,
      existingMember,
      confirmText,
      cancelText,
      onConfirm
    });
  };

  const closeAlert = () => {
    setAlertModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Receipt Modal state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptMember, setReceiptMember] = useState(null);
  const [memberReceipts, setMemberReceipts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isResendingReceipt, setIsResendingReceipt] = useState(false);

  // Compute next sequential Member ID (ID and Receipt No are identical numbers, incremented by 1)
  const nextId = useMemo(() => {
    const nums = members
      .map((m) => {
        const raw = m.customMemberId || m.id;
        if (!raw) return null;
        if (/^\d+$/.test(String(raw).trim())) {
          return parseInt(String(raw).trim(), 10);
        }
        const mDigits = String(raw).match(/\d+/);
        return mDigits ? parseInt(mDigits[0], 10) : null;
      })
      .filter((n) => n !== null && !isNaN(n) && n > 0);
    return nums.length > 0 ? String(Math.max(...nums) + 1) : '1001';
  }, [members]);

  const nextReceiptNo = nextId;

  // Fetch members and plans
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
      }
    } catch (_e) { }
  };

  useEffect(() => {
    fetchMembers();
    fetchPlans();
  }, []);

  // Handle Add Member & Open WhatsApp Web
  const handleAddMember = async (formData) => {
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/members', formData);
      const created = res.data?.data || res.data;
      setMembers((prev) => [created, ...prev]);
      setIsAddModalOpen(false);

      const emailSent = Boolean(created.email && created.emailStatus === 'sent');
      const emailNote = emailSent ? ` and invitation email sent to ${created.email}` : '';
      showToast(`Member ${created.name || formData.name} registered${emailNote}! Opening WhatsApp chat...`, 'success');

      // WhatsApp Web Chat Integration: open chat with pre-filled message
      const memberPhone = created.phone || formData.phone;
      if (memberPhone) {
        const digits = String(memberPhone).replace(/\D/g, '');
        const cleanPhone = digits.length === 10 ? `91${digits}` : digits;

        const gymName = created.gymName || 'FiftyFifty Gym';
        const memberName = created.name || formData.name;
        const idNo = created.id || created.customMemberId || formData.customMemberId || created.receiptNumber || formData.receiptNumber;
        const planName = created.plan || formData.plan || formData.membershipType || 'Gym + cardio';
        const durationMonths = created.durationMonths || formData.durationMonths || 1;
        const startDate = formatExcelDate(created.joinDate || formData.joinDate);
        const endDate = formatExcelDate(created.expiryDate || formData.expiryDate);
        const total = created.totalAmount !== undefined ? created.totalAmount : formData.totalAmount;
        const paid = created.paidAmount !== undefined ? created.paidAmount : formData.paidAmount;
        const balance = created.balanceAmount !== undefined ? created.balanceAmount : formData.balanceAmount;

        // Ensure base URL is https://leopardxgyms.vercel.app
        let activationUrl = created.activationUrl;
        let loginUrl = created.loginUrl;
        if (loginUrl) {
          loginUrl = loginUrl.replace(/^https?:\/\/[^\/]+/, 'https://leopardxgyms.vercel.app');
        }
        if (activationUrl) {
          activationUrl = activationUrl.replace(/^https?:\/\/[^\/]+/, 'https://leopardxgyms.vercel.app');
        }

        const msgLines = [
          `🏋️‍♂️ *WELCOME TO ${gymName.toUpperCase()}*`,
          ``,
          `Hello *${memberName}*,`,
          `Your gym membership has been successfully registered! Below are your membership and billing details:`,
          ``,
          `📋 *MEMBERSHIP SUMMARY:*`,
          `• *Member ID / Receipt #:* ${idNo}`,
          `• *Plan:* ${planName}`,
          `• *Duration:* ${durationMonths} Month(s)`,
          `• *Start Date:* ${startDate}`,
          `• *Expiry Date:* ${endDate}`,
          ``,
          `💰 *PAYMENT DETAILS:*`,
          `• *Total Fee:* ₹${total}`,
          `• *Amount Paid:* ₹${paid}`,
          `• *Balance Due:* ₹${balance}`
        ];

        if (activationUrl) {
          msgLines.push(
            ``,
            `🔑 *ACTIVATE YOUR MEMBER ACCOUNT:*`,
            `Click the link below to set your password and access your member portal:`,
            `${activationUrl}`
          );
        }

        if (loginUrl) {
          msgLines.push(
            ``,
            `📲 *Member Login Portal:*`,
            `${loginUrl}`
          );
        }

        msgLines.push(
          ``,
          `Thank you for choosing *${gymName}*! Stay fit and healthy! 💪🔥`
        );

        const waText = encodeURIComponent(msgLines.join('\n'));
        const whatsappUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${waText}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.errorType === 'DUPLICATE_PHONE') {
        showAlert({
          type: 'warning',
          title: 'Number Already Exists',
          message: errData.message || 'Number already exists, use a different number',
          existingMember: errData.existingMember,
          confirmText: 'Change Number'
        });
      } else {
        showAlert({
          type: 'danger',
          title: 'Registration Failed',
          message: errData?.message || err.message || 'Failed to register member',
          confirmText: 'Close'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Member
  const handleSaveEdit = async (formData) => {
    if (!memberToEdit) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.put(`/members/${memberToEdit.id}`, formData);
      const updated = res.data?.data || res.data || { ...memberToEdit, ...formData };
      setMembers((prev) => prev.map((m) => (m.id === memberToEdit.id ? updated : m)));
      setIsEditModalOpen(false);
      setMemberToEdit(null);
      showToast(`Member ${updated.name} updated successfully!`, 'success');
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.errorType === 'DUPLICATE_PHONE') {
        showAlert({
          type: 'warning',
          title: 'Number Already Exists',
          message: errData.message || 'Number already exists, use a different number',
          existingMember: errData.existingMember,
          confirmText: 'Change Number'
        });
      } else {
        showAlert({
          type: 'danger',
          title: 'Update Failed',
          message: errData?.message || err.message || 'Failed to update member',
          confirmText: 'Close'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Resend Invitation
  const handleResendInvitation = async (member) => {
    if (!member.email) {
      showAlert({
        type: 'warning',
        title: 'No Email Configured',
        message: 'This member does not have an email address registered to receive invitations.',
        confirmText: 'Understood'
      });
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
      showAlert({
        type: 'danger',
        title: 'Invitation Dispatch Failed',
        message: err.response?.data?.message || err.message || 'Failed to resend invitation email',
        confirmText: 'Close'
      });
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, invitationStatus: 'failed' } : m))
      );
    } finally {
      setResendingId(null);
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
      } catch (_firstErr) {
        const fbRes = await apiClient.get(`/members/${member.id}/receipts`);
        receipts = fbRes.data?.data || fbRes.data || [];
      }
      setMemberReceipts(receipts);
      if (receipts.length > 0) {
        setSelectedReceipt(receipts[0]);
      }
    } catch (err) {
      console.error('Failed to load member receipts:', err);
      showAlert({
        type: 'warning',
        title: 'Receipt Unavailable',
        message: 'Could not load receipt details at this time. Please try again.',
        confirmText: 'Close'
      });
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
      showAlert({
        type: 'danger',
        title: 'Email Dispatch Failed',
        message: err.response?.data?.message || err.message || 'Failed to resend receipt email',
        confirmText: 'Close'
      });
    } finally {
      setIsResendingReceipt(false);
    }
  };

  // Render invitation badge helper
  const renderInvitationBadge = (status) => {
    const norm = (status || 'pending').toLowerCase();
    if (norm === 'accepted' || norm === 'active') {
      return (
        <span
          style={{
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
          }}
        >
          Active
        </span>
      );
    }
    if (norm === 'sent') {
      return (
        <span
          style={{
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
          }}
        >
          Invited
        </span>
      );
    }
    return (
      <span
        style={{
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
        }}
      >
        Pending
      </span>
    );
  };

  // Individual Delete Handlers
  const handleRequestDeleteMember = (member) => {
    showAlert({
      type: 'danger',
      title: 'Delete Member Confirmation',
      message: 'Are you sure you want to delete this member?',
      details: `Member: ${member.name} (ID: #${member.customMemberId || member.id})`,
      confirmText: 'Yes, Delete Member',
      cancelText: 'Cancel',
      onConfirm: () => handleConfirmDeleteSingle(member)
    });
  };

  const handleConfirmDeleteSingle = async (member) => {
    closeAlert();
    setIsDeleting(true);
    try {
      await apiClient.delete(`/members/${member.id}`);
      showToast(`Member "${member.name}" deleted successfully.`, 'info');
      setSelectedMemberIds((prev) => {
        const next = new Set(prev);
        next.delete(member.id);
        return next;
      });
      fetchMembers();
    } catch (err) {
      showAlert({
        type: 'danger',
        title: 'Deletion Failed',
        message: err.response?.data?.message || err.message || 'Failed to delete member.',
        confirmText: 'Close'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Selection Handlers
  const handleToggleSelectRow = (id) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filtering
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        !searchTerm ||
        m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.customMemberId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone?.includes(searchTerm) ||
        m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' ||
        (m.status && m.status.toUpperCase() === statusFilter.toUpperCase());

      return matchSearch && matchStatus;
    });
  }, [members, searchTerm, statusFilter]);

  const isAllSelected = useMemo(() => {
    if (filteredMembers.length === 0) return false;
    return filteredMembers.every((m) => selectedMemberIds.has(m.id));
  }, [filteredMembers, selectedMemberIds]);

  const isIndeterminate = useMemo(() => {
    if (filteredMembers.length === 0) return false;
    const selectedCount = filteredMembers.filter((m) => selectedMemberIds.has(m.id)).length;
    return selectedCount > 0 && selectedCount < filteredMembers.length;
  }, [filteredMembers, selectedMemberIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      // Deselect visible filtered members
      setSelectedMemberIds((prev) => {
        const next = new Set(prev);
        filteredMembers.forEach((m) => next.delete(m.id));
        return next;
      });
    } else {
      // Select visible filtered members
      setSelectedMemberIds((prev) => {
        const next = new Set(prev);
        filteredMembers.forEach((m) => next.add(m.id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedMemberIds(new Set());
  };

  // Bulk Delete Handlers
  const handleRequestBulkDelete = () => {
    const count = selectedMemberIds.size;
    if (count === 0) return;

    showAlert({
      type: 'danger',
      title: 'Bulk Delete Confirmation',
      message: `Are you sure you want to delete ${count} selected member(s)?`,
      details: `This action will permanently delete ${count} selected member profile(s). Payment records and financial history are safely preserved.`,
      confirmText: `Yes, Delete ${count} Member${count > 1 ? 's' : ''}`,
      cancelText: 'Cancel',
      onConfirm: handleConfirmBulkDelete
    });
  };

  const handleConfirmBulkDelete = async () => {
    closeAlert();
    setIsDeleting(true);
    try {
      const memberIds = Array.from(selectedMemberIds);
      const res = await apiClient.post('/members/bulk-delete', { memberIds });
      const deletedCount = res.data?.data?.deletedCount || memberIds.length;
      showToast(`Successfully deleted ${deletedCount} member(s).`, 'success');
      setSelectedMemberIds(new Set());
      fetchMembers();
    } catch (err) {
      showAlert({
        type: 'danger',
        title: 'Bulk Deletion Failed',
        message: err.response?.data?.message || err.message || 'Failed to delete selected members.',
        confirmText: 'Close'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Table Columns Definition
  const columns = useMemo(() => {
    return getMemberColumns({
      onSelectMember: (m) => setSelectedMember(m),
      onOpenReceipt: handleOpenReceiptModal,
      onResendInvitation: handleResendInvitation,
      onEditMember: (m) => {
        setMemberToEdit(m);
        setIsEditModalOpen(true);
      },
      onDeleteMember: handleRequestDeleteMember,
      resendingId,
      renderInvitationBadge,
      selectedIds: selectedMemberIds,
      onToggleSelectRow: handleToggleSelectRow,
      onToggleSelectAll: handleToggleSelectAll,
      isAllSelected,
      isIndeterminate
    });
  }, [resendingId, selectedMemberIds, isAllSelected, isIndeterminate, filteredMembers]);

  return (
    <div className="member-management-wrapper">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Member Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', marginTop: 4 }}>
            View, add, search, renew, and invite members to their personal portal.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsImportModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              fontWeight: 600,
              boxShadow: 'var(--shadow-xs)'
            }}
          >
            <Upload size={17} color="var(--brand-primary)" />
            <span>Import Members</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              fontWeight: 700
            }}
          >
            <UserPlus size={17} />
            <span>Add New Member</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg, 16px)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-xs)',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 320px', maxWidth: '520px', position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 14, pointerEvents: 'none' }} />
          <input
            type="text"
            className="input-control"
            placeholder="Search member by name, ID, phone, receipt #, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              height: '42px',
              paddingLeft: '40px',
              paddingRight: searchTerm ? '36px' : '14px',
              borderRadius: 'var(--radius-md, 10px)'
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: 12,
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4
              }}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status:</span>
            <select
              className="input-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '150px',
                height: '42px',
                cursor: 'pointer',
                borderRadius: 'var(--radius-md, 10px)'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRING_SOON">Expiring Soon</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          <span style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            background: 'var(--bg-surface-elevated)',
            padding: '6px 12px',
            borderRadius: '20px',
            border: '1px solid var(--border-subtle)',
            fontWeight: 600
          }}>
            Showing {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'}
          </span>
        </div>
      </div>

      {/* Bulk Action Bar (when rows are selected) */}
      {selectedMemberIds.size > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 18px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: 'var(--radius-lg, 12px)',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
            <span style={{ fontWeight: 700, color: 'var(--color-danger, #EF4444)' }}>
              {selectedMemberIds.size} member{selectedMemberIds.size > 1 ? 's' : ''} selected
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              (from {filteredMembers.length} visible in current view)
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleClearSelection}
              disabled={isDeleting}
            >
              Deselect All
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleRequestBulkDelete}
              disabled={isDeleting}
              style={{
                background: 'var(--color-danger, #EF4444)',
                color: '#fff',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 600
              }}
            >
              {isDeleting ? <RefreshCw size={14} className="spin" /> : <Trash2 size={14} />}
              <span>Delete Selected ({selectedMemberIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Members Table (Excel Layout with Horizontal Scroll) */}
      <div className="member-table-container">
        <Table
          columns={columns}
          data={filteredMembers}
          emptyMessage={
            isLoading
              ? 'Loading members...'
              : members.length === 0
                ? "No members registered yet. Click 'Add New Member' to register your first member."
                : 'No members found matching your search.'
          }
        />
      </div>

      {/* Pagination Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 8,
          fontSize: '0.875rem',
          color: 'var(--text-secondary)'
        }}
      >
        <span>
          Showing {filteredMembers.length} of {members.length} registered members
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-secondary btn-sm" disabled>
            <ChevronLeft size={16} /> Previous
          </button>
          <button type="button" className="btn btn-secondary btn-sm" disabled>
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 1. Add Member Modal */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddMember}
        isSubmitting={isSubmitting}
        plans={plans}
        nextId={nextId}
        nextReceiptNo={nextReceiptNo}
      />

      {/* 2. Edit Member Modal */}
      <EditMemberModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setMemberToEdit(null);
        }}
        onSubmit={handleSaveEdit}
        member={memberToEdit}
        isSubmitting={isSubmitting}
        plans={plans}
      />

      {/* 3. Member Profile View Modal */}
      <MemberProfileModal
        isOpen={Boolean(selectedMember && !isEditModalOpen)}
        onClose={() => setSelectedMember(null)}
        member={selectedMember}
        onOpenReceipt={handleOpenReceiptModal}
        onResendInvitation={handleResendInvitation}
        isResending={resendingId === selectedMember?.id}
        renderInvitationBadge={renderInvitationBadge}
      />

      {/* 4. Receipt Viewer Modal */}
      <ReceiptViewerModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receiptMember={receiptMember}
        memberReceipts={memberReceipts}
        selectedReceipt={selectedReceipt}
        setSelectedReceipt={setSelectedReceipt}
        receiptLoading={receiptLoading}
        isResendingReceipt={isResendingReceipt}
        onResendReceiptEmail={handleResendReceiptEmail}
      />

      {/* 5. Custom Alert & Notification Modal */}
      <CustomAlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        details={alertModal.details}
        existingMember={alertModal.existingMember}
        confirmText={alertModal.confirmText}
        cancelText={alertModal.cancelText}
        onConfirm={alertModal.onConfirm || closeAlert}
        onCancel={closeAlert}
      />

      {/* 6. Bulk Member Import Modal */}
      <ImportMembersModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchMembers();
        }}
      />
    </div>
  );
};

export default MemberManagementScreen;
