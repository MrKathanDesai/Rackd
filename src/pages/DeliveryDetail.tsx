import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOperation, useProducts, useLotSuggestions } from '../hooks/queries';
import {
  useConfirmOperation,
  useCheckAvailability,
  useValidateOperation,
  useCancelOperation,
  useDeleteOperation,
  useAddDeliveryLine,
  useDeleteOperationLine,
  useSetDeliveryAllocations,
} from '../hooks/mutations';
import { useToast } from '../hooks/useToast';
import { usePermission } from '../hooks/useAuth';
import { Button, Badge, Select, Input } from '../components/common';
import type { DeliveryLine, AvailabilityIssue, LotSuggestion } from '../types';

export const DeliveryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const canConfirm = usePermission('deliveries.confirm');
  const canValidate = usePermission('deliveries.validate');
  const canCancel = usePermission('deliveries.cancel');
  const canCreate = usePermission('deliveries.create');
  const { data: operation, isLoading } = useOperation(Number(id));
  const { data: products } = useProducts();
  const confirmOp = useConfirmOperation();
  const checkAvail = useCheckAvailability();
  const validateOp = useValidateOperation();
  const cancelOp = useCancelOperation();
  const deleteOp = useDeleteOperation();
  const addLine = useAddDeliveryLine();
  const deleteLine = useDeleteOperationLine();
  const setAllocations = useSetDeliveryAllocations();

  const [availIssues, setAvailIssues] = useState<AvailabilityIssue[] | null>(null);
  const [showAddLine, setShowAddLine] = useState(false);
  const [newLine, setNewLine] = useState({ product_id: '', demand_qty: '' });

  // FIFO allocation view
  const [allocatingLine, setAllocatingLine] = useState<number | null>(null);

  if (isLoading) return <div className="text-sm text-gray-600">Loading...</div>;
  if (!operation) return <div className="text-sm text-danger">Delivery not found</div>;

  const lines = (operation.lines ?? []) as DeliveryLine[];
  const isDraft = operation.status === 'draft';
  const isWaiting = operation.status === 'waiting';
  const isReady = operation.status === 'ready';
  const isDone = operation.status === 'done';
  const isCancelled = operation.status === 'cancelled';

  const productOptions = [
    { value: '', label: 'Select product...' },
    ...(products ?? []).map((p) => ({
      value: String(p.id),
      label: `${p.name} (${p.sku}) — avail: ${p.available} ${p.unit}`,
    })),
  ];

  const handleConfirm = async () => {
    try {
      await confirmOp.mutateAsync(operation.id);
      toast('Delivery confirmed - waiting for allocation');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to confirm', 'error');
    }
  };

  const handleCheckAvailability = async () => {
    try {
      const result = await checkAvail.mutateAsync(operation.id);
      if (result.availabilityIssues && result.availabilityIssues.length > 0) {
        setAvailIssues(result.availabilityIssues);
        toast('Availability checked - see issues below', 'error');
      } else {
        setAvailIssues(null);
        toast('All items available - ready to validate');
      }
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to check availability', 'error');
    }
  };

  const handleValidate = async () => {
    try {
      await validateOp.mutateAsync(operation.id);
      toast('Delivery validated - stock dispatched');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to validate', 'error');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this delivery?')) return;
    try {
      await cancelOp.mutateAsync(operation.id);
      toast('Delivery cancelled');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to cancel', 'error');
    }
  };

  const handleDelete = async () => {
    const force = operation.status !== 'draft';
    const msg = force
      ? 'This will permanently delete this delivery and reverse all inventory changes. Continue?'
      : 'Delete this draft delivery?';
    if (!confirm(msg)) return;
    try {
      await deleteOp.mutateAsync({ id: operation.id, force });
      toast('Delivery deleted');
      navigate('/deliveries');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to delete delivery', 'error');
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
      });
      setNewLine({ product_id: '', demand_qty: '' });
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => navigate('/deliveries')}>
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
          {isWaiting && canConfirm && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleCheckAvailability}
              disabled={checkAvail.isPending}
            >
              Check Availability
            </Button>
          )}
          {isReady && canValidate && (
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

      {/* Meta */}
      <div className="border border-black p-4">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-xs text-gray-400 uppercase block">Customer</span>
            <span className="font-bold">{operation.customer ?? '-'}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase block">Warehouse</span>
            <span>{operation.warehouse_name}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase block">Delivery Date</span>
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
        {operation.validated_at && (
          <div className="mt-3 text-sm">
            <span className="text-xs text-gray-400 uppercase block">Validated</span>
            <span>{new Date(operation.validated_at).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Availability issues */}
      {availIssues && availIssues.length > 0 && (
        <div className="border border-danger p-4 bg-red-50">
          <span className="text-sm font-bold text-danger block mb-2">Availability Issues</span>
          {availIssues.map((issue) => (
            <div key={issue.productId} className="text-sm">
              <span className="font-bold">{issue.productName}</span> ({issue.sku}): need{' '}
              {issue.demandQty}, available {issue.availableQty}, shortfall{' '}
              <span className="text-danger font-bold">{issue.shortfall}</span>
            </div>
          ))}
        </div>
      )}

      {/* Lines */}
      <div className="border border-black">
        <div className="flex items-center justify-between px-4 py-2 border-b border-black bg-gray-50">
          <span className="text-sm font-bold uppercase">Lines ({lines.length})</span>
          {isDraft && canCreate && (
            <Button size="sm" onClick={() => setShowAddLine(true)}>
              + Add Line
            </Button>
          )}
        </div>

        {lines.length === 0 ? (
          <div className="p-4 text-sm text-gray-400 text-center">No lines yet.</div>
        ) : (
          <div className="divide-y">
            {lines.map((line) => (
              <div key={line.id}>
                <div className="flex items-center justify-between p-3">
                  <div className="flex-1">
                    <span className="text-sm font-bold">{line.product_name}</span>
                    <span className="text-xs text-gray-400 ml-1">{line.sku}</span>
                    <span className="text-sm ml-4">
                      {line.demand_qty} {line.unit}
                    </span>
                    {line.done_qty > 0 && (
                      <span className="text-sm text-success ml-2">
                        (dispatched: {line.done_qty})
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {(isWaiting || isReady) && (
                      <Button
                        size="sm"
                        onClick={() =>
                          setAllocatingLine(allocatingLine === line.id ? null : line.id)
                        }
                      >
                        {allocatingLine === line.id ? 'Hide Lots' : 'Lot Alloc'}
                      </Button>
                    )}
                    {isDraft && canCreate && (
                      <Button size="sm" variant="danger" onClick={() => handleDeleteLine(line.id)}>
                        Del
                      </Button>
                    )}
                  </div>
                </div>

                {/* Lot allocations display */}
                {line.allocations && line.allocations.length > 0 && allocatingLine !== line.id && (
                  <div className="px-6 pb-3">
                    <div className="text-xs text-gray-400 mb-1">Allocated Lots:</div>
                    {line.allocations.map((a) => (
                      <div key={a.id} className="text-xs">
                        {a.lot_number}: {a.qty} (remaining: {a.lot_remaining}
                        {a.expiry_date && `, exp: ${new Date(a.expiry_date).toLocaleDateString()}`})
                      </div>
                    ))}
                  </div>
                )}

                {/* FIFO allocation editor */}
                {allocatingLine === line.id && (
                  <LotAllocationEditor
                    operationId={operation.id}
                    line={line}
                    onClose={() => setAllocatingLine(null)}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {showAddLine && isDraft && canCreate && (
          <div className="border-t p-4 space-y-3 bg-gray-50">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Select
                  value={newLine.product_id}
                  onChange={(e) => setNewLine({ ...newLine, product_id: e.target.value })}
                  options={productOptions}
                />
              </div>
              <div className="w-32">
                <Input
                  type="number"
                  value={newLine.demand_qty}
                  onChange={(e) => setNewLine({ ...newLine, demand_qty: e.target.value })}
                  placeholder="Qty"
                  min="0.01"
                  step="0.01"
                />
              </div>
              <Button size="sm" variant="primary" onClick={handleAddLine}>
                Add
              </Button>
              <Button size="sm" onClick={() => setShowAddLine(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* State help */}
      {isDraft && lines.length > 0 && (
        <div className="text-xs text-gray-400">
          Draft: Add lines, then Confirm to move to Waiting.
        </div>
      )}
      {isWaiting && (
        <div className="text-xs text-gray-400">
          Waiting: Optionally allocate specific lots, then Check Availability to move to Ready.
        </div>
      )}
      {isReady && (
        <div className="text-xs text-gray-400">
          Ready: Review lot allocations, then Validate to dispatch and create stock moves.
        </div>
      )}
    </div>
  );
};

// Sub-component for FIFO lot allocation
const LotAllocationEditor: React.FC<{
  operationId: number;
  line: DeliveryLine;
  onClose: () => void;
}> = ({ operationId, line, onClose }) => {
  const { toast } = useToast();
  const { data: suggestions, isLoading } = useLotSuggestions(operationId, line.id);
  const setAllocations = useSetDeliveryAllocations();

  const [allocs, setAllocs] = useState<Array<{ lot_id: number; qty: number; lot_number: string; source_warehouse?: string }>>(
    line.allocations?.map((a) => ({
      lot_id: a.lot_id,
      qty: a.qty,
      lot_number: a.lot_number,
    })) ?? []
  );

  const applySuggestions = (includeCrossWarehouse: boolean) => {
    if (!suggestions) return;
    const local = suggestions.suggestions.map((s) => ({
      lot_id: s.lot_id,
      qty: s.qty,
      lot_number: s.lot_number,
    }));
    if (includeCrossWarehouse && suggestions.cross_warehouse_suggestions?.length) {
      const cross = suggestions.cross_warehouse_suggestions.map((s) => ({
        lot_id: s.lot_id,
        qty: s.qty,
        lot_number: s.lot_number,
        source_warehouse: s.source_warehouse_name,
      }));
      setAllocs([...local, ...cross]);
    } else {
      setAllocs(local);
    }
  };

  const updateAllocQty = (idx: number, qty: number) => {
    const updated = [...allocs];
    updated[idx] = { ...updated[idx], qty };
    setAllocs(updated);
  };

  const addCrossWarehouseLot = (s: LotSuggestion) => {
    // Don't add if already in allocs
    if (allocs.some((a) => a.lot_id === s.lot_id)) return;
    setAllocs([...allocs, {
      lot_id: s.lot_id,
      qty: s.qty,
      lot_number: s.lot_number,
      source_warehouse: s.source_warehouse_name,
    }]);
  };

  const removeAlloc = (idx: number) => {
    setAllocs(allocs.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    try {
      await setAllocations.mutateAsync({
        operationId,
        lineId: line.id,
        allocations: allocs.map((a) => ({ lot_id: a.lot_id, qty: a.qty })),
      });
      toast('Lot allocations saved');
      onClose();
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to save allocations', 'error');
    }
  };

  const hasCrossWarehouse = (suggestions?.cross_warehouse_suggestions?.length ?? 0) > 0;

  return (
    <div className="px-4 pb-4 bg-gray-50 border-t">
      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-bold uppercase text-gray-500">
          Lot Allocation — {line.product_name} ({line.demand_qty} {line.unit})
        </span>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => applySuggestions(false)} disabled={isLoading}>
            Auto-FIFO (Local)
          </Button>
          {hasCrossWarehouse && (
            <Button size="sm" onClick={() => applySuggestions(true)} disabled={isLoading}>
              Auto-FIFO (All)
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs text-gray-400">Loading suggestions...</div>
      ) : (
        <>
          {/* Local warehouse suggestions */}
          {suggestions && suggestions.suggestions.length > 0 ? (
            <div className="text-xs text-gray-400 mb-2">
              <span className="font-bold text-gray-500">Local lots (FIFO):</span>
              {suggestions.suggestions.map((s) => (
                <span key={s.lot_id} className="ml-2">
                  {s.lot_number} ({s.remaining_qty} avail
                  {s.expiry_date && `, exp: ${new Date(s.expiry_date).toLocaleDateString()}`})
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs text-danger mb-1">No local lots available.</div>
          )}

          {/* Cross-warehouse suggestions */}
          {hasCrossWarehouse && (
            <div className="text-xs mb-2 border-l-2 border-gray-300 pl-2">
              <span className="font-bold text-gray-500">Other warehouses:</span>
              {suggestions!.cross_warehouse_suggestions!.map((s) => (
                <div key={s.lot_id} className="flex items-center gap-2 mt-1">
                  <span>
                    {s.lot_number} ({s.remaining_qty} avail, from{' '}
                    <span className="font-bold">{s.source_warehouse_name}</span>
                    {s.expiry_date && `, exp: ${new Date(s.expiry_date).toLocaleDateString()}`})
                  </span>
                  <Badge status="waiting">transfer required</Badge>
                  {!allocs.some((a) => a.lot_id === s.lot_id) && (
                    <button
                      onClick={() => addCrossWarehouseLot(s)}
                      className="text-xs underline"
                    >
                      + Add
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {suggestions && suggestions.shortfall > 0 && (
            <div className="text-xs text-danger mb-2">
              Shortfall: {suggestions.shortfall} {line.unit} — not enough stock across all warehouses
            </div>
          )}
        </>
      )}

      {allocs.length > 0 && (
        <table className="w-full text-sm mb-2">
          <thead>
            <tr className="text-xs text-left text-gray-400">
              <th className="pb-1">Lot</th>
              <th className="pb-1">Source</th>
              <th className="pb-1 text-right">Qty</th>
              <th className="pb-1"></th>
            </tr>
          </thead>
          <tbody>
            {allocs.map((a, idx) => (
              <tr key={idx}>
                <td className="py-1 font-mono text-xs">{a.lot_number}</td>
                <td className="py-1 text-xs">
                  {a.source_warehouse ? (
                    <span className="text-amber-600">{a.source_warehouse} (transfer)</span>
                  ) : (
                    <span className="text-gray-400">local</span>
                  )}
                </td>
                <td className="py-1 text-right">
                  <input
                    type="number"
                    value={a.qty}
                    onChange={(e) => updateAllocQty(idx, Number(e.target.value))}
                    className="w-20 px-1 py-0.5 border border-black text-xs text-right"
                    min="0.01"
                    step="0.01"
                  />
                </td>
                <td className="py-1 text-right">
                  <button
                    onClick={() => removeAlloc(idx)}
                    className="text-xs text-danger hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {allocs.some((a) => a.source_warehouse) && (
        <div className="text-xs text-amber-600 mb-2">
          Cross-warehouse lots will trigger auto-transfers on validation.
        </div>
      )}

      <div className="flex justify-end gap-2 mt-2">
        <Button size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" onClick={handleSave} disabled={setAllocations.isPending}>
          Save Allocations
        </Button>
      </div>
    </div>
  );
};
