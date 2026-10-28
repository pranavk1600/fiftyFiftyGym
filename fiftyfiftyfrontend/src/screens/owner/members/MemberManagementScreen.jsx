import React, { useState } from 'react';
import { UserPlus, Trash2, Eye, RotateCcw, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../shared/components/Button/Button';
import { Table } from '../../../shared/components/Table/Table';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Input } from '../../../shared/components/Input/Input';
import { formatDate } from '../../../shared/utils/formatters';
import { useToast } from '../../../context/ToastContext';

export const MemberManagementScreen = () => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  // Form states
  const [newMemberForm, setNewMemberForm] = useState(() => ({
    name: '',
    phone: '',
    email: '',
    plan: 'Quarterly Pro',
    joinDate: new Date().toISOString().split('T')[0],
    status: 'active'
  }));

  const [members, setMembers] = useState([
    { id: 'MEM001', name: 'Rahul Sharma', phone: '+91 98765 43210', email: 'rahul.s@gmail.com', plan: 'Quarterly Pro', joinDate: '2026-01-15', status: 'active', visits: 28 },
    { id: 'MEM002', name: 'Ananya Roy', phone: '+91 98111 22334', email: 'ananya.roy@yahoo.com', plan: 'Annual Gold Elite', joinDate: '2025-11-01', status: 'active', visits: 54 },
    { id: 'MEM003', name: 'Vikram Singh', phone: '+91 98333 44556', email: 'vikram.singh@outlook.com', plan: 'Monthly Standard', joinDate: '2026-02-10', status: 'expired', visits: 12 },
    { id: 'MEM004', name: 'Priya Patel', phone: '+91 98444 55667', email: 'priya.patel@gmail.com', plan: 'Annual Gold Elite', joinDate: '2025-08-20', status: 'active', visits: 72 },
    { id: 'MEM005', name: 'Karan Mehra', phone: '+91 98555 66778', email: 'karan.mehra@gmail.com', plan: 'Monthly Standard', joinDate: '2026-03-01', status: 'active', visits: 16 }
  ]);

  // Handle Add Member
  const handleAddMember = (e) => {
    e.preventDefault();
    if (!newMemberForm.name.trim() || !newMemberForm.phone.trim()) {
      showToast('Please provide member name and phone number', 'warning');
      return;
    }

    const created = {
      id: `MEM00${members.length + 1}`,
      ...newMemberForm,
      visits: 0
    };

    setMembers([created, ...members]);
    setIsAddModalOpen(false);
    setNewMemberForm({
      name: '',
      phone: '',
      email: '',
      plan: 'Quarterly Pro',
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active'
    });
    showToast(`Member ${created.name} registered successfully!`, 'success');
  };

  // Handle Edit / Renew
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!selectedMember) return;
    setMembers(members.map((m) => (m.id === selectedMember.id ? selectedMember : m)));
    setIsEditModalOpen(false);
    showToast(`Member ${selectedMember.name} updated successfully!`, 'success');
  };

  // Handle Delete Confirmation
  const confirmDeleteMember = () => {
    if (!memberToDelete) return;
    setMembers(members.filter((m) => m.id !== memberToDelete.id));
    setIsDeleteModalOpen(false);
    showToast(`Member ${memberToDelete.name} has been removed.`, 'info');
    setMemberToDelete(null);
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
        </div>
      )
    },
    { header: 'Phone Number', key: 'phone' },
    {
      header: 'Current Plan',
      key: 'plan',
      render: (m) => <span style={{ fontWeight: 500, color: 'var(--brand-primary)' }}>{m.plan}</span>
    },
    {
      header: 'Joining Date',
      key: 'joinDate',
      render: (m) => formatDate(m.joinDate)
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
        <div style={{ display: 'flex', gap: 6 }}>
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
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || m.status.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="animate-fade-in">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: 4, color: 'var(--text-primary)' }}>Member Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>View, add, search, renew, and manage your gym's member base</p>
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
            placeholder="Search member by name, ID, or phone number..."
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
      <Table columns={columns} data={filteredMembers} emptyMessage="No members found matching your search." />

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

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Gym Member"
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember}>
              Save & Register
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddMember}>
          <Input
            label="Full Name"
            name="name"
            placeholder="e.g. Rahul Sharma"
            value={newMemberForm.name}
            onChange={(e) => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
            required
          />
          <Input
            label="Phone Number"
            name="phone"
            placeholder="e.g. +91 98765 43210"
            value={newMemberForm.phone}
            onChange={(e) => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
            required
          />
          <Input
            label="Email Address (Optional)"
            name="email"
            type="email"
            placeholder="e.g. rahul@example.com"
            value={newMemberForm.email}
            onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
          />
          <div className="input-group">
            <label className="input-label">Select Membership Plan *</label>
            <select
              className="input-control"
              value={newMemberForm.plan}
              onChange={(e) => setNewMemberForm({ ...newMemberForm, plan: e.target.value })}
            >
              <option value="Monthly Standard">Monthly Standard (₹1,800 / 30 Days)</option>
              <option value="Quarterly Pro">Quarterly Pro (₹4,500 / 90 Days)</option>
              <option value="Annual Gold Elite">Annual Gold Elite (₹14,000 / 365 Days)</option>
            </select>
          </div>
          <Input
            label="Joining Date"
            name="joinDate"
            type="date"
            value={newMemberForm.joinDate}
            onChange={(e) => setNewMemberForm({ ...newMemberForm, joinDate: e.target.value })}
            required
          />
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
              </div>
              <Badge status={selectedMember.status} />
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
                <div style={{ fontWeight: 600, color: 'var(--brand-primary)', marginTop: 2 }}>{selectedMember.plan}</div>
              </div>
              <div style={{ padding: 12, background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Joining Date</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{formatDate(selectedMember.joinDate)}</div>
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
              <select
                className="input-control"
                value={selectedMember.plan}
                onChange={(e) => setSelectedMember({ ...selectedMember, plan: e.target.value })}
              >
                <option value="Monthly Standard">Monthly Standard (₹1,800)</option>
                <option value="Quarterly Pro">Quarterly Pro (₹4,500)</option>
                <option value="Annual Gold Elite">Annual Gold Elite (₹14,000)</option>
              </select>
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
    </div>
  );
};

export default MemberManagementScreen;
