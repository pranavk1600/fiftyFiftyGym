import React, { useState, useEffect } from 'react';
import { Plus, Check, Clock, Edit3, Trash2 } from 'lucide-react';
import { Button } from '../../../shared/components/Button/Button';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Input } from '../../../shared/components/Input/Input';
import { formatCurrency } from '../../../shared/utils/formatters';
import { useToast } from '../../../context/ToastContext';
import { apiClient } from '../../../shared/services/apiClient';

export const PlanManagementScreen = () => {
  const { showToast } = useToast();
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  // New plan form state
  const [newPlanForm, setNewPlanForm] = useState({
    name: '',
    durationDays: 30,
    price: '',
    feature1: '',
    feature2: '',
    feature3: '',
    status: 'active'
  });

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/plans');
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) {
        setPlans(data);
      }
    } catch (err) {
      console.warn('[Plans Load Notice]:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!newPlanForm.name.trim() || !newPlanForm.price) {
      showToast('Please provide plan name and price', 'warning');
      return;
    }

    const payload = {
      name: newPlanForm.name.trim(),
      durationDays: Number(newPlanForm.durationDays),
      price: Number(newPlanForm.price),
      status: newPlanForm.status,
      features: [newPlanForm.feature1, newPlanForm.feature2, newPlanForm.feature3].filter(Boolean)
    };

    try {
      const res = await apiClient.post('/plans', payload);
      const created = res.data?.data || res.data;
      setPlans([...plans, created]);
      setIsCreateModalOpen(false);
      setNewPlanForm({
        name: '',
        durationDays: 30,
        price: '',
        feature1: '',
        feature2: '',
        feature3: '',
        status: 'active'
      });
      showToast(`Plan "${created.name}" created successfully!`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to create plan', 'danger');
    }
  };

  const handleUpdatePlan = async (e) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      await apiClient.put(`/plans/${editingPlan.id}`, editingPlan);
      setPlans(plans.map((p) => (p.id === editingPlan.id ? editingPlan : p)));
      setEditingPlan(null);
      showToast(`Plan "${editingPlan.name}" updated successfully!`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to update plan', 'danger');
    }
  };

  const handleDeletePlan = async (planId, planName) => {
    if (!window.confirm(`Are you sure you want to delete "${planName}"?`)) return;
    try {
      await apiClient.delete(`/plans/${planId}`);
      setPlans(plans.filter((p) => p.id !== planId));
      showToast(`Plan "${planName}" deleted`, 'info');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to delete plan', 'danger');
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: 4, color: 'var(--text-primary)' }}>Membership Plans</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Configure gym packages, pricing tiers, durations, and member subscriptions
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={18} />
          <span>Create New Plan</span>
        </Button>
      </div>

      {/* Plan Cards Grid or Empty State */}
      {plans.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 24px',
          background: 'var(--bg-surface)',
          border: '1px dashed var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          color: 'var(--text-secondary)'
        }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: 8, color: 'var(--text-primary)' }}>No Membership Plans Configured</h3>
          <p style={{ maxWidth: 440, margin: '0 auto 20px', fontSize: '0.9rem', lineHeight: 1.5 }}>
            No membership plans have been created yet for your gym. Create your first pricing package to start enrolling members.
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={16} />
            <span>Create Your First Plan</span>
          </Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {plans.map((plan) => {
            const features = Array.isArray(plan.features) ? plan.features : [];

            return (
              <div
                key={plan.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: plan.isPopular ? '2px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 28,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  boxShadow: plan.isPopular ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                {plan.isPopular && (
                  <div style={{
                    position: 'absolute',
                    top: -12,
                    left: 28,
                    background: 'var(--brand-primary)',
                    color: '#ffffff',
                    padding: '3px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase'
                  }}>
                    Most Popular
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: '1.3rem', marginBottom: 6, color: 'var(--text-primary)' }}>{plan.name}</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={15} color="var(--brand-primary)" /> {plan.duration || `${plan.durationDays || 30} Days`} Validity
                    </span>
                  </div>
                  <Badge status={plan.status || 'active'} />
                </div>

                <div style={{ margin: '12px 0 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'var(--font-display)' }}>
                      {formatCurrency(plan.price)}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ cycle</span>
                  </div>
                </div>

                <div style={{ flex: 1, margin: '16px 0', borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                    INCLUDED PACKAGE BENEFITS:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {features.length === 0 ? (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Full gym facility access</span>
                    ) : (
                      features.map((feature, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          <div style={{
                            marginTop: 2,
                            width: 18,
                            height: 18,
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--color-success-bg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <Check size={12} color="var(--brand-accent)" />
                          </div>
                          <span>{feature}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <strong>{plan.activeSubscribers || 0}</strong> active members
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setEditingPlan({ ...plan })}
                    >
                      <Edit3 size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDeletePlan(plan.id, plan.name)}
                      style={{ color: 'var(--color-danger)' }}
                      title="Delete Plan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Plan Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Membership Plan"
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePlan}>
              Save Plan
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreatePlan}>
          <Input
            label="Plan Title *"
            placeholder="e.g. Monthly Standard"
            value={newPlanForm.name}
            onChange={(e) => setNewPlanForm({ ...newPlanForm, name: e.target.value })}
            required
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label="Duration (in Days) *"
              type="number"
              placeholder="e.g. 30"
              value={newPlanForm.durationDays}
              onChange={(e) => setNewPlanForm({ ...newPlanForm, durationDays: e.target.value })}
              required
            />
            <Input
              label="Price (INR ₹) *"
              type="number"
              placeholder="e.g. 2000"
              value={newPlanForm.price}
              onChange={(e) => setNewPlanForm({ ...newPlanForm, price: e.target.value })}
              required
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="input-label" style={{ display: 'block', marginBottom: 8 }}>Included Benefits</label>
            <Input
              placeholder="Feature 1 (e.g. Full gym floor access)"
              value={newPlanForm.feature1}
              onChange={(e) => setNewPlanForm({ ...newPlanForm, feature1: e.target.value })}
            />
            <Input
              placeholder="Feature 2 (e.g. Locker room & showers)"
              value={newPlanForm.feature2}
              onChange={(e) => setNewPlanForm({ ...newPlanForm, feature2: e.target.value })}
            />
            <Input
              placeholder="Feature 3 (e.g. Nutrition assessment)"
              value={newPlanForm.feature3}
              onChange={(e) => setNewPlanForm({ ...newPlanForm, feature3: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Edit Plan Modal */}
      <Modal
        isOpen={Boolean(editingPlan)}
        onClose={() => setEditingPlan(null)}
        title="Edit Membership Plan"
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={() => setEditingPlan(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePlan}>
              Save Changes
            </Button>
          </div>
        }
      >
        {editingPlan && (
          <form onSubmit={handleUpdatePlan}>
            <Input
              label="Plan Title"
              value={editingPlan.name}
              onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
              required
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Input
                label="Duration (in Days)"
                type="number"
                value={editingPlan.durationDays || 30}
                onChange={(e) => setEditingPlan({ ...editingPlan, durationDays: Number(e.target.value) })}
                required
              />
              <Input
                label="Price (INR ₹)"
                type="number"
                value={editingPlan.price}
                onChange={(e) => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })}
                required
              />
            </div>
            <div className="input-group" style={{ marginTop: 12 }}>
              <label className="input-label">Status</label>
              <select
                className="input-control"
                value={editingPlan.status || 'active'}
                onChange={(e) => setEditingPlan({ ...editingPlan, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default PlanManagementScreen;
