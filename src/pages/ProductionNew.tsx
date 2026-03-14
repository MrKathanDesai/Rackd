import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWarehouses, useLotSearch } from '../hooks/queries';
import { useCreateOperation, useAddProductionInput } from '../hooks/mutations';
import { useToast } from '../hooks/useToast';
import { Button, Input, Select, Textarea } from '../components/common';

interface InputLineForm {
  lot_id: string;
  qty: string;
  expected_yield: string;
}

const emptyInput: InputLineForm = { lot_id: '', qty: '', expected_yield: '' };

export const ProductionNew: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: warehouses } = useWarehouses();
  const { data: greenLots } = useLotSearch({ product_type: 'green', status: 'active' });
  const createOp = useCreateOperation();
  const addInput = useAddProductionInput();

  const [form, setForm] = useState({
    warehouse_id: '',
    roast_date: new Date().toISOString().split('T')[0],
    roast_profile: '',
    notes: '',
  });
  const [inputs, setInputs] = useState<InputLineForm[]>([{ ...emptyInput }]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const warehouseOptions = [
    { value: '', label: 'Select warehouse...' },
    ...(warehouses ?? []).map((w) => ({ value: String(w.id), label: `${w.name} (${w.code})` })),
  ];

  const lotOptions = [
    { value: '', label: 'Select green bean lot...' },
    ...(greenLots ?? []).map((l) => ({
      value: String(l.id),
      label: `${l.lot_number} — ${l.product_name} (${l.remaining_qty} ${l.unit} avail)`,
    })),
  ];

  const addInputRow = () => setInputs([...inputs, { ...emptyInput }]);
  const removeInput = (idx: number) => {
    if (inputs.length <= 1) return;
    setInputs(inputs.filter((_, i) => i !== idx));
  };
  const updateInput = (idx: number, field: keyof InputLineForm, value: string) => {
    const updated = [...inputs];
    updated[idx] = { ...updated[idx], [field]: value };
    setInputs(updated);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.warehouse_id) errs.warehouse_id = 'Required';
    if (!form.roast_date) errs.roast_date = 'Required';
    inputs.forEach((inp, i) => {
      if (!inp.lot_id) errs[`input_${i}_lot`] = 'Required';
      if (!inp.qty || Number(inp.qty) <= 0) errs[`input_${i}_qty`] = 'Must be > 0';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const op = await createOp.mutateAsync({
        type: 'production',
        warehouse_id: Number(form.warehouse_id),
        roast_date: form.roast_date,
        roast_profile: form.roast_profile.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });

      for (const inp of inputs) {
        await addInput.mutateAsync({
          operationId: op.id,
          lot_id: Number(inp.lot_id),
          qty: Number(inp.qty),
          expected_yield: inp.expected_yield ? Number(inp.expected_yield) : undefined,
        });
      }

      toast('Production order created');
      navigate(`/production/${op.id}`);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to create production order', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Production Order</h1>
        <Button onClick={() => navigate('/production')}>Back to List</Button>
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
            label="Roast Date"
            type="date"
            value={form.roast_date}
            onChange={(e) => setForm({ ...form, roast_date: e.target.value })}
            error={errors.roast_date}
          />
          <Input
            label="Roast Profile"
            value={form.roast_profile}
            onChange={(e) => setForm({ ...form, roast_profile: e.target.value })}
            placeholder="e.g. Medium, City+"
          />
        </div>
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Optional"
        />
      </div>

      {/* Inputs: Green bean lots to consume */}
      <div className="border border-black">
        <div className="flex items-center justify-between px-4 py-2 border-b border-black bg-gray-50">
          <span className="text-sm font-bold uppercase">Input Lines (Green Beans to Roast)</span>
          <Button size="sm" onClick={addInputRow}>
            + Add Input
          </Button>
        </div>
        <div className="divide-y">
          {inputs.map((inp, idx) => (
            <div key={idx} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-bold">Input {idx + 1}</span>
                {inputs.length > 1 && (
                  <button
                    onClick={() => removeInput(idx)}
                    className="text-xs text-danger hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Select
                  label="Green Bean Lot"
                  value={inp.lot_id}
                  onChange={(e) => updateInput(idx, 'lot_id', e.target.value)}
                  options={lotOptions}
                  error={errors[`input_${idx}_lot`]}
                />
                <Input
                  label="Quantity to Use"
                  type="number"
                  value={inp.qty}
                  onChange={(e) => updateInput(idx, 'qty', e.target.value)}
                  error={errors[`input_${idx}_qty`]}
                  min="0.01"
                  step="0.01"
                />
                <Input
                  label="Expected Yield"
                  type="number"
                  value={inp.expected_yield}
                  onChange={(e) => updateInput(idx, 'expected_yield', e.target.value)}
                  placeholder="Optional"
                  min="0.01"
                  step="0.01"
                />
              </div>
            </div>
          ))}
        </div>
        {(greenLots ?? []).length === 0 && (
          <div className="p-4 text-sm text-gray-400 text-center border-t">
            No active green bean lots available. Receive green beans first.
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400">
        Each input consumes green beans. On validation, a roasted lot is created for the same product with the actual yield recorded.
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={() => navigate('/production')}>Cancel</Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={createOp.isPending || addInput.isPending}
        >
          Create Production Order (Draft)
        </Button>
      </div>
    </div>
  );
};
