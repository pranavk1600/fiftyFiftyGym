import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import './themeToggle.css';

export const ThemeToggle = ({ showLabel = true, className = '' }) => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${isDark ? 'dark-active' : 'light-active'} ${className}`.trim()}
      title={isDark ? 'Switch to Day Mode (White Theme)' : 'Switch to Dark Mode (Black Theme)'}
      aria-label={isDark ? 'Switch to Day Mode (White Theme)' : 'Switch to Dark Mode (Black Theme)'}
    >
      <div className="theme-toggle-icon">
        {isDark ? (
          <Moon size={16} className="moon-icon" />
        ) : (
          <Sun size={16} className="sun-icon" />
        )}
      </div>
      {showLabel && (
        <span className="theme-toggle-label">
          {isDark ? 'Dark Mode' : 'Day Mode'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
