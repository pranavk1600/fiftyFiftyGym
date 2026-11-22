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
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                {emptyMessage}
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
