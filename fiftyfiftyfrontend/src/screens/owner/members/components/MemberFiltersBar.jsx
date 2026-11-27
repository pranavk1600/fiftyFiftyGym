import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  X, 
  SlidersHorizontal, 
  RotateCcw, 
  ChevronDown, 
  Calendar, 
  CreditCard, 
  Layers, 
  ArrowUpDown,
  Check
} from 'lucide-react';

/**
 * Premium custom filter bar for gym member management.
 * Features:
 * - 1-Click Status Pills with live counts (All, Active, Expiring Soon, Balance Due, Expired)
 * - Real-time unified Search bar (Name, ID, Phone, Receipt #, Email)
 * - Quick Plan selector
 * - Expandable "More Filters" popover (Payment Dues, Expiry Timeline, Sorting)
 * - Reset All button with active filters badge
 */
export const MemberFiltersBar = ({
  searchTerm,
  onSearchChange,
  quickFilter,
  onQuickFilterChange,
  planFilter,
  onPlanFilterChange,
  balanceFilter,
  onBalanceFilterChange,
  expiryWindow,
  onExpiryWindowChange,
  sortBy,
  onSortByChange,
  onResetFilters,
  hasActiveFilters,
  counts = { all: 0, active: 0, expiringSoon: 0, balanceDue: 0, expired: 0 },
  plans = [],
  totalMembersCount = 0,
  filteredCount = 0
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isAdvancedOpen &&
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsAdvancedOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAdvancedOpen]);

  // Calculate active advanced filter count (excluding quickFilter & search)
  const activeAdvancedCount = [
    planFilter !== 'ALL',
    balanceFilter !== 'ALL',
    expiryWindow !== 'ALL',
    sortBy !== 'NEWEST'
  ].filter(Boolean).length;

  return (
    <div className="member-filters-wrapper">
      {/* -------------------------------------------------------------
          TIER 1: Quick-Action Status Pills
      ------------------------------------------------------------- */}
      <div className="filters-quick-pills">
        <button
          type="button"
          className={`filter-pill ${quickFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => onQuickFilterChange('ALL')}
        >
          <span className="pill-dot pill-dot-all" />
          <span className="pill-label">All Members</span>
          <span className="pill-badge">{counts.all}</span>
        </button>

        <button
          type="button"
          className={`filter-pill ${quickFilter === 'ACTIVE' ? 'active' : ''}`}
          onClick={() => onQuickFilterChange('ACTIVE')}
        >
          <span className="pill-dot pill-dot-active" />
          <span className="pill-label">Active</span>
          <span className="pill-badge">{counts.active}</span>
        </button>

        <button
          type="button"
          className={`filter-pill ${quickFilter === 'EXPIRING_SOON' ? 'active' : ''}`}
          onClick={() => onQuickFilterChange('EXPIRING_SOON')}
        >
          <span className="pill-dot pill-dot-expiring" />
          <span className="pill-label">Expiring Soon (7d)</span>
          <span className="pill-badge pill-badge-warning">{counts.expiringSoon}</span>
        </button>

        <button
          type="button"
          className={`filter-pill ${quickFilter === 'BALANCE_DUE' ? 'active' : ''}`}
          onClick={() => onQuickFilterChange('BALANCE_DUE')}
        >
          <span className="pill-dot pill-dot-due" />
          <span className="pill-label">Balance Due</span>
          <span className="pill-badge pill-badge-danger">{counts.balanceDue}</span>
        </button>

        <button
          type="button"
          className={`filter-pill ${quickFilter === 'EXPIRED' ? 'active' : ''}`}
          onClick={() => onQuickFilterChange('EXPIRED')}
        >
          <span className="pill-dot pill-dot-expired" />
          <span className="pill-label">Expired</span>
          <span className="pill-badge">{counts.expired}</span>
        </button>
      </div>

      {/* -------------------------------------------------------------
          TIER 2: Search, Plan Dropdown, More Filters & Count
      ------------------------------------------------------------- */}
      <div className="filters-main-bar">
        {/* Search Input */}
        <div className="filters-search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search member by name, ID, phone, receipt #, or email..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => onSearchChange('')}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="filters-controls-group">
          {/* Quick Plan Selector */}
          <div className="filter-select-wrapper">
            <Layers size={15} className="select-icon" />
            <select
              className="filter-select"
              value={planFilter}
              onChange={(e) => onPlanFilterChange(e.target.value)}
              title="Filter by Plan"
            >
              <option value="ALL">All Plans</option>
              {plans.map((p) => (
                <option key={p.id || p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="select-arrow" />
          </div>

          {/* More Filters Toggle Button */}
          <button
            ref={buttonRef}
            type="button"
            className={`btn-more-filters ${isAdvancedOpen || activeAdvancedCount > 0 ? 'active' : ''}`}
            onClick={() => setIsAdvancedOpen((prev) => !prev)}
            aria-expanded={isAdvancedOpen}
          >
            <SlidersHorizontal size={15} />
            <span>More Filters</span>
            {activeAdvancedCount > 0 && (
              <span className="active-filters-count">{activeAdvancedCount}</span>
            )}
            <ChevronDown
              size={14}
              style={{
                transform: isAdvancedOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease'
              }}
            />
          </button>

          {/* Reset Filters Button (Visible when filters are active) */}
          {hasActiveFilters && (
            <button
              type="button"
              className="btn-reset-filters"
              onClick={onResetFilters}
              title="Reset all filters to default"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}

          {/* Total Matching Count Badge */}
          <div className="filter-count-badge">
            Showing <strong>{filteredCount}</strong> of {totalMembersCount} {totalMembersCount === 1 ? 'member' : 'members'}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          TIER 3: Expandable "More Filters" Popover Panel
      ------------------------------------------------------------- */}
      {isAdvancedOpen && (
        <div ref={panelRef} className="filters-advanced-panel animate-slide-down">
          <div className="advanced-panel-header">
            <div className="panel-title">
              <SlidersHorizontal size={16} />
              <span>Advanced Filter & Sorting Controls</span>
            </div>
            <button
              type="button"
              className="panel-close-btn"
              onClick={() => setIsAdvancedOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          <div className="advanced-grid">
            {/* Filter Section: Payment & Dues */}
            <div className="filter-group">
              <label className="filter-group-label">
                <CreditCard size={14} />
                <span>Payment & Due Status</span>
              </label>
              <div className="option-chips">
                <button
                  type="button"
                  className={`chip-btn ${balanceFilter === 'ALL' ? 'selected' : ''}`}
                  onClick={() => onBalanceFilterChange('ALL')}
                >
                  All Payments
                </button>
                <button
                  type="button"
                  className={`chip-btn ${balanceFilter === 'CLEARED' ? 'selected' : ''}`}
                  onClick={() => onBalanceFilterChange('CLEARED')}
                >
                  <Check size={13} />
                  Fully Paid (₹0 Due)
                </button>
                <button
                  type="button"
                  className={`chip-btn chip-danger ${balanceFilter === 'DUE' ? 'selected' : ''}`}
                  onClick={() => onBalanceFilterChange('DUE')}
                >
                  Balance Due (&gt; ₹0)
                </button>
              </div>
            </div>

            {/* Filter Section: Expiration Range */}
            <div className="filter-group">
              <label className="filter-group-label">
                <Calendar size={14} />
                <span>Expiry Window</span>
              </label>
              <div className="option-chips">
                <button
                  type="button"
                  className={`chip-btn ${expiryWindow === 'ALL' ? 'selected' : ''}`}
                  onClick={() => onExpiryWindowChange('ALL')}
                >
                  All Dates
                </button>
                <button
                  type="button"
                  className={`chip-btn ${expiryWindow === '7_DAYS' ? 'selected' : ''}`}
                  onClick={() => onExpiryWindowChange('7_DAYS')}
                >
                  Next 7 Days
                </button>
                <button
                  type="button"
                  className={`chip-btn ${expiryWindow === '15_DAYS' ? 'selected' : ''}`}
                  onClick={() => onExpiryWindowChange('15_DAYS')}
                >
                  Next 15 Days
                </button>
                <button
                  type="button"
                  className={`chip-btn ${expiryWindow === '30_DAYS' ? 'selected' : ''}`}
                  onClick={() => onExpiryWindowChange('30_DAYS')}
                >
                  Next 30 Days
                </button>
                <button
                  type="button"
                  className={`chip-btn ${expiryWindow === 'EXPIRED' ? 'selected' : ''}`}
                  onClick={() => onExpiryWindowChange('EXPIRED')}
                >
                  Already Expired
                </button>
              </div>
            </div>

            {/* Filter Section: Sort Order */}
            <div className="filter-group">
              <label className="filter-group-label">
                <ArrowUpDown size={14} />
                <span>Sort Order</span>
              </label>
              <div className="option-chips">
                <button
                  type="button"
                  className={`chip-btn ${sortBy === 'NEWEST' ? 'selected' : ''}`}
                  onClick={() => onSortByChange('NEWEST')}
                >
                  Newest Registered
                </button>
                <button
                  type="button"
                  className={`chip-btn ${sortBy === 'EXPIRY_SOON' ? 'selected' : ''}`}
                  onClick={() => onSortByChange('EXPIRY_SOON')}
                >
                  Expiring Soonest
                </button>
                <button
                  type="button"
                  className={`chip-btn ${sortBy === 'BALANCE_HIGH' ? 'selected' : ''}`}
                  onClick={() => onSortByChange('BALANCE_HIGH')}
                >
                  Highest Balance Due
                </button>
                <button
                  type="button"
                  className={`chip-btn ${sortBy === 'NAME_ASC' ? 'selected' : ''}`}
                  onClick={() => onSortByChange('NAME_ASC')}
                >
                  Name (A – Z)
                </button>
              </div>
            </div>
          </div>

          {/* Panel Footer */}
          <div className="advanced-panel-footer">
            <span className="panel-footer-hint">
              Filters apply instantly to table results.
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              {activeAdvancedCount > 0 && (
                <button
                  type="button"
                  className="btn-panel-reset"
                  onClick={() => {
                    onPlanFilterChange('ALL');
                    onBalanceFilterChange('ALL');
                    onExpiryWindowChange('ALL');
                    onSortByChange('NEWEST');
                  }}
                >
                  Reset Advanced
                </button>
              )}
              <button
                type="button"
                className="btn-panel-done"
                onClick={() => setIsAdvancedOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
