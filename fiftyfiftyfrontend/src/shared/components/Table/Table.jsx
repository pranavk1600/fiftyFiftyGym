import React from 'react';
import '../../../styles/components/table.css';

export const Table = ({ columns = [], data = [], keyExtractor, emptyMessage = 'No records found' }) => {
  const isEmpty = data.length === 0;

  return (
    <div className="table-outer-container" style={{ position: 'relative', width: '100%' }}>
      <div className="table-responsive-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  style={{
                    ...(col.width ? { width: col.width, minWidth: col.width } : {}),
                    ...(col.align ? { textAlign: col.align } : {})
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    height: '180px',
                    padding: 0,
                    border: 'none',
                    background: 'transparent'
                  }}
                />
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr key={keyExtractor ? keyExtractor(row) : row.id || rowIdx}>
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      style={{
                        ...(col.width ? { width: col.width, minWidth: col.width } : {}),
                        ...(col.align ? { textAlign: col.align } : {})
                      }}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Centered Message: pinned to the visible viewport width of the screen */}
      {isEmpty && (
        <div
          style={{
            position: 'absolute',
            top: '48px',
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 5
          }}
        >
          {typeof emptyMessage === 'string' && emptyMessage.toLowerCase().includes('loading') ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--text-secondary, #64748B)',
                background: 'var(--bg-surface, #FFFFFF)',
                padding: '12px 24px',
                borderRadius: '9999px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                border: '1px solid var(--border-subtle, #E2E8F0)'
              }}
            >
              <span
                className="spin"
                style={{
                  display: 'inline-block',
                  width: 20,
                  height: 20,
                  border: '2.5px solid var(--brand-primary, #FF6B00)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%'
                }}
              />
              <span>{emptyMessage}</span>
            </div>
          ) : (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.9rem'
              }}
            >
              {emptyMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Table;
