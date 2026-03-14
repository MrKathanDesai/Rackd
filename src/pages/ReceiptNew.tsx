import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWarehouses, useSuppliers, useProducts } from '../hooks/queries';
import { useCreateOperation, useAddReceiptLine } from '../hooks/mutations';
import { useToast } from '../hooks/useToast';
import { Button, Input, Select, Textarea } from '../components/common';

interface ReceiptLineForm {
  product_id: string;
  product_type: 'green' | 'roasted';
  demand_qty: string;
  harvest_year: string;
  process: string;
  roast_date: string;
  lot_notes: string;
}

const emptyLine: ReceiptLineForm = {
  product_id: '',
  product_type: 'green',
  demand_qty: '',
  harvest_year: '',
  process: '',
  roast_date: '',
  lot_notes: '',
};

export const ReceiptNew: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({
    supplier_id: '',
    warehouse_id: '',
    scheduled_date: '',
    notes: '',
  });
  const [lines, setLines] = useState<ReceiptLineForm[]>([{ ...emptyLine }]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: warehouses } = useWarehouses();
  const { data: suppliers } = useSuppliers();
  const { data: products } = useProducts(
    form.supplier_id ? { supplier_id: Number(form.supplier_id) } : undefined
  );
  const createOp = useCreateOperation();
  const addLine = useAddReceiptLine();

  const handleSupplierChange = (supplierId: string) => {
    setForm({ ...form, supplier_id: supplierId });
    // Clear product selections when supplier changes
    setLines(lines.map((l) => ({ ...l, product_id: '' })));
  };

  const warehouseOptions = [
    { value: '', label: 'Select warehouse...' },
    ...(warehouses ?? []).map((w) => ({ value: String(w.id), label: `${w.name} (${w.code})` })),
  ];

  const supplierOptions = [
    { value: '', label: 'Select supplier...' },
    ...(suppliers ?? []).map((s) => ({ value: String(s.id), label: `${s.name} (${s.code})` })),
  ];

  const productOptions = [
    { value: '', label: form.supplier_id ? 'Select product...' : 'Select a supplier first...' },
    ...(products ?? []).map((p) => ({
      value: String(p.id),
      label: `${p.name} (${p.sku})`,
    })),
  ];

  const addLineRow = () => setLines([...lines, { ...emptyLine }]);

  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof ReceiptLineForm, value: string) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    setLines(updated);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.supplier_id) errs.supplier_id = 'Required';
    if (!form.warehouse_id) errs.warehouse_id = 'Required';
    lines.forEach((line, i) => {
      if (!line.product_id) errs[`line_${i}_product`] = 'Required';
      if (!line.demand_qty || Number(line.demand_qty) <= 0) errs[`line_${i}_qty`] = 'Must be > 0';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const op = await createOp.mutateAsync({
        type: 'receipt',
        warehouse_id: Number(form.warehouse_id),
        supplier_id: Number(form.supplier_id),
        scheduled_date: form.scheduled_date || undefined,
        notes: form.notes.trim() || undefined,
      });

      for (const line of lines) {
        await addLine.mutateAsync({
          operationId: op.id,
          product_id: Number(line.product_id),
          demand_qty: Number(line.demand_qty),
          product_type: line.product_type,
          harvest_year: line.harvest_year ? Number(line.harvest_year) : undefined,
          process: line.process.trim() || undefined,
          roast_date: line.product_type === 'roasted' && line.roast_date ? line.roast_date : undefined,
          lot_notes: line.lot_notes.trim() || undefined,
        });
      }

      toast('Receipt created');
      navigate(`/receipts/${op.id}`);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to create receipt', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Receipt</h1>
        <Button onClick={() => navigate('/receipts')}>Back to List</Button>
      </div>

      <div className="border border-black p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Supplier"
            value={form.supplier_id}
            onChange={(e) => handleSupplierChange(e.target.value)}
            options={supplierOptions}
            error={errors.supplier_id}
          />
          <Select
            label="Warehouse"
            value={form.warehouse_id}
            onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
            options={warehouseOptions}
            error={errors.warehouse_id}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Expected Date"
            type="date"
            value={form.scheduled_date}
            onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
          />
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="border border-black">
        <div className="flex items-center justify-between px-4 py-2 border-b border-black bg-gray-50">
          <span className="text-sm font-bold uppercase">Lines</span>
          <Button size="sm" onClick={addLineRow}>
            + Add Line
          </Button>
        </div>
        <div className="divide-y">
          {lines.map((line, idx) => (
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
              <div className="grid grid-cols-4 gap-3">
                <Select
                  label="Product"
                  value={line.product_id}
                  onChange={(e) => updateLine(idx, 'product_id', e.target.value)}
                  options={productOptions}
                  error={errors[`line_${idx}_product`]}
                />
                <Input
                  label="Quantity"
                  type="number"
                  value={line.demand_qty}
                  onChange={(e) => updateLine(idx, 'demand_qty', e.target.value)}
                  error={errors[`line_${idx}_qty`]}
                  min="0.01"
                  step="0.01"
                />
                <Select
                  label="Coffee Type"
                  value={line.product_type}
                  onChange={(e) => {
                    updateLine(idx, 'product_type', e.target.value);
                    // Clear roast_date when switching to green
                    if (e.target.value === 'green') {
                      updateLine(idx, 'roast_date', '');
                    }
                  }}
                  options={[
                    { value: 'green', label: 'Green Coffee' },
                    { value: 'roasted', label: 'Roasted Coffee' },
                  ]}
                />
                <Input
                  label="Process"
                  value={line.process}
                  onChange={(e) => updateLine(idx, 'process', e.target.value)}
                  placeholder="e.g. Washed"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Harvest Year"
                  type="number"
                  value={line.harvest_year}
                  onChange={(e) => updateLine(idx, 'harvest_year', e.target.value)}
                  placeholder="e.g. 2024"
                />
                {line.product_type === 'roasted' && (
                  <Input
                    label="Roast Date"
                    type="date"
                    value={line.roast_date}
                    onChange={(e) => updateLine(idx, 'roast_date', e.target.value)}
                  />
                )}
                <Input
                  label="Lot Notes"
                  value={line.lot_notes}
                  onChange={(e) => updateLine(idx, 'lot_notes', e.target.value)}
                  placeholder="Optional notes for this lot"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-400">
        Select "Green Coffee" or "Roasted Coffee" for each line. This determines the lot type created on validation.
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={() => navigate('/receipts')}>Cancel</Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={createOp.isPending || addLine.isPending}
        >
          Create Receipt (Draft)
        </Button>
      </div>
    </div>
  );
};
