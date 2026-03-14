import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOperations } from '../hooks/queries';
import { usePermission } from '../hooks/useAuth';
import { Table, Button, Badge } from '../components/common';
import type { Operation } from '../types';

export const AdjustmentsList: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: adjustments, isLoading } = useOperations('adjustment', statusFilter);
  const navigate = useNavigate();
  const canCreateAdjustment = usePermission('adjustments.create');

  const columns = [
    { key: 'reference', label: 'Reference' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'reason', label: 'Reason' },
    { key: 'date', label: 'Date' },
    { key: 'status', label: 'Status' },
    { key: 'created', label: 'Created' },
  ];

  const filters = ['all', 'draft', 'done', 'cancelled'];

  if (isLoading) return <div className="text-sm text-gray-600">Loading...</div>;

  const data = adjustments ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Adjustments</h1>
          <div className="flex gap-1">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-2 py-1 text-xs border capitalize ${
                  statusFilter === f ? 'bg-black text-white border-black' : 'border-gray-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {canCreateAdjustment && (
          <Button variant="primary" size="sm" onClick={() => navigate('/adjustments/new')}>
            + New Adjustment
          </Button>
        )}
      </div>

      {data.length === 0 ? (
        <div className="border border-black p-8 text-center">
          <p className="text-sm text-gray-600">No adjustments found.</p>
          <p className="text-sm text-gray-400 mt-1">
            Create a stock adjustment to correct inventory quantities.
          </p>
        </div>
      ) : (
        <div className="border border-black">
          <Table
            columns={columns}
            data={data}
            onRowClick={(op: Operation) => navigate(`/adjustments/${op.id}`)}
            renderRow={(op: Operation) => (
              <>
                <td className="p-2 text-sm font-bold font-mono">{op.reference}</td>
                <td className="p-2 text-sm">{op.warehouse_name}</td>
                <td className="p-2 text-sm">{op.reason ?? '-'}</td>
                <td className="p-2 text-sm">
                  {op.scheduled_date
                    ? new Date(op.scheduled_date).toLocaleDateString()
                    : '-'}
                </td>
                <td className="p-2">
                  <Badge status={op.status} />
                </td>
                <td className="p-2 text-xs text-gray-500">
                  {new Date(op.created_at).toLocaleDateString()}
                </td>
              </>
            )}
          />
        </div>
      )}
    </div>
  );
};
