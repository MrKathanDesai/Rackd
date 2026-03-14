import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWarehouses, useLotSearch } from '../hooks/queries';
import { useCreateOperation, useAddTransferLine } from '../hooks/mutations';
import { useToast } from '../hooks/useToast';
import { Button, Input, Select, Textarea } from '../components/common';

interface TransferLineForm {
  lot_id: string;
  qty: string;
  notes: string;
}

const emptyLine: TransferLineForm = { lot_id: '', qty: '', notes: '' };

export const TransferNew: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: warehouses } = useWarehouses();
  const { data: lots } = useLotSearch({ status: 'active' });
  const createOp = useCreateOperation();
  const addLine = useAddTransferLine();

  const [form, setForm] = useState({
    warehouse_id: '',
    destination_warehouse_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [lines, setLines] = useState<TransferLineForm[]>([{ ...emptyLine }]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const warehouseOptions = [
    { value: '', label: 'Select warehouse...' },
    ...(warehouses ?? []).map((w) => ({ value: String(w.id), label: `${w.name} (${w.code})` })),
  ];

  // Filter destination warehouses to exclude the selected source
  const destWarehouseOptions = [
    { value: '', label: 'Select destination...' },
    ...(warehouses ?? [])
      .filter((w) => String(w.id) !== form.warehouse_id)
      .map((w) => ({ value: String(w.id), label: `${w.name} (${w.code})` })),
  ];

  // Filter lots to show only active lots (all types)
  const lotOptions = [
    { value: '', label: 'Select lot...' },
    ...(lots ?? []).map((l) => ({
      value: String(l.id),
      label: `${l.lot_number} — ${l.product_name} (${l.remaining_qty} ${l.unit})`,
    })),
  ];

  const addLineRow = () => setLines([...lines, { ...emptyLine }]);
  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };
  const updateLine = (idx: number, field: keyof TransferLineForm, value: string) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    setLines(updated);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.warehouse_id) errs.warehouse_id = 'Required';
    if (!form.destination_warehouse_id) errs.destination_warehouse_id = 'Required';
    if (form.warehouse_id && form.warehouse_id === form.destination_warehouse_id) {
      errs.destination_warehouse_id = 'Must differ from source';
    }
    lines.forEach((line, i) => {
      if (!line.lot_id) errs[`line_${i}_lot`] = 'Required';
      if (!line.qty || Number(line.qty) <= 0) errs[`line_${i}_qty`] = 'Must be > 0';
      // Check qty doesn't exceed lot remaining
      const selectedLot = (lots ?? []).find((l) => String(l.id) === line.lot_id);
      if (selectedLot && Number(line.qty) > selectedLot.remaining_qty) {
        errs[`line_${i}_qty`] = `Max ${selectedLot.remaining_qty}`;
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const op = await createOp.mutateAsync({
        type: 'transfer',
        warehouse_id: Number(form.warehouse_id),
        destination_warehouse_id: Number(form.destination_warehouse_id),
        scheduled_date: form.scheduled_date || undefined,
        notes: form.notes.trim() || undefined,
      });

      for (const line of lines) {
        await addLine.mutateAsync({
          operationId: op.id,
          lot_id: Number(line.lot_id),
          qty: Number(line.qty),
          notes: line.notes.trim() || undefined,
        });
      }

      toast('Transfer created');
      navigate(`/transfers/${op.id}`);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to create transfer', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Transfer</h1>
        <Button onClick={() => navigate('/transfers')}>Back to List</Button>
      </div>

      <div className="border border-black p-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Select
            label="Source Warehouse"
            value={form.warehouse_id}
            onChange={(e) => {
              setForm({ ...form, warehouse_id: e.target.value });
              // Clear destination if it matches new source
              if (e.target.value === form.destination_warehouse_id) {
                setForm((prev) => ({ ...prev, warehouse_id: e.target.value, destination_warehouse_id: '' }));
              }
            }}
            options={warehouseOptions}
            error={errors.warehouse_id}
          />
          <Select
            label="Destination Warehouse"
            value={form.destination_warehouse_id}
            onChange={(e) => setForm({ ...form, destination_warehouse_id: e.target.value })}
            options={destWarehouseOptions}
            error={errors.destination_warehouse_id}
          />
          <Input
            label="Scheduled Date"
            type="date"
            value={form.scheduled_date}
            onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
          />
        </div>
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Optional transfer notes"
        />
      </div>

      <div className="border border-black">
        <div className="flex items-center justify-between px-4 py-2 border-b border-black bg-gray-50">
          <span className="text-sm font-bold uppercase">Transfer Lines</span>
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
                      Available
                    </label>
                    <div className="px-2 py-2 border border-gray-200 bg-gray-50 text-sm">
                      {selectedLot
                        ? `${selectedLot.remaining_qty} ${selectedLot.unit}`
                        : '-'}
                    </div>
                  </div>
                  <Input
                    label="Transfer Qty"
                    type="number"
                    value={line.qty}
                    onChange={(e) => updateLine(idx, 'qty', e.target.value)}
                    error={errors[`line_${idx}_qty`]}
                    min="0.01"
                    step="0.01"
                  />
                </div>
                <Input
                  label="Line Notes"
                  value={line.notes}
                  onChange={(e) => updateLine(idx, 'notes', e.target.value)}
                  placeholder="Optional notes for this line"
                />
              </div>
            );
          })}
        </div>
        {(lots ?? []).length === 0 && (
          <div className="p-4 text-sm text-gray-400 text-center border-t">
            No active lots to transfer. Receive inventory first.
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={() => navigate('/transfers')}>Cancel</Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={createOp.isPending || addLine.isPending}
        >
          Create Transfer (Draft)
        </Button>
      </div>
    </div>
  );
};
