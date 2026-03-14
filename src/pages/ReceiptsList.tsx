import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOperations } from '../hooks/queries';
import { useDeleteOperation } from '../hooks/mutations';
import { useToast } from '../hooks/useToast';
import { usePermission } from '../hooks/useAuth';
import { Table, Button, Badge } from '../components/common';
import type { Operation } from '../types';

export const ReceiptsList: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { data: receipts, isLoading } = useOperations('receipt', statusFilter);
  const deleteOp = useDeleteOperation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const canCreateReceipt = usePermission('receipts.create');

  const handleDelete = async (op: Operation, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent row click navigation
    const force = op.status !== 'draft';
    const msg = force
      ? `Permanently delete "${op.reference}" and reverse all inventory changes?`
      : `Delete draft "${op.reference}"?`;
    if (!confirm(msg)) return;
    try {
      await deleteOp.mutateAsync({ id: op.id, force });
      toast('Receipt deleted');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to delete', 'error');
    }
  };

  const columns = [
    { key: 'reference', label: 'Reference' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'date', label: 'Expected Date' },
    { key: 'status', label: 'Status' },
    { key: 'created', label: 'Created' },
    { key: 'actions', label: '', align: 'right' as const },
  ];

  const filters = ['all', 'draft', 'waiting', 'done', 'cancelled'];

  if (isLoading) {
    return <div className="text-sm text-gray-600">Loading...</div>;
  }

  const data = receipts ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Receipts</h1>
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
        {canCreateReceipt && (
          <Button variant="primary" size="sm" onClick={() => navigate('/receipts/new')}>
            + New Receipt
          </Button>
        )}
      </div>

      {data.length === 0 ? (
        <div className="border border-black p-8 text-center">
          <p className="text-sm text-gray-600">No receipts found.</p>
          <p className="text-sm text-gray-400 mt-1">
            Create a receipt to log incoming green beans or roasted coffee.
          </p>
        </div>
      ) : (
        <div className="border border-black">
          <Table
            columns={columns}
            data={data}
            onRowClick={(op: Operation) => navigate(`/receipts/${op.id}`)}
            renderRow={(op: Operation) => (
              <>
                <td className="p-2 text-sm font-bold font-mono">{op.reference}</td>
                <td className="p-2 text-sm">{op.supplier_name ?? '-'}</td>
                <td className="p-2 text-sm">{op.warehouse_name}</td>
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
                <td className="p-2 text-right">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={(e: React.MouseEvent) => handleDelete(op, e)}
                    disabled={deleteOp.isPending}
                  >
                    Delete
                  </Button>
                </td>
              </>
            )}
          />
        </div>
      )}
    </div>
  );
};
