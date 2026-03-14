import React, { useState } from 'react';
import { useWarehouses } from '../hooks/queries';
import { useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse } from '../hooks/mutations';
import { useToast } from '../hooks/useToast';
import { Table, Button, Input, Textarea, Modal } from '../components/common';
import type { Warehouse } from '../types';

interface WarehouseFormData {
  name: string;
  code: string;
  address: string;
  notes: string;
}

const emptyForm: WarehouseFormData = { name: '', code: '', address: '', notes: '' };

export const WarehousesList: React.FC = () => {
  const { data: warehouses, isLoading } = useWarehouses();
  const createMutation = useCreateWarehouse();
  const updateMutation = useUpdateWarehouse();
  const deleteMutation = useDeleteWarehouse();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [form, setForm] = useState<WarehouseFormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<WarehouseFormData>>({});

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (w: Warehouse) => {
    setEditing(w);
    setForm({ name: w.name, code: w.code, address: w.address ?? '', notes: w.notes ?? '' });
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errs: Partial<WarehouseFormData> = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (!form.code.trim()) errs.code = 'Required';
    else if (!/^[A-Z0-9]{2,4}$/.test(form.code)) errs.code = '2-4 uppercase letters/digits';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const body = {
      name: form.name.trim(),
      code: form.code.trim(),
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...body });
        toast('Warehouse updated');
      } else {
        await createMutation.mutateAsync(body);
        toast('Warehouse created');
      }
      setModalOpen(false);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to save warehouse', 'error');
    }
  };

  const handleDelete = async (w: Warehouse) => {
    if (!confirm(`Delete warehouse "${w.name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(w.id);
      toast('Warehouse deleted');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to delete warehouse', 'error');
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    { key: 'address', label: 'Address' },
    { key: 'notes', label: 'Notes' },
    { key: 'locations', label: 'Locations', align: 'right' as const },
    { key: 'actions', label: '', align: 'right' as const },
  ];

  if (isLoading) {
    return <div className="text-sm text-gray-600">Loading...</div>;
  }

  const data = warehouses ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Warehouses</h1>
        <Button variant="primary" size="sm" onClick={openCreate}>
          + Add Warehouse
        </Button>
      </div>

      {data.length === 0 ? (
        <div className="border border-black p-8 text-center">
          <p className="text-sm text-gray-600">No warehouses yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            Create your first warehouse to start managing inventory.
          </p>
        </div>
      ) : (
        <div className="border border-black">
          <Table
            columns={columns}
            data={data}
            renderRow={(warehouse: Warehouse) => (
              <>
                <td className="p-2 text-sm font-bold">{warehouse.name}</td>
                <td className="p-2 text-xs font-mono">{warehouse.code}</td>
                <td className="p-2 text-sm">{warehouse.address ?? '-'}</td>
                <td className="p-2 text-sm text-gray-600 truncate max-w-[200px]">
                  {warehouse.notes ?? '-'}
                </td>
                <td className="p-2 text-sm text-right">{warehouse.location_count ?? 0}</td>
                <td className="p-2 text-right space-x-2">
                  <Button size="sm" onClick={() => openEdit(warehouse)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(warehouse)}>
                    Delete
                  </Button>
                </td>
              </>
            )}
          />
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Warehouse' : 'New Warehouse'}
      >
        <div className="space-y-3">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
            placeholder="e.g. Main Roastery"
          />
          <Input
            label="Code (2-4 uppercase)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            error={errors.code}
            placeholder="e.g. MR"
            maxLength={4}
            disabled={!!editing}
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Optional"
          />
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Optional"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
