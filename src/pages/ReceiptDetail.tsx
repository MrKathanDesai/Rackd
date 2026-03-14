import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOperation, useProducts } from '../hooks/queries';
import {
  useConfirmOperation,
  useValidateOperation,
  useCancelOperation,
  useDeleteOperation,
  useAddReceiptLine,
  useUpdateOperationLine,
  useDeleteOperationLine,
} from '../hooks/mutations';
import { useToast } from '../hooks/useToast';
import { usePermission } from '../hooks/useAuth';
import { Button, Badge, Input, Select } from '../components/common';
import type { ReceiptLine } from '../types';

export const ReceiptDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const canConfirm = usePermission('receipts.confirm');
  const canValidate = usePermission('receipts.validate');
  const canCancel = usePermission('receipts.cancel');
  const canCreate = usePermission('receipts.create');
  const { data: operation, isLoading } = useOperation(Number(id));
  const { data: products } = useProducts(
    operation?.supplier_id ? { supplier_id: operation.supplier_id } : undefined
  );
  const confirmOp = useConfirmOperation();
  const validateOp = useValidateOperation();
  const cancelOp = useCancelOperation();
  const deleteOp = useDeleteOperation();
  const addLine = useAddReceiptLine();
  const updateLine = useUpdateOperationLine();
  const deleteLine = useDeleteOperationLine();

  // Add line form
  const [showAddLine, setShowAddLine] = useState(false);
  const [newLine, setNewLine] = useState({
    product_id: '',
    product_type: 'green' as 'green' | 'roasted',
    demand_qty: '',
    harvest_year: '',
    process: '',
    roast_date: '',
    lot_notes: '',
  });

  // Editing done_qty + cupping_score + roast_date for validation step
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{
    done_qty: string;
    cupping_score: string;
    roast_date: string;
    lot_notes: string;
  }>({ done_qty: '', cupping_score: '', roast_date: '', lot_notes: '' });

  const lines = (operation?.lines ?? []) as ReceiptLine[];

  if (isLoading) return <div className="text-sm text-gray-600">Loading...</div>;
  if (!operation) return <div className="text-sm text-danger">Receipt not found</div>;

  const isDraft = operation.status === 'draft';
  const isWaiting = operation.status === 'waiting';
  const isDone = operation.status === 'done';
  const isCancelled = operation.status === 'cancelled';

  const productOptions = [
    { value: '', label: operation?.supplier_id ? 'Select product...' : 'No supplier on this receipt' },
    ...(products ?? []).map((p) => ({
      value: String(p.id),
      label: `${p.name} (${p.sku})`,
    })),
  ];

  const handleConfirm = async () => {
    try {
      await confirmOp.mutateAsync(operation.id);
      toast('Receipt confirmed - waiting for goods');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to confirm', 'error');
    }
  };

  const handleValidate = async () => {
    const missingQty = lines.some((l) => !l.done_qty || l.done_qty <= 0);
    if (missingQty) {
      toast('Fill received quantity for all lines before validating', 'error');
      return;
    }
    try {
      await validateOp.mutateAsync(operation.id);
      toast('Receipt validated - lots created');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to validate', 'error');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this receipt?')) return;
    try {
      await cancelOp.mutateAsync(operation.id);
      toast('Receipt cancelled');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to cancel', 'error');
    }
  };

  const handleDelete = async () => {
    const force = operation.status !== 'draft';
    const msg = force
      ? 'This will permanently delete this receipt and reverse all inventory changes (lots, stock moves). Continue?'
      : 'Delete this draft receipt?';
    if (!confirm(msg)) return;
    try {
      await deleteOp.mutateAsync({ id: operation.id, force });
      toast('Receipt deleted');
      navigate('/receipts');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to delete receipt', 'error');
    }
  };

  const handleAddLine = async () => {
    if (!newLine.product_id || !newLine.demand_qty) {
      toast('Product and quantity are required', 'error');
      return;
    }
    try {
      await addLine.mutateAsync({
        operationId: operation.id,
        product_id: Number(newLine.product_id),
        demand_qty: Number(newLine.demand_qty),
        product_type: newLine.product_type,
        harvest_year: newLine.harvest_year ? Number(newLine.harvest_year) : undefined,
        process: newLine.process.trim() || undefined,
        roast_date: newLine.product_type === 'roasted' && newLine.roast_date ? newLine.roast_date : undefined,
        lot_notes: newLine.lot_notes.trim() || undefined,
      });
      setNewLine({ product_id: '', product_type: 'green', demand_qty: '', harvest_year: '', process: '', roast_date: '', lot_notes: '' });
      setShowAddLine(false);
      toast('Line added');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to add line', 'error');
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

  const startEditLine = (line: ReceiptLine) => {
    setEditingLine(line.id);
    setEditValues({
      done_qty: String(line.done_qty || line.demand_qty),
      cupping_score: String(line.cupping_score ?? ''),
      roast_date: line.roast_date ?? '',
      lot_notes: line.lot_notes ?? '',
    });
  };

  const saveEditLine = async (lineId: number) => {
    try {
      await updateLine.mutateAsync({
        operationId: operation.id,
        lineId,
        done_qty: Number(editValues.done_qty),
        cupping_score: editValues.cupping_score ? Number(editValues.cupping_score) : undefined,
        roast_date: editValues.roast_date || undefined,
        lot_notes: editValues.lot_notes.trim() || undefined,
      });
      setEditingLine(null);
      toast('Line updated');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to update line', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => navigate('/receipts')}>
            Back
          </Button>
          <h1 className="text-2xl font-bold font-mono">{operation.reference}</h1>
          <Badge status={operation.status} />
        </div>
        <div className="flex gap-2">
          {isDraft && canConfirm && (
            <Button variant="primary" size="sm" onClick={handleConfirm} disabled={confirmOp.isPending}>
              Confirm
            </Button>
          )}
          {isWaiting && canValidate && (
            <Button variant="primary" size="sm" onClick={handleValidate} disabled={validateOp.isPending}>
              Validate
            </Button>
          )}
          {!isDone && !isCancelled && canCancel && (
            <Button variant="danger" size="sm" onClick={handleCancel} disabled={cancelOp.isPending}>
              Cancel
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleteOp.isPending}>
            Delete
          </Button>
        </div>
      </div>

      {/* Meta info */}
      <div className="border border-black p-4">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-xs text-gray-400 uppercase block">Supplier</span>
            <span className="font-bold">{operation.supplier_name ?? '-'}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase block">Warehouse</span>
            <span>{operation.warehouse_name}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase block">Expected Date</span>
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

      {/* Lines */}
      <div className="border border-black">
        <div className="flex items-center justify-between px-4 py-2 border-b border-black bg-gray-50">
          <span className="text-sm font-bold uppercase">
            Lines ({lines.length})
          </span>
          {isDraft && canCreate && (
            <Button size="sm" onClick={() => setShowAddLine(true)}>
              + Add Line
            </Button>
          )}
        </div>

        {lines.length === 0 ? (
          <div className="p-4 text-sm text-gray-400 text-center">No lines yet.</div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr className="text-xs uppercase text-left">
                <th className="p-2">Product</th>
                <th className="p-2">Type</th>
                <th className="p-2 text-right">Demand</th>
                <th className="p-2 text-right">Received</th>
                <th className="p-2">Harvest</th>
                <th className="p-2">Process</th>
                <th className="p-2">Roast Date</th>
                <th className="p-2 text-right">Cupping</th>
                <th className="p-2">Notes</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-t">
                  {editingLine === line.id ? (
                    <>
                      <td className="p-2 text-sm font-bold">
                        {line.product_name}
                        <span className="text-xs text-gray-400 ml-1">{line.sku}</span>
                      </td>
                      <td className="p-2 text-xs uppercase">
                        <span className={line.product_type === 'roasted' ? 'text-amber-700' : 'text-green-700'}>
                          {line.product_type}
                        </span>
                      </td>
                      <td className="p-2 text-sm text-right">
                        {line.demand_qty} {line.unit}
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={editValues.done_qty}
                          onChange={(e) =>
                            setEditValues({ ...editValues, done_qty: e.target.value })
                          }
                          className="w-20 px-1 py-1 border border-black text-sm text-right"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="p-2 text-sm">{line.harvest_year ?? '-'}</td>
                      <td className="p-2 text-sm">{line.process ?? '-'}</td>
                      <td className="p-2">
                        {line.product_type === 'roasted' ? (
                          <input
                            type="date"
                            value={editValues.roast_date}
                            onChange={(e) =>
                              setEditValues({ ...editValues, roast_date: e.target.value })
                            }
                            className="w-36 px-1 py-1 border border-black text-sm"
                          />
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={editValues.cupping_score}
                          onChange={(e) =>
                            setEditValues({ ...editValues, cupping_score: e.target.value })
                          }
                          className="w-16 px-1 py-1 border border-black text-sm text-right"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="Score"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          value={editValues.lot_notes}
                          onChange={(e) =>
                            setEditValues({ ...editValues, lot_notes: e.target.value })
                          }
                          className="w-full px-1 py-1 border border-black text-sm"
                          placeholder="Notes"
                        />
                      </td>
                      <td className="p-2 text-right space-x-1">
                        <Button size="sm" variant="primary" onClick={() => saveEditLine(line.id)}>
                          Save
                        </Button>
                        <Button size="sm" onClick={() => setEditingLine(null)}>
                          X
                        </Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-2 text-sm font-bold">
                        {line.product_name}
                        <span className="text-xs text-gray-400 ml-1">{line.sku}</span>
                      </td>
                      <td className="p-2 text-xs uppercase">
                        <span className={line.product_type === 'roasted' ? 'text-amber-700' : 'text-green-700'}>
                          {line.product_type}
                        </span>
                      </td>
                      <td className="p-2 text-sm text-right">
                        {line.demand_qty} {line.unit}
                      </td>
                      <td className="p-2 text-sm text-right font-bold">
                        {line.done_qty > 0 ? `${line.done_qty} ${line.unit}` : '-'}
                      </td>
                      <td className="p-2 text-sm">{line.harvest_year ?? '-'}</td>
                      <td className="p-2 text-sm">{line.process ?? '-'}</td>
                      <td className="p-2 text-sm">
                        {line.roast_date
                          ? new Date(line.roast_date).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="p-2 text-sm text-right">{line.cupping_score ?? '-'}</td>
                      <td className="p-2 text-sm text-gray-600 truncate max-w-[150px]">
                        {line.lot_notes ?? '-'}
                      </td>
                      <td className="p-2 text-right space-x-1">
                        {isWaiting && canCreate && (
                          <Button size="sm" onClick={() => startEditLine(line)}>
                            Fill
                          </Button>
                        )}
                        {isDraft && canCreate && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteLine(line.id)}
                          >
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

        {/* Add line form (inline) */}
        {showAddLine && isDraft && canCreate && (
          <div className="border-t p-4 space-y-3 bg-gray-50">
            <span className="text-xs font-bold uppercase text-gray-400">Add Line</span>
            <div className="grid grid-cols-4 gap-3">
              <Select
                value={newLine.product_id}
                onChange={(e) => setNewLine({ ...newLine, product_id: e.target.value })}
                options={productOptions}
              />
              <Input
                type="number"
                value={newLine.demand_qty}
                onChange={(e) => setNewLine({ ...newLine, demand_qty: e.target.value })}
                placeholder="Qty"
                min="0.01"
                step="0.01"
              />
              <Select
                label="Coffee Type"
                value={newLine.product_type}
                onChange={(e) => {
                  const pt = e.target.value as 'green' | 'roasted';
                  setNewLine({ ...newLine, product_type: pt, roast_date: pt === 'green' ? '' : newLine.roast_date });
                }}
                options={[
                  { value: 'green', label: 'Green Coffee' },
                  { value: 'roasted', label: 'Roasted Coffee' },
                ]}
              />
              <Input
                value={newLine.process}
                onChange={(e) => setNewLine({ ...newLine, process: e.target.value })}
                placeholder="Process"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                type="number"
                value={newLine.harvest_year}
                onChange={(e) => setNewLine({ ...newLine, harvest_year: e.target.value })}
                placeholder="Harvest year"
              />
              {newLine.product_type === 'roasted' && (
                <Input
                  label="Roast Date"
                  type="date"
                  value={newLine.roast_date}
                  onChange={(e) => setNewLine({ ...newLine, roast_date: e.target.value })}
                />
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" onClick={() => setShowAddLine(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleAddLine}>
                Add
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* State help */}
      {isDraft && lines.length > 0 && (
        <div className="text-xs text-gray-400">
          Draft: Add or remove lines, then Confirm to move to Waiting.
        </div>
      )}
      {isWaiting && (
        <div className="text-xs text-gray-400">
          Waiting: Fill received quantities and cupping scores for each line, then Validate to create lots. Each line's coffee type (Green/Roasted) determines the lot type created.
        </div>
      )}
    </div>
  );
};
