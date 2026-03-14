import React from 'react';

interface TableProps {
  columns: { key: string; label: string; align?: 'left' | 'right' | 'center' }[];
  data: any[];
  renderRow: (row: any, index: number) => React.ReactNode;
  onRowClick?: (row: any) => void;
}

export const Table: React.FC<TableProps> = ({ columns, data, renderRow, onRowClick }) => {
  return (
    <table className="w-full border-collapse">
      <thead className="bg-gray-100 border-y border-black">
        <tr>
          {columns.map(col => (
            <th
              key={col.key}
              className={`text-${col.align || 'left'} p-2 text-xs font-bold uppercase`}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, index) => (
          <tr
            key={index}
            className={`border-b hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
            onClick={() => onRowClick?.(row)}
          >
            {renderRow(row, index)}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
