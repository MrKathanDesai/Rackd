import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOperation } from '../hooks/queries';
import {
  useValidateOperation,
  useCancelOperation,
} from '../hooks/mutations';
import { useToast } from '../hooks/useToast';
import { usePermission } from '../hooks/useAuth';
import { Button, Badge } from '../components/common';
import type { AdjustmentLine } from '../types';

export const AdjustmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const canValidate = usePermission('adjustments.validate');
  const { data: operation, isLoading } = useOperation(Number(id));
  const validateOp = useValidateOperation();
  const cancelOp = useCancelOperation();

  if (isLoading) return <div className="text-sm text-gray-600">Loading...</div>;
  if (!operation) return <div className="text-sm text-danger">Adjustment not found</div>;

  const lines = (operation.lines ?? []) as AdjustmentLine[];
  const isDraft = operation.status === 'draft';
  const isDone = operation.status === 'done';
  const isCancelled = operation.status === 'cancelled';

  const handleValidate = async () => {
    if (lines.length === 0) {
      toast('Add at least one line before validating', 'error');
      return;
    }
    try {
      await validateOp.mutateAsync(operation.id);
      toast('Adjustment validated - stock updated');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to validate', 'error');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this adjustment?')) return;
    try {
      await cancelOp.mutateAsync(operation.id);
      toast('Adjustment cancelled');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to cancel', 'error');
    }
  };

  const totalGain = lines.reduce((sum, l) => {
    const diff = l.actual_qty - l.system_qty;
    return diff > 0 ? sum + diff : sum;
  }, 0);
  const totalLoss = lines.reduce((sum, l) => {
    const diff = l.system_qty - l.actual_qty;
    return diff > 0 ? sum + diff : sum;
  }, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => navigate('/adjustments')}>
            Back
          </Button>
          <h1 className="text-2xl font-bold font-mono">{operation.reference}</h1>
          <Badge status={operation.status} />
        </div>
        <div className="flex gap-2">
          {isDraft && canValidate && (
            <Button variant="primary" size="sm" onClick={handleValidate} disabled={validateOp.isPending}>
              Validate
            </Button>
          )}
          {!isDone && !isCancelled && (
            <Button variant="danger" size="sm" onClick={handleCancel} disabled={cancelOp.isPending}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Meta info */}
      <div className="border border-black p-4">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-xs text-gray-400 uppercase block">Warehouse</span>
            <span className="font-bold">{operation.warehouse_name}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase block">Reason</span>
            <span>{operation.reason ?? '-'}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase block">Date</span>
            <span>
              {operation.scheduled_date
                ? new Date(operation.scheduled_date).toLocaleDateString()
                : '-'}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase block">Created By</span>
            <span>{operation.created_by_name}</span>
          </div>
        </div>
        {operation.notes && (
          <div className="mt-3 text-sm">
            <span className="text-xs text-gray-400 uppercase block">Notes</span>
            <span>{operation.notes}</span>
          </div>
        )}
        {operation.validated_at && (
          <div className="mt-3 text-sm">
            <span className="text-xs text-gray-400 uppercase block">Validated</span>
            <span>{new Date(operation.validated_at).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-black p-3">
          <div className="text-xs text-gray-400 uppercase">Total Gain</div>
          <div className="text-lg font-bold text-green-700">+{totalGain.toFixed(2)}</div>
        </div>
        <div className="border border-black p-3">
          <div className="text-xs text-gray-400 uppercase">Total Loss</div>
          <div className="text-lg font-bold text-danger">-{totalLoss.toFixed(2)}</div>
        </div>
      </div>

      {/* Lines */}
      <div className="border border-black">
        <div className="px-4 py-2 border-b border-black bg-gray-50">
          <span className="text-sm font-bold uppercase">Lines ({lines.length})</span>
        </div>

        {lines.length === 0 ? (
          <div className="p-4 text-sm text-gray-400 text-center">No lines.</div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr className="text-xs uppercase text-left">
                <th className="p-2">Lot</th>
                <th className="p-2">Product</th>
                <th className="p-2 text-right">System Qty</th>
                <th className="p-2 text-right">Actual Qty</th>
                <th className="p-2 text-right">Diff</th>
                <th className="p-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const diff = line.actual_qty - line.system_qty;
                return (
                  <tr key={line.id} className="border-t">
                    <td className="p-2 text-sm font-mono font-bold">{line.lot_number}</td>
                    <td className="p-2 text-sm">
                      {line.product_name}
                      <span className="text-xs text-gray-400 ml-1">{line.sku}</span>
                    </td>
                    <td className="p-2 text-sm text-right">{line.system_qty} {line.unit}</td>
                    <td className="p-2 text-sm text-right font-bold">{line.actual_qty} {line.unit}</td>
                    <td className={`p-2 text-sm text-right font-bold ${
                      diff > 0 ? 'text-green-700' : diff < 0 ? 'text-danger' : 'text-gray-400'
                    }`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(2)} {line.unit}
                    </td>
                    <td className="p-2 text-sm text-gray-600 truncate max-w-[200px]">
                      {line.notes ?? '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* State help */}
      {isDraft && lines.length > 0 && (
        <div className="text-xs text-gray-400">
          Draft: Review the adjustment lines, then Validate to apply the stock changes.
        </div>
      )}
    </div>
  );
};
