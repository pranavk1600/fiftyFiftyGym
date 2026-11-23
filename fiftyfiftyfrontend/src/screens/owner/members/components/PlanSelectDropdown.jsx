import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Clock } from 'lucide-react';
import { formatCurrency } from '../../../../shared/utils/formatters';

export const PlanSelectDropdown = ({
  plans = [],
  selectedPlanName = '',
  selectedMonths = 1,
  onSelectPlan,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find currently active plan object if matching
  const currentPlan = plans.find((p) => p.name === selectedPlanName);

  const getDurationMonths = (plan) => {
    const days = plan.duration_days || plan.durationDays || 30;
    if (days >= 360) return 12;
    if (days >= 180) return 6;
    if (days >= 90) return 3;
    if (days >= 60) return 2;
    if (days >= 120) return 4;
    return Math.max(1, Math.round(days / 30));
  };

  const handleSelect = (plan) => {
    if (disabled) return;
    onSelectPlan(plan);
    setIsOpen(false);
  };

  return (
    <div className="custom-dropdown-container" ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger Button */}
      <button
        type="button"
        className={`custom-dropdown-trigger ${isOpen ? 'is-open' : ''}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {currentPlan ? currentPlan.name : (selectedPlanName || 'Select a gym plan')}
          </span>
          {currentPlan && (
            <span className="dropdown-price-badge">
              {formatCurrency(currentPlan.price)}
            </span>
          )}
        </div>

        <ChevronDown
          size={16}
          style={{
            color: 'var(--text-secondary)',
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0
          }}
        />
      </button>

      {/* Custom Popup Menu */}
      {isOpen && (
        <div className="custom-dropdown-menu" role="listbox">
          {plans.length === 0 ? (
            <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              No plans created yet. Add plans under <strong>Membership Plans</strong>.
            </div>
          ) : (
            plans.map((p) => {
              const isSelected = selectedPlanName === p.name;
              const months = getDurationMonths(p);
              const durationText = p.duration || (p.durationDays ? `${p.durationDays} Days` : `${months} Month${months > 1 ? 's' : ''}`);

              return (
                <div
                  key={p.id || p.name}
                  className={`custom-dropdown-option ${isSelected ? 'is-selected' : ''}`}
                  onClick={() =>
                    handleSelect({
                      name: p.name,
                      durationMonths: months,
                      price: parseFloat(p.price) || 0
                    })
                  }
                  role="option"
                  aria-selected={isSelected}
                >
                  {/* Left: Plan Name & Duration */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        color: isSelected ? 'var(--brand-primary)' : 'var(--text-primary)'
                      }}
                    >
                      {p.name}
                    </span>
                    <span className="dropdown-validity-pill">
                      <Clock size={11} style={{ flexShrink: 0 }} />
                      <span>{durationText}</span>
                    </span>
                  </div>

                  {/* Right: Plan Price & Checkmark */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: '0.92rem',
                        color: isSelected ? 'var(--brand-primary)' : 'var(--text-primary)'
                      }}
                    >
                      {formatCurrency(p.price)}
                    </span>
                    {isSelected && (
                      <div className="dropdown-check-circle">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
