import React, { useState, useEffect, useMemo } from 'react';
import { UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../shared/components/Button/Button';
import { Table } from '../../../shared/components/Table/Table';
import { useToast } from '../../../context/ToastContext';
import { apiClient } from '../../../shared/services/apiClient';

// Modular Subcomponents & Columns
import { getMemberColumns } from './components/memberTableColumns';
import { AddMemberModal } from './components/AddMemberModal';
import { EditMemberModal } from './components/EditMemberModal';
import { MemberProfileModal } from './components/MemberProfileModal';
import { ReceiptViewerModal } from './components/ReceiptViewerModal';

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

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);

  // Receipt Modal state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptMember, setReceiptMember] = useState(null);
  const [memberReceipts, setMemberReceipts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isResendingReceipt, setIsResendingReceipt] = useState(false);

  // Compute next sequential Member ID (ID and Receipt No are identical)
  const nextId = useMemo(() => {
    const nums = members
      .map((m) => parseInt(m.customMemberId, 10))
      .filter((n) => !isNaN(n) && n > 0);
    return nums.length > 0 ? String(Math.max(...nums) + 1) : '2106';
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
    } catch (_e) {}
  };

  useEffect(() => {
    fetchMembers();
    fetchPlans();
  }, []);

  // Handle Add Member
  const handleAddMember = async (formData) => {
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/members', formData);
      const created = res.data?.data || res.data;
      setMembers((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      showToast(`Member ${created.name || formData.name} registered and saved to list!`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to register member', 'danger');
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
      showToast(err.response?.data?.message || err.message || 'Failed to update member', 'danger');
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
      resendingId,
      renderInvitationBadge
    });
  }, [resendingId]);

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
        <Button onClick={() => setIsAddModalOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <UserPlus size={18} />
          <span>Add New Member</span>
        </Button>
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
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 280px', maxWidth: '480px' }}>
          <input
            type="text"
            className="input-control"
            placeholder="Search member by name, ID, phone, receipt #, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', height: '42px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status:</span>
          <select
            className="input-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '160px', height: '42px', cursor: 'pointer' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRING_SOON">Expiring Soon</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

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
    </div>
  );
};

export default MemberManagementScreen;
