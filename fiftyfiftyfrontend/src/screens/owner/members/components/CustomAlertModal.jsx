import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X, Phone, User } from 'lucide-react';
import './../styles/customAlertModal.css';

/**
 * CustomAlertModal
 * A clean, modern modal dialog for alerts, warnings, duplicate phone notices,
 * and confirmations across the Members management screen.
 */
export const CustomAlertModal = ({
  isOpen,
  onClose,
  type = 'warning', // 'warning', 'danger' | 'error', 'success', 'info'
  title = 'Notice',
  message = '',
  details = null,
  existingMember = null,
  confirmText = 'Got It',
  cancelText = null,
  onConfirm = null,
  onCancel = null
}) => {
  if (!isOpen) return null;

  const isDuplicatePhone = Boolean(existingMember || (message && message.toLowerCase().includes('already exists')));

  const renderIcon = () => {
    switch (type) {
      case 'danger':
      case 'error':
        return (
          <div className="cam-icon-wrapper cam-icon-danger">
            <AlertCircle size={28} />
          </div>
        );
      case 'success':
        return (
          <div className="cam-icon-wrapper cam-icon-success">
            <CheckCircle size={28} />
          </div>
        );
      case 'info':
        return (
          <div className="cam-icon-wrapper cam-icon-info">
            <Info size={28} />
          </div>
        );
      case 'warning':
      default:
        return (
          <div className="cam-icon-wrapper cam-icon-warning">
            <AlertTriangle size={28} />
          </div>
        );
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  return (
    <div className="cam-backdrop" onClick={onClose}>
      <div
        className="cam-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="cam-close-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        <div className="cam-content-body">
          {renderIcon()}

          <div className="cam-text-block">
            <h3 className="cam-title">
              {title || (isDuplicatePhone ? 'Number Already Exists' : 'Notification')}
            </h3>
            <p className="cam-message">
              {message || (isDuplicatePhone ? 'Number already exists, use a different number' : '')}
            </p>
          </div>

          {/* Duplicate Member Details Box */}
          {existingMember && (
            <div className="cam-details-card">
              <div className="cam-details-row">
                <User size={15} className="cam-details-icon" />
                <span className="cam-details-label">Registered Member:</span>
                <span className="cam-details-value">{existingMember.name || 'Existing Member'}</span>
              </div>
              {existingMember.customMemberId && (
                <div className="cam-details-row">
                  <span className="cam-details-badge">ID: #{existingMember.customMemberId}</span>
                </div>
              )}
              {existingMember.phone && (
                <div className="cam-details-row">
                  <Phone size={15} className="cam-details-icon" />
                  <span className="cam-details-label">Phone:</span>
                  <span className="cam-details-value">{existingMember.phone}</span>
                </div>
              )}
            </div>
          )}

          {/* Generic Details String */}
          {details && !existingMember && (
            <div className="cam-details-card">
              <span className="cam-details-text">{details}</span>
            </div>
          )}
        </div>

        <div className="cam-footer-actions">
          {cancelText && (
            <button
              type="button"
              className="cam-btn cam-btn-secondary"
              onClick={handleCancel}
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            className={`cam-btn ${type === 'danger' || type === 'error' ? 'cam-btn-danger' : 'cam-btn-primary'}`}
            onClick={handleConfirm}
            autoFocus
          >
            {confirmText || (isDuplicatePhone ? 'Change Number' : 'Understood')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomAlertModal;
