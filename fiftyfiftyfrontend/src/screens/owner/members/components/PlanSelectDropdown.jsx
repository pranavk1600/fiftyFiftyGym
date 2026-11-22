import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Clock, Sparkles } from 'lucide-react';
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

  // Standard duration fallback items
  const standardDurations = [
    { name: '1 Month', months: 1, days: 30, price: 1200 },
    { name: '2 Months', months: 2, days: 60, price: 2400 },
    { name: '3 Months', months: 3, days: 90, price: 3000 },
    { name: '4 Months', months: 4, days: 120, price: 4000 },
    { name: '6 Months', months: 6, days: 180, price: 6000 },
    { name: '12 Months', months: 12, days: 365, price: 12000 }
  ];

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
            {selectedPlanName || (currentPlan ? currentPlan.name : `${selectedMonths} Month${selectedMonths > 1 ? 's' : ''}`)}
          </span>
          {currentPlan ? (
            <span className="dropdown-price-badge">
              {formatCurrency(currentPlan.price)}
            </span>
          ) : (
            <span className="dropdown-duration-badge">
              {selectedMonths} Month{selectedMonths > 1 ? 's' : ''}
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
          {plans.length > 0 && (
            <>
              <div className="custom-dropdown-section-title">
                <Sparkles size={12} color="var(--brand-primary)" />
                <span>Gym Membership Plans</span>
              </div>
              {plans.map((p) => {
                const isSelected = selectedPlanName === p.name;
                const months = getDurationMonths(p);

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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: isSelected ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                          {p.name}
                        </span>
                        <span className="dropdown-validity-pill">
                          <Clock size={10} />
                          <span>{p.duration || `${p.durationDays || 30} Days`}</span>
                        </span>
                      </div>
                      {p.features && p.features.length > 0 && (
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {p.features.slice(0, 2).join(' • ')}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: isSelected ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
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
              })}
            </>
          )}

          {/* Standard Durations Section */}
          <div className="custom-dropdown-section-title" style={{ marginTop: plans.length > 0 ? 8 : 0 }}>
            <Clock size={12} color="var(--text-secondary)" />
            <span>Standard Durations</span>
          </div>
          {standardDurations.map((item) => {
            const isSelected = !currentPlan && Number(selectedMonths) === item.months;

            return (
              <div
                key={item.name}
                className={`custom-dropdown-option ${isSelected ? 'is-selected' : ''}`}
                onClick={() =>
                  handleSelect({
                    name: item.name,
                    durationMonths: item.months,
                    price: item.price
                  })
                }
                role="option"
                aria-selected={isSelected}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.86rem', color: isSelected ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                    {item.name}
                  </span>
                  <span className="dropdown-validity-pill">
                    {item.days} Days
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {formatCurrency(item.price)}
                  </span>
                  {isSelected && (
                    <div className="dropdown-check-circle">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
