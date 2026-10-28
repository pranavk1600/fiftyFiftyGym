import React, { useState } from 'react';
import { Plus, Check, Clock, Edit3 } from 'lucide-react';
import { Button } from '../../../shared/components/Button/Button';
import { Badge } from '../../../shared/components/Badge/Badge';
import { Modal } from '../../../shared/components/Modal/Modal';
import { Input } from '../../../shared/components/Input/Input';
import { formatCurrency } from '../../../shared/utils/formatters';
import { useToast } from '../../../context/ToastContext';

export const PlanManagementScreen = () => {
  const { showToast } = useToast();

  const [plans, setPlans] = useState([
    {
      id: 1,
      name: 'Monthly Standard',
      duration: '30 Days',
      durationDays: 30,
      price: 1800,
      activeSubscribers: 48,
      status: 'active',
      features: ['Full gym equipment access', 'Locker room facilities', 'General floor trainer assistance']
    },
    {
      id: 2,
      name: 'Quarterly Pro',
      duration: '90 Days',
      durationDays: 90,
      price: 4500,
      activeSubscribers: 62,
      status: 'active',
      isPopular: true,
      features: ['Full gym equipment access', '1 Diet & Nutrition Consultation', 'Free Steam Bath (2 sessions/mo)', 'Body composition analysis']
    },
    {
      id: 3,
      name: 'Annual Gold Elite',
      duration: '365 Days',
      durationDays: 365,
      price: 14000,
      activeSubscribers: 22,
      status: 'active',
      features: ['Unlimited 24/7 all-hours access', 'Monthly diet & workout reviews', 'Free premium gym kit & shaker', '4 Guest workout day passes']
    }
  ]);

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

  const handleCreatePlan = (e) => {
    e.preventDefault();
    if (!newPlanForm.name.trim() || !newPlanForm.price) {
      showToast('Please provide plan name and price', 'warning');
      return;
    }

    const newPlan = {
      id: Date.now(),
      name: newPlanForm.name,
      duration: `${newPlanForm.durationDays} Days`,
      durationDays: Number(newPlanForm.durationDays),
      price: Number(newPlanForm.price),
      activeSubscribers: 0,
      status: newPlanForm.status,
      features: [newPlanForm.feature1, newPlanForm.feature2, newPlanForm.feature3].filter(Boolean)
    };

    setPlans([...plans, newPlan]);
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
    showToast(`Plan "${newPlan.name}" created successfully!`, 'success');
  };

  const handleUpdatePlan = (e) => {
    e.preventDefault();
    if (!editingPlan) return;
    setPlans(plans.map((p) => (p.id === editingPlan.id ? editingPlan : p)));
    setEditingPlan(null);
    showToast(`Plan "${editingPlan.name}" updated successfully!`, 'success');
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

      {/* Plan Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {plans.map((plan) => (
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
                  <Clock size={15} color="var(--brand-primary)" /> {plan.duration} Validity
                </span>
              </div>
              <Badge status={plan.status} />
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
                {plan.features.map((feature, idx) => (
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
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <strong>{plan.activeSubscribers}</strong> active members
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setEditingPlan({ ...plan })}
              >
                <Edit3 size={14} />
                <span>Edit Plan</span>
              </button>
            </div>
          </div>
        ))}
      </div>

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
            label="Plan Title"
            placeholder="e.g. Semi-Annual Fitness"
            value={newPlanForm.name}
            onChange={(e) => setNewPlanForm({ ...newPlanForm, name: e.target.value })}
            required
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label="Duration (in Days)"
              type="number"
              placeholder="e.g. 180"
              value={newPlanForm.durationDays}
              onChange={(e) => setNewPlanForm({ ...newPlanForm, durationDays: e.target.value })}
              required
            />
            <Input
              label="Price (INR ₹)"
              type="number"
              placeholder="e.g. 8000"
              value={newPlanForm.price}
              onChange={(e) => setNewPlanForm({ ...newPlanForm, price: e.target.value })}
              required
            />
          </div>
          <Input
            label="Benefit 1"
            placeholder="e.g. Full gym equipment access"
            value={newPlanForm.feature1}
            onChange={(e) => setNewPlanForm({ ...newPlanForm, feature1: e.target.value })}
          />
          <Input
            label="Benefit 2"
            placeholder="e.g. 2 Personal Training sessions"
            value={newPlanForm.feature2}
            onChange={(e) => setNewPlanForm({ ...newPlanForm, feature2: e.target.value })}
          />
          <Input
            label="Benefit 3"
            placeholder="e.g. Free locker and sauna access"
            value={newPlanForm.feature3}
            onChange={(e) => setNewPlanForm({ ...newPlanForm, feature3: e.target.value })}
          />
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
                label="Duration Label"
                value={editingPlan.duration}
                onChange={(e) => setEditingPlan({ ...editingPlan, duration: e.target.value })}
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
            <div className="input-group">
              <label className="input-label">Status</label>
              <select
                className="input-control"
                value={editingPlan.status}
                onChange={(e) => setEditingPlan({ ...editingPlan, status: e.target.value })}
              >
                <option value="active">Active Plan</option>
                <option value="inactive">Inactive / Archived</option>
              </select>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default PlanManagementScreen;
