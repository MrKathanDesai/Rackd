import React from 'react';
import { MOCK_MOVES } from '../constants';
import { Table } from '../components/common';

export const MoveHistory: React.FC = () => {
  const columns = [
    { key: 'date', label: 'Date/Time' },
    { key: 'reference', label: 'Reference' },
    { key: 'product', label: 'Product' },
    { key: 'route', label: 'From → To' },
    { key: 'quantity', label: 'Quantity', align: 'right' as const },
    { key: 'user', label: 'User' },
  ];
  
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Move History</h1>
      
      <div className="border border-black">
        <Table
          columns={columns}
          data={MOCK_MOVES}
          renderRow={(move) => (
            <>
              <td className="p-2 text-sm">{new Date(move.date).toLocaleString()}</td>
              <td className="p-2 text-sm font-bold">{move.operationReference}</td>
              <td className="p-2 text-sm">
                {move.productName}
                <div className="text-xs text-gray-600">{move.productSku}</div>
              </td>
              <td className="p-2 text-xs">
                {move.fromLocationName} → {move.toLocationName}
              </td>
              <td className="p-2 text-sm text-right font-bold">
                {move.quantity} {move.uom}
              </td>
              <td className="p-2 text-sm">{move.user}</td>
            </>
          )}
        />
      </div>
      
      {MOCK_MOVES.length === 0 && (
        <div className="text-center p-8 text-gray-600 text-sm">
          No stock moves found
        </div>
      )}
    </div>
  );
};
