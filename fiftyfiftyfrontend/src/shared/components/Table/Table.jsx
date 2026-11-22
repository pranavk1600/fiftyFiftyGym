import React from 'react';
import '../../../styles/components/table.css';

export const Table = ({ columns = [], data = [], keyExtractor, emptyMessage = 'No records found' }) => {
  return (
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
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: 0,
                  border: 'none',
                  color: 'var(--text-muted)'
                }}
              >
                <div
                  style={{
                    position: 'sticky',
                    left: 0,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '48px 24px',
                    textAlign: 'center'
                  }}
                >
                  {typeof emptyMessage === 'string' && emptyMessage.toLowerCase().includes('loading') ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: '0.95rem', fontWeight: 500 }}>
                      <span
                        className="spin"
                        style={{
                          display: 'inline-block',
                          width: 18,
                          height: 18,
                          border: '2px solid var(--brand-primary, #FF6B00)',
                          borderTopColor: 'transparent',
                          borderRadius: '50%'
                        }}
                      />
                      <span>{emptyMessage}</span>
                    </div>
                  ) : (
                    emptyMessage
                  )}
                </div>
              </td>
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
  );
};

export default Table;
