import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import '../../../styles/components/input.css';

export const Input = ({
  label,
  error,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  name,
  required = false,
  showPasswordToggle = true,
  rightElement,
  className = '',
  style,
  ...props
}) => {
  const [internalShowPassword, setInternalShowPassword] = useState(false);
  const isPassword = type === 'password';
  const shouldShowToggle = isPassword && showPasswordToggle;

  const effectiveType = isPassword
    ? (internalShowPassword ? 'text' : 'password')
    : type;

  const hasRightAction = shouldShowToggle || !!rightElement;

  return (
    <div className={`input-group ${className}`.trim()} style={style}>
      {label && (
        <label className="input-label" htmlFor={name}>
          {label} {required && <span style={{ color: 'var(--color-danger, #DC2626)' }}>*</span>}
        </label>
      )}
      <div
        className="input-wrapper"
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <input
          id={name}
          name={name}
          type={effectiveType}
          className={`input-control ${hasRightAction ? 'has-right-element' : ''}`.trim()}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          style={hasRightAction ? { paddingRight: '44px' } : undefined}
          {...props}
        />
        {shouldShowToggle && (
          <button
            type="button"
            className="input-password-toggle"
            onClick={() => setInternalShowPassword((prev) => !prev)}
            tabIndex={-1}
            aria-label={internalShowPassword ? 'Hide password' : 'Show password'}
            title={internalShowPassword ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              padding: '6px',
              margin: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary, #64748B)',
              borderRadius: 'var(--radius-sm, 6px)',
              lineHeight: 1,
              zIndex: 3
            }}
          >
            {internalShowPassword ? (
              <EyeOff size={18} strokeWidth={2} />
            ) : (
              <Eye size={18} strokeWidth={2} />
            )}
          </button>
        )}
        {!shouldShowToggle && rightElement && (
          <div
            className="input-right-element"
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3
            }}
          >
            {rightElement}
          </div>
        )}
      </div>
      {error && <span className="input-error">{error}</span>}
    </div>
  );
};

export default Input;
