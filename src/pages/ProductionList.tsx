import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOperations } from '../hooks/queries';
import { usePermission } from '../hooks/useAuth';
import { Table, Button, Badge } from '../components/common';
import type { Operation } from '../types';

export const ProductionList: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: productions, isLoading } = useOperations('production', statusFilter);
  const navigate = useNavigate();
  const canCreateProduction = usePermission('production.create');

  const columns = [
    { key: 'reference', label: 'Reference' },
    { key: 'roast_date', label: 'Roast Date' },
    { key: 'roast_profile', label: 'Profile' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'status', label: 'Status' },
    { key: 'created', label: 'Created' },
  ];

  const filters = ['all', 'draft', 'in_progress', 'done', 'cancelled'];

  if (isLoading) return <div className="text-sm text-gray-600">Loading...</div>;

  const data = productions ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Production</h1>
          <div className="flex gap-1">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-2 py-1 text-xs border capitalize ${
                  statusFilter === f ? 'bg-black text-white border-black' : 'border-gray-300'
                }`}
              >
                {f === 'in_progress' ? 'In Progress' : f}
              </button>
            ))}
          </div>
        </div>
        {canCreateProduction && (
          <Button variant="primary" size="sm" onClick={() => navigate('/production/new')}>
            + New Roast
          </Button>
        )}
      </div>

      {data.length === 0 ? (
        <div className="border border-black p-8 text-center">
          <p className="text-sm text-gray-600">No production orders found.</p>
          <p className="text-sm text-gray-400 mt-1">
            Create a production order to roast green beans into roasted coffee.
          </p>
        </div>
      ) : (
        <div className="border border-black">
          <Table
            columns={columns}
            data={data}
            onRowClick={(op: Operation) => navigate(`/production/${op.id}`)}
            renderRow={(op: Operation) => (
              <>
                <td className="p-2 text-sm font-bold font-mono">{op.reference}</td>
                <td className="p-2 text-sm">
                  {op.roast_date
                    ? new Date(op.roast_date).toLocaleDateString()
                    : '-'}
                </td>
                <td className="p-2 text-sm">{op.roast_profile ?? '-'}</td>
                <td className="p-2 text-sm">{op.warehouse_name}</td>
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
