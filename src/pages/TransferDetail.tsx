import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOperation } from '../hooks/queries';
import {
  useConfirmOperation,
  useValidateOperation,
  useCancelOperation,
  useDeleteOperation,
} from '../hooks/mutations';
import { useToast } from '../hooks/useToast';
import { usePermission } from '../hooks/useAuth';
import { Button, Badge } from '../components/common';
import type { TransferLine } from '../types';

export const TransferDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const canValidate = usePermission('transfers.validate');
  const canCancel = usePermission('transfers.cancel');
  const canCreate = usePermission('transfers.create');
  const { data: operation, isLoading } = useOperation(Number(id));
  const confirmOp = useConfirmOperation();
  const validateOp = useValidateOperation();
  const cancelOp = useCancelOperation();
  const deleteOp = useDeleteOperation();

  if (isLoading) return <div className="text-sm text-gray-600">Loading...</div>;
  if (!operation) return <div className="text-sm text-danger">Transfer not found</div>;

  const lines = (operation.lines ?? []) as TransferLine[];
  const isDraft = operation.status === 'draft';
  const isWaiting = operation.status === 'waiting';
  const isDone = operation.status === 'done';
  const isCancelled = operation.status === 'cancelled';

  const handleConfirm = async () => {
    if (lines.length === 0) {
      toast('Add at least one line before confirming', 'error');
      return;
    }
    try {
      await confirmOp.mutateAsync(operation.id);
      toast('Transfer confirmed - awaiting validation');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to confirm', 'error');
    }
  };

  const handleValidate = async () => {
    try {
      await validateOp.mutateAsync(operation.id);
      toast('Transfer validated - stock moved');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to validate', 'error');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this transfer?')) return;
    try {
      await cancelOp.mutateAsync(operation.id);
      toast('Transfer cancelled');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to cancel', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this transfer? This cannot be undone.')) return;
    try {
      await deleteOp.mutateAsync({ id: operation.id, force: isDone });
      toast('Transfer deleted');
      navigate('/transfers');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to delete', 'error');
    }
  };

  const totalQty = lines.reduce((sum, l) => sum + l.qty, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => navigate('/transfers')}>
            Back
          </Button>
          <h1 className="text-2xl font-bold font-mono">{operation.reference}</h1>
          <Badge status={operation.status} />
        </div>
        <div className="flex gap-2">
          {isDraft && canCreate && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirm}
              disabled={confirmOp.isPending}
            >
              Confirm
            </Button>
          )}
          {isWaiting && canValidate && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleValidate}
              disabled={validateOp.isPending}
            >
              Validate
            </Button>
          )}
          {!isDone && !isCancelled && canCancel && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleCancel}
              disabled={cancelOp.isPending}
            >
              Cancel
            </Button>
          )}
          {(isDraft || isCancelled) && (
            <Button size="sm" onClick={handleDelete} disabled={deleteOp.isPending}>
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Meta info */}
      <div className="border border-black p-4">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-xs text-gray-400 uppercase block">Source</span>
            <span className="font-bold">{operation.warehouse_name}</span>
            <span className="text-xs text-gray-400 ml-1">({operation.warehouse_code})</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase block">Destination</span>
            <span className="font-bold">
              {operation.destination_warehouse_name ?? '-'}
            </span>
            {operation.destination_warehouse_code && (
              <span className="text-xs text-gray-400 ml-1">
                ({operation.destination_warehouse_code})
              </span>
            )}
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase block">Scheduled</span>
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
          <div className="text-xs text-gray-400 uppercase">Lines</div>
          <div className="text-lg font-bold">{lines.length}</div>
        </div>
        <div className="border border-black p-3">
          <div className="text-xs text-gray-400 uppercase">Total Qty</div>
          <div className="text-lg font-bold">{totalQty.toFixed(2)}</div>
        </div>
      </div>

      {/* Lines */}
      <div className="border border-black">
        <div className="px-4 py-2 border-b border-black bg-gray-50">
          <span className="text-sm font-bold uppercase">Transfer Lines ({lines.length})</span>
        </div>

        {lines.length === 0 ? (
          <div className="p-4 text-sm text-gray-400 text-center">No lines.</div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr className="text-xs uppercase text-left">
                <th className="p-2">Lot</th>
                <th className="p-2">Product</th>
                <th className="p-2">Type</th>
                <th className="p-2 text-right">Lot Remaining</th>
                <th className="p-2 text-right">Transfer Qty</th>
                <th className="p-2">Expiry</th>
                <th className="p-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-t">
                  <td className="p-2 text-sm font-mono font-bold">{line.lot_number}</td>
                  <td className="p-2 text-sm">
                    {line.product_name}
                    <span className="text-xs text-gray-400 ml-1">{line.sku}</span>
                  </td>
                  <td className="p-2 text-xs uppercase">{line.product_type}</td>
                  <td className="p-2 text-sm text-right">
                    {line.lot_remaining} {line.unit}
                  </td>
                  <td className="p-2 text-sm text-right font-bold">
                    {line.qty} {line.unit}
                  </td>
                  <td className="p-2 text-sm">
                    {line.expiry_date
                      ? new Date(line.expiry_date).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="p-2 text-sm text-gray-600 truncate max-w-[200px]">
                    {line.notes ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* State help */}
      {isDraft && lines.length > 0 && (
        <div className="text-xs text-gray-400">
          Draft: Review the transfer lines, then Confirm to lock and prepare for validation.
        </div>
      )}
      {isWaiting && (
        <div className="text-xs text-gray-400">
          Waiting: Transfer confirmed. Validate to execute the stock movement.
        </div>
      )}
    </div>
  );
};
