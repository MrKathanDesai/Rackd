import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWarehouses, useLotSearch } from '../hooks/queries';
import { useCreateOperation, useAddAdjustmentLine } from '../hooks/mutations';
import { useToast } from '../hooks/useToast';
import { Button, Input, Select, Textarea } from '../components/common';

interface AdjLineForm {
  lot_id: string;
  actual_qty: string;
  notes: string;
}

const emptyLine: AdjLineForm = { lot_id: '', actual_qty: '', notes: '' };

export const AdjustmentNew: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: warehouses } = useWarehouses();
  const { data: lots } = useLotSearch({ status: 'active' });
  const createOp = useCreateOperation();
  const addLine = useAddAdjustmentLine();

  const [form, setForm] = useState({
    warehouse_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    reason: '',
    notes: '',
  });
  const [lines, setLines] = useState<AdjLineForm[]>([{ ...emptyLine }]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const warehouseOptions = [
    { value: '', label: 'Select warehouse...' },
    ...(warehouses ?? []).map((w) => ({ value: String(w.id), label: `${w.name} (${w.code})` })),
  ];

  const lotOptions = [
    { value: '', label: 'Select lot...' },
    ...(lots ?? []).map((l) => ({
      value: String(l.id),
      label: `${l.lot_number} — ${l.product_name} (system: ${l.remaining_qty} ${l.unit})`,
    })),
  ];

  const addLineRow = () => setLines([...lines, { ...emptyLine }]);
  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };
  const updateLine = (idx: number, field: keyof AdjLineForm, value: string) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    setLines(updated);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.warehouse_id) errs.warehouse_id = 'Required';
    if (!form.reason.trim()) errs.reason = 'Required';
    lines.forEach((line, i) => {
      if (!line.lot_id) errs[`line_${i}_lot`] = 'Required';
      if (line.actual_qty === '' || Number(line.actual_qty) < 0)
        errs[`line_${i}_qty`] = 'Must be >= 0';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const op = await createOp.mutateAsync({
        type: 'adjustment',
        warehouse_id: Number(form.warehouse_id),
        scheduled_date: form.scheduled_date || undefined,
        reason: form.reason.trim(),
        notes: form.notes.trim() || undefined,
      });

      for (const line of lines) {
        await addLine.mutateAsync({
          operationId: op.id,
          lot_id: Number(line.lot_id),
          actual_qty: Number(line.actual_qty),
          notes: line.notes.trim() || undefined,
        });
      }

      toast('Adjustment created');
      navigate(`/adjustments/${op.id}`);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to create adjustment', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Adjustment</h1>
        <Button onClick={() => navigate('/adjustments')}>Back to List</Button>
      </div>

      <div className="border border-black p-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Select
            label="Warehouse"
            value={form.warehouse_id}
            onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
            options={warehouseOptions}
            error={errors.warehouse_id}
          />
          <Input
            label="Date"
            type="date"
            value={form.scheduled_date}
            onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
          />
          <Input
            label="Reason"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="e.g. Physical count, Damage, Sampling"
            error={errors.reason}
          />
        </div>
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Optional"
        />
      </div>

      <div className="border border-black">
        <div className="flex items-center justify-between px-4 py-2 border-b border-black bg-gray-50">
          <span className="text-sm font-bold uppercase">Lines</span>
          <Button size="sm" onClick={addLineRow}>
            + Add Line
          </Button>
        </div>
        <div className="divide-y">
          {lines.map((line, idx) => {
            const selectedLot = (lots ?? []).find((l) => String(l.id) === line.lot_id);
            return (
              <div key={idx} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-bold">Line {idx + 1}</span>
                  {lines.length > 1 && (
                    <button
                      onClick={() => removeLine(idx)}
                      className="text-xs text-danger hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Select
                    label="Lot"
                    value={line.lot_id}
                    onChange={(e) => updateLine(idx, 'lot_id', e.target.value)}
                    options={lotOptions}
                    error={errors[`line_${idx}_lot`]}
                  />
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                      System Qty
                    </label>
                    <div className="px-2 py-2 border border-gray-200 bg-gray-50 text-sm">
                      {selectedLot ? `${selectedLot.remaining_qty} ${selectedLot.unit}` : '-'}
                    </div>
                  </div>
                  <Input
                    label="Actual Qty"
                    type="number"
                    value={line.actual_qty}
                    onChange={(e) => updateLine(idx, 'actual_qty', e.target.value)}
                    error={errors[`line_${idx}_qty`]}
                    min="0"
                    step="0.01"
                  />
                </div>
                {selectedLot && line.actual_qty !== '' && (
                  <div className="text-xs">
                    {Number(line.actual_qty) > selectedLot.remaining_qty ? (
                      <span className="text-green-700">
                        Gain: +{(Number(line.actual_qty) - selectedLot.remaining_qty).toFixed(2)} {selectedLot.unit}
                      </span>
                    ) : Number(line.actual_qty) < selectedLot.remaining_qty ? (
                      <span className="text-danger">
                        Loss: -{(selectedLot.remaining_qty - Number(line.actual_qty)).toFixed(2)} {selectedLot.unit}
                      </span>
                    ) : (
                      <span className="text-gray-400">No change</span>
                    )}
                  </div>
                )}
                <Input
                  label="Line Notes"
                  value={line.notes}
                  onChange={(e) => updateLine(idx, 'notes', e.target.value)}
                  placeholder="Optional notes for this adjustment"
                />
              </div>
            );
          })}
        </div>
        {(lots ?? []).length === 0 && (
          <div className="p-4 text-sm text-gray-400 text-center border-t">
            No active lots to adjust. Receive inventory first.
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={() => navigate('/adjustments')}>Cancel</Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={createOp.isPending || addLine.isPending}
        >
          Create Adjustment (Draft)
        </Button>
      </div>
    </div>
  );
};
