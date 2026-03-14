import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOperation, useLotSearch } from '../hooks/queries';
import {
  useConfirmOperation,
  useValidateOperation,
  useCancelOperation,
  useAddProductionInput,
  useUpdateOperationLine,
  useDeleteOperationLine,
} from '../hooks/mutations';
import { useToast } from '../hooks/useToast';
import { usePermission } from '../hooks/useAuth';
import { Button, Badge, Input, Select } from '../components/common';
import type { ProductionInput } from '../types';

export const ProductionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const canStart = usePermission('production.start');
  const canValidate = usePermission('production.validate');
  const canCancel = usePermission('production.cancel');
  const canCreate = usePermission('production.create');
  const { data: operation, isLoading } = useOperation(Number(id));
  const { data: greenLots } = useLotSearch({ product_type: 'green', status: 'active' });
  const confirmOp = useConfirmOperation();
  const validateOp = useValidateOperation();
  const cancelOp = useCancelOperation();
  const addInput = useAddProductionInput();
  const updateLine = useUpdateOperationLine();
  const deleteLine = useDeleteOperationLine();

  // Add input form
  const [showAddInput, setShowAddInput] = useState(false);
  const [newInput, setNewInput] = useState({ lot_id: '', qty: '', expected_yield: '' });

  // Editing actual_yield on an input line
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [editYield, setEditYield] = useState('');

  if (isLoading) return <div className="text-sm text-gray-600">Loading...</div>;
  if (!operation) return <div className="text-sm text-danger">Production order not found</div>;

  // Lines are a flat ProductionInput[] array
  const lines = (operation.lines ?? []) as ProductionInput[];

  const isDraft = operation.status === 'draft';
  const isInProgress = operation.status === 'in_progress';
  const isDone = operation.status === 'done';
  const isCancelled = operation.status === 'cancelled';

  const lotOptions = [
    { value: '', label: 'Select green bean lot...' },
    ...(greenLots ?? []).map((l) => ({
      value: String(l.id),
      label: `${l.lot_number} — ${l.product_name} (${l.remaining_qty} ${l.unit} avail)`,
    })),
  ];

  const handleConfirm = async () => {
    if (lines.length === 0) {
      toast('Add at least one input lot before starting roast', 'error');
      return;
    }
    try {
      await confirmOp.mutateAsync(operation.id);
      toast('Roast started — inputs reserved');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to start roast', 'error');
    }
  };

  const handleValidate = async () => {
    const missingYield = lines.some((l) => !l.actual_yield || l.actual_yield <= 0);
    if (missingYield) {
      toast('Fill actual yield for all input lines before validating', 'error');
      return;
    }
    try {
      await validateOp.mutateAsync(operation.id);
      toast('Production validated — roasted lots created');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to validate', 'error');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this production order?')) return;
    try {
      await cancelOp.mutateAsync(operation.id);
      toast('Production cancelled');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to cancel', 'error');
    }
  };

  const handleAddInput = async () => {
    if (!newInput.lot_id || !newInput.qty) {
      toast('Lot and quantity are required', 'error');
      return;
    }
    try {
      await addInput.mutateAsync({
        operationId: operation.id,
        lot_id: Number(newInput.lot_id),
        qty: Number(newInput.qty),
        expected_yield: newInput.expected_yield ? Number(newInput.expected_yield) : undefined,
      });
      setNewInput({ lot_id: '', qty: '', expected_yield: '' });
      setShowAddInput(false);
      toast('Input added');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to add input', 'error');
    }
  };

  const handleDeleteLine = async (lineId: number) => {
    if (!confirm('Delete this line?')) return;
    try {
      await deleteLine.mutateAsync({ operationId: operation.id, lineId });
      toast('Line deleted');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to delete line', 'error');
    }
  };

  const startEditYield = (line: ProductionInput) => {
    setEditingLine(line.id);
    setEditYield(String(line.actual_yield ?? line.expected_yield ?? ''));
  };

  const saveEditYield = async (lineId: number) => {
    try {
      await updateLine.mutateAsync({
        operationId: operation.id,
        lineId,
        actual_yield: Number(editYield),
      });
      setEditingLine(null);
      toast('Yield updated');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to update yield', 'error');
    }
  };

  const totalInputQty = lines.reduce((sum, l) => sum + l.qty, 0);
  const totalExpectedYield = lines.reduce((sum, l) => sum + (l.expected_yield ?? 0), 0);
  const totalActualYield = lines.reduce((sum, l) => sum + (l.actual_yield ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => navigate('/production')}>
            Back
          </Button>
          <h1 className="text-2xl font-bold font-mono">{operation.reference}</h1>
          <Badge status={operation.status} />
        </div>
        <div className="flex gap-2">
          {isDraft && canStart && (
            <Button variant="primary" size="sm" onClick={handleConfirm} disabled={confirmOp.isPending}>
              Start Roast
            </Button>
          )}
          {isInProgress && canValidate && (
            <Button variant="primary" size="sm" onClick={handleValidate} disabled={validateOp.isPending}>
              Validate
            </Button>
          )}
          {!isDone && !isCancelled && canCancel && (
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
            <span className="text-xs text-gray-400 uppercase block">Roast Date</span>
            <span>
              {operation.roast_date
                ? new Date(operation.roast_date).toLocaleDateString()
                : '-'}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase block">Profile</span>
            <span>{operation.roast_profile ?? '-'}</span>
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

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-black p-3">
          <div className="text-xs text-gray-400 uppercase">Total Input</div>
          <div className="text-lg font-bold">{totalInputQty.toFixed(2)}</div>
        </div>
        <div className="border border-black p-3">
          <div className="text-xs text-gray-400 uppercase">Expected Yield</div>
          <div className="text-lg font-bold">
            {totalExpectedYield > 0 ? totalExpectedYield.toFixed(2) : '-'}
          </div>
        </div>
        <div className="border border-black p-3">
          <div className="text-xs text-gray-400 uppercase">Actual Yield</div>
          <div className="text-lg font-bold">
            {totalActualYield > 0 ? totalActualYield.toFixed(2) : '-'}
            {totalActualYield > 0 && totalInputQty > 0 && (
              <span className="text-xs text-gray-400 ml-2">
                ({((totalActualYield / totalInputQty) * 100).toFixed(1)}% yield)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Single lines table — inputs with yield tracking */}
      <div className="border border-black">
        <div className="flex items-center justify-between px-4 py-2 border-b border-black bg-gray-50">
          <span className="text-sm font-bold uppercase">
            Input Lines ({lines.length})
          </span>
          {isDraft && canCreate && (
            <Button size="sm" onClick={() => setShowAddInput(true)}>
              + Add Input
            </Button>
          )}
        </div>

        {lines.length === 0 ? (
          <div className="p-4 text-sm text-gray-400 text-center">No input lines yet.</div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr className="text-xs uppercase text-left">
                <th className="p-2">Lot</th>
                <th className="p-2">Product</th>
                <th className="p-2 text-right">Qty Used</th>
                <th className="p-2 text-right">Expected Yield</th>
                <th className="p-2 text-right">Actual Yield</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line: ProductionInput) => (
                <tr key={line.id} className="border-t">
                  <td className="p-2 text-sm font-mono font-bold">{line.lot_number}</td>
                  <td className="p-2 text-sm">
                    {line.product_name}
                    <span className="text-xs text-gray-400 ml-1">{line.sku}</span>
                  </td>
                  <td className="p-2 text-sm text-right font-bold">
                    {line.qty} {line.unit}
                  </td>
                  <td className="p-2 text-sm text-right">
                    {line.expected_yield != null ? `${line.expected_yield} ${line.unit}` : '-'}
                  </td>
                  {editingLine === line.id ? (
                    <>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          value={editYield}
                          onChange={(e) => setEditYield(e.target.value)}
                          className="w-20 px-1 py-1 border border-black text-sm text-right"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="p-2 text-right space-x-1">
                        <Button size="sm" variant="primary" onClick={() => saveEditYield(line.id)}>
                          Save
                        </Button>
                        <Button size="sm" onClick={() => setEditingLine(null)}>
                          X
                        </Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-2 text-sm text-right font-bold">
                        {line.actual_yield != null ? `${line.actual_yield} ${line.unit}` : '-'}
                      </td>
                      <td className="p-2 text-right space-x-1">
                        {isInProgress && canCreate && (
                          <Button size="sm" onClick={() => startEditYield(line)}>
                            Fill Yield
                          </Button>
                        )}
                        {isDraft && canCreate && (
                          <Button size="sm" variant="danger" onClick={() => handleDeleteLine(line.id)}>
                            Del
                          </Button>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {showAddInput && isDraft && canCreate && (
          <div className="border-t p-4 space-y-3 bg-gray-50">
            <span className="text-xs font-bold uppercase text-gray-400">Add Input</span>
            <div className="grid grid-cols-3 gap-3">
              <Select
                value={newInput.lot_id}
                onChange={(e) => setNewInput({ ...newInput, lot_id: e.target.value })}
                options={lotOptions}
              />
              <Input
                type="number"
                value={newInput.qty}
                onChange={(e) => setNewInput({ ...newInput, qty: e.target.value })}
                placeholder="Qty to use"
                min="0.01"
                step="0.01"
              />
              <Input
                type="number"
                value={newInput.expected_yield}
                onChange={(e) => setNewInput({ ...newInput, expected_yield: e.target.value })}
                placeholder="Expected yield (optional)"
                min="0.01"
                step="0.01"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={() => setShowAddInput(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleAddInput}>
                Add
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* State help */}
      {isDraft && (
        <div className="text-xs text-gray-400">
          Draft: Add input lots (green beans to consume), then click "Start Roast" to reserve stock.
        </div>
      )}
      {isInProgress && (
        <div className="text-xs text-gray-400">
          In Progress: Fill actual yield for each input line, then Validate to complete. Validation consumes green lots and creates roasted lots for the same products.
        </div>
      )}
    </div>
  );
};
