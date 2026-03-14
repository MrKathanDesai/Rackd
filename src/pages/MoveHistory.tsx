import React, { useState } from 'react';
import { useStockMoves, useWarehouses } from '../hooks/queries';
import { Table, Select } from '../components/common';
import type { StockMove, OperationType } from '../types';

const reasonOptions = [
  { value: '', label: 'All Reasons' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'production_input', label: 'Production Input' },
  { value: 'production_output', label: 'Production Output' },
  { value: 'adjustment_gain', label: 'Adjustment Gain' },
  { value: 'adjustment_loss', label: 'Adjustment Loss' },
];

export const MoveHistory: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [reasonFilter, setReasonFilter] = useState<string>('');
  const { data: warehouses } = useWarehouses();
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');

  const { data: moves, isLoading } = useStockMoves({
    type: typeFilter ? (typeFilter as OperationType) : undefined,
    reason: reasonFilter || undefined,
    warehouse_id: warehouseFilter ? Number(warehouseFilter) : undefined,
  });

  const columns = [
    { key: 'date', label: 'Date/Time' },
    { key: 'reference', label: 'Reference' },
    { key: 'product', label: 'Product' },
    { key: 'lot', label: 'Lot' },
    { key: 'route', label: 'From → To' },
    { key: 'reason', label: 'Reason' },
    { key: 'quantity', label: 'Quantity', align: 'right' as const },
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'receipt', label: 'Receipt' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'production', label: 'Production' },
    { value: 'adjustment', label: 'Adjustment' },
  ];

  const warehouseOptions = [
    { value: '', label: 'All Warehouses' },
    ...(warehouses ?? []).map((w) => ({ value: String(w.id), label: w.name })),
  ];

  if (isLoading) {
    return <div className="text-sm text-gray-600">Loading...</div>;
  }

  const data = moves ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Move History</h1>

      {/* Filters */}
      <div className="flex gap-3 items-end">
        <div className="w-40">
          <Select
            label="Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={typeOptions}
          />
        </div>
        <div className="w-48">
          <Select
            label="Reason"
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            options={reasonOptions}
          />
        </div>
        <div className="w-40">
          <Select
            label="Warehouse"
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            options={warehouseOptions}
          />
        </div>
      </div>

      {data.length === 0 ? (
        <div className="border border-black p-8 text-center">
          <p className="text-sm text-gray-600">No stock moves found.</p>
          <p className="text-sm text-gray-400 mt-1">
            Stock moves are created when operations are validated.
          </p>
        </div>
      ) : (
        <div className="border border-black">
          <Table
            columns={columns}
            data={data}
            renderRow={(move: StockMove) => (
              <>
                <td className="p-2 text-sm">{new Date(move.created_at).toLocaleString()}</td>
                <td className="p-2 text-sm font-bold font-mono">{move.reference}</td>
                <td className="p-2 text-sm">
                  {move.product_name}
                  <div className="text-xs text-gray-400">{move.sku}</div>
                </td>
                <td className="p-2 text-sm font-mono">
                  {move.lot_number ?? '-'}
                </td>
                <td className="p-2 text-xs">
                  {move.from_location_name ?? '(External)'} → {move.to_location_name ?? '(External)'}
                </td>
                <td className="p-2 text-xs capitalize">
                  {(move.reason ?? '-').replace(/_/g, ' ')}
                </td>
                <td className="p-2 text-sm text-right font-bold">
                  {move.qty} {move.unit}
                </td>
              </>
            )}
          />
        </div>
      )}
    </div>
  );
};
