import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWarehouses, useProducts } from '../hooks/queries';
import { useCreateOperation, useAddDeliveryLine } from '../hooks/mutations';
import { useToast } from '../hooks/useToast';
import { Button, Input, Select, Textarea } from '../components/common';

interface DeliveryLineForm {
  product_id: string;
  demand_qty: string;
}

export const DeliveryNew: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: warehouses } = useWarehouses();
  const { data: products } = useProducts();
  const createOp = useCreateOperation();
  const addLine = useAddDeliveryLine();

  const [form, setForm] = useState({
    customer: '',
    warehouse_id: '',
    scheduled_date: '',
    notes: '',
  });
  const [lines, setLines] = useState<DeliveryLineForm[]>([{ product_id: '', demand_qty: '' }]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const warehouseOptions = [
    { value: '', label: 'Select warehouse...' },
    ...(warehouses ?? []).map((w) => ({ value: String(w.id), label: `${w.name} (${w.code})` })),
  ];

  const productOptions = [
    { value: '', label: 'Select product...' },
    ...(products ?? []).map((p) => ({
      value: String(p.id),
      label: `${p.name} (${p.sku}) — avail: ${p.available} ${p.unit}`,
    })),
  ];

  const addLineRow = () => setLines([...lines, { product_id: '', demand_qty: '' }]);

  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof DeliveryLineForm, value: string) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    setLines(updated);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
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
        type: 'delivery',
        warehouse_id: Number(form.warehouse_id),
        customer: form.customer.trim() || undefined,
        scheduled_date: form.scheduled_date || undefined,
        notes: form.notes.trim() || undefined,
      });

      for (const line of lines) {
        await addLine.mutateAsync({
          operationId: op.id,
          product_id: Number(line.product_id),
          demand_qty: Number(line.demand_qty),
        });
      }

      toast('Delivery created');
      navigate(`/deliveries/${op.id}`);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to create delivery', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Delivery</h1>
        <Button onClick={() => navigate('/deliveries')}>Back to List</Button>
      </div>

      <div className="border border-black p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Customer"
            value={form.customer}
            onChange={(e) => setForm({ ...form, customer: e.target.value })}
            placeholder="e.g. Cafe Nomad"
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
            label="Delivery Date"
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
            <div key={idx} className="p-4">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Select
                    label="Product"
                    value={line.product_id}
                    onChange={(e) => updateLine(idx, 'product_id', e.target.value)}
                    options={productOptions}
                    error={errors[`line_${idx}_product`]}
                  />
                </div>
                <div className="w-32">
                  <Input
                    label="Quantity"
                    type="number"
                    value={line.demand_qty}
                    onChange={(e) => updateLine(idx, 'demand_qty', e.target.value)}
                    error={errors[`line_${idx}_qty`]}
                    min="0.01"
                    step="0.01"
                  />
                </div>
                {lines.length > 1 && (
                  <Button size="sm" variant="danger" onClick={() => removeLine(idx)}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={() => navigate('/deliveries')}>Cancel</Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={createOp.isPending || addLine.isPending}
        >
          Create Delivery (Draft)
        </Button>
      </div>
    </div>
  );
};
