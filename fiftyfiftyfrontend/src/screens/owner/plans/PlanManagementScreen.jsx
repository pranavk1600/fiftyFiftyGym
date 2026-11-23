import React, { useState, useEffect } from 'react';
import { Plus, Check, Clock, Edit3, Trash2, Users, Sparkles } from 'lucide-react';
import { Button } from '../../../shared/components/Button/Button';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Input } from '../../../shared/components/Input/Input';
import { formatCurrency } from '../../../shared/utils/formatters';
import { useToast } from '../../../context/ToastContext';
import { apiClient } from '../../../shared/services/apiClient';

// Styles
import './styles/planManagement.css';

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
    <div className="plans-screen-wrapper">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: 4, color: 'var(--text-primary)' }}>
            Membership Plans
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
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
        <div className="plans-empty-state">
          <h3 style={{ fontSize: '1.25rem', marginBottom: 8, color: 'var(--text-primary)' }}>
            No Membership Plans Configured
          </h3>
          <p style={{ maxWidth: 440, margin: '0 auto 20px', fontSize: '0.9rem', lineHeight: 1.5 }}>
            No membership plans have been created yet for your gym. Create your first pricing package to start enrolling members.
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={16} />
            <span>Create Your First Plan</span>
          </Button>
        </div>
      ) : (
        <div className="plans-cards-grid">
          {plans.map((plan) => {
            const features = Array.isArray(plan.features) ? plan.features : [];

            return (
              <div
                key={plan.id}
                className={`plan-card-premium ${plan.isPopular ? 'plan-card-popular' : ''}`}
              >
                {plan.isPopular && (
                  <div className="popular-ribbon">
                    Most Popular
                  </div>
                )}

                {/* Card Top / Header */}
                <div className="plan-header">
                  <div>
                    <h3 className="plan-title">{plan.name}</h3>
                    <span className="plan-duration-pill">
                      <Clock size={13} color="var(--brand-primary)" />
                      <span>{plan.duration || `${plan.durationDays || 30} Days`} Validity</span>
                    </span>
                  </div>
                  <Badge status={plan.status || 'active'} />
                </div>

                {/* Price Box */}
                <div className="plan-price-box">
                  <div className="plan-price-wrapper">
                    <span className="plan-price-amount">
                      {formatCurrency(plan.price)}
                    </span>
                    <span className="plan-price-cycle">/ cycle</span>
                  </div>
                </div>

                {/* Benefits List */}
                <div className="plan-features-section">
                  <div className="plan-features-header">
                    Included Package Benefits:
                  </div>
                  <div className="plan-features-list">
                    {features.length === 0 ? (
                      <div className="plan-feature-item">
                        <div className="plan-check-icon">
                          <Check size={11} strokeWidth={2.5} />
                        </div>
                        <span>Full gym facility access</span>
                      </div>
                    ) : (
                      features.map((feature, idx) => (
                        <div key={idx} className="plan-feature-item">
                          <div className="plan-check-icon">
                            <Check size={11} strokeWidth={2.5} />
                          </div>
                          <span>{feature}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Card Bottom / Actions */}
                <div className="plan-footer">
                  <span className="plan-subscribers-badge" title="Active member subscriptions">
                    <Users size={13} color="var(--text-muted)" />
                    <span><strong>{plan.activeSubscribers || 0}</strong> active</span>
                  </span>
                  <div className="plan-actions-group">
                    <button
                      type="button"
                      className="plan-action-btn"
                      onClick={() => setEditingPlan({ ...plan })}
                      title="Edit this plan"
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className="plan-action-btn plan-action-btn-danger"
                      onClick={() => handleDeletePlan(plan.id, plan.name)}
                      title="Delete Plan"
                    >
                      <Trash2 size={13} />
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
        maxWidth={540}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePlan}>
              Save Plan
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreatePlan} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Plan Title *"
            placeholder="e.g. Monthly Standard"
            value={newPlanForm.name}
            onChange={(e) => setNewPlanForm({ ...newPlanForm, name: e.target.value })}
            required
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input
              label="Duration (in Days) *"
              type="number"
              min="1"
              placeholder="e.g. 30"
              value={newPlanForm.durationDays}
              onChange={(e) => setNewPlanForm({ ...newPlanForm, durationDays: e.target.value })}
              required
            />
            <Input
              label="Price (INR ₹) *"
              type="number"
              min="0"
              placeholder="e.g. 2000"
              value={newPlanForm.price}
              onChange={(e) => setNewPlanForm({ ...newPlanForm, price: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="input-label" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
              Included Benefits
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                placeholder="Feature 3 (e.g. Personal trainer consultation)"
                value={newPlanForm.feature3}
                onChange={(e) => setNewPlanForm({ ...newPlanForm, feature3: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Plan Modal */}
      <Modal
        isOpen={Boolean(editingPlan)}
        onClose={() => setEditingPlan(null)}
        title="Edit Membership Plan"
        maxWidth={540}
        footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', width: '100%' }}>
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
          <form onSubmit={handleUpdatePlan} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              label="Plan Title *"
              value={editingPlan.name}
              onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
              required
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Input
                label="Duration (in Days) *"
                type="number"
                min="1"
                value={editingPlan.durationDays || 30}
                onChange={(e) => setEditingPlan({ ...editingPlan, durationDays: Number(e.target.value) })}
                required
              />
              <Input
                label="Price (INR ₹) *"
                type="number"
                min="0"
                value={editingPlan.price}
                onChange={(e) => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="edit-plan-status" style={{ fontWeight: 600 }}>
                Status
              </label>
              <select
                id="edit-plan-status"
                className="input-control"
                value={editingPlan.status || 'active'}
                onChange={(e) => setEditingPlan({ ...editingPlan, status: e.target.value })}
                style={{ height: '42px', fontSize: '0.9rem', cursor: 'pointer' }}
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
