import React, { useState } from 'react';
import { useLocations, useWarehouses } from '../hooks/queries';
import { useCreateLocation, useUpdateLocation, useDeleteLocation } from '../hooks/mutations';
import { useToast } from '../hooks/useToast';
import { Table, Button, Input, Select, Textarea, Modal } from '../components/common';
import type { Location } from '../types';

interface LocationFormData {
  name: string;
  warehouse_id: string;
  is_default: boolean;
  notes: string;
}

const emptyForm: LocationFormData = { name: '', warehouse_id: '', is_default: false, notes: '' };

export const LocationsList: React.FC = () => {
  const { data: locations, isLoading } = useLocations();
  const { data: warehouses } = useWarehouses();
  const createMutation = useCreateLocation();
  const updateMutation = useUpdateLocation();
  const deleteMutation = useDeleteLocation();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState<LocationFormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof LocationFormData, string>>>({});

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (loc: Location) => {
    setEditing(loc);
    setForm({
      name: loc.name,
      warehouse_id: String(loc.warehouse_id),
      is_default: !!loc.is_default,
      notes: loc.notes ?? '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof LocationFormData, string>> = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (!editing && !form.warehouse_id) errs.warehouse_id = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          name: form.name.trim(),
          is_default: form.is_default,
          notes: form.notes.trim() || undefined,
        });
        toast('Location updated');
      } else {
        await createMutation.mutateAsync({
          name: form.name.trim(),
          warehouse_id: Number(form.warehouse_id),
          is_default: form.is_default,
          notes: form.notes.trim() || undefined,
        });
        toast('Location created');
      }
      setModalOpen(false);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to save location', 'error');
    }
  };

  const handleDelete = async (loc: Location) => {
    if (!confirm(`Delete location "${loc.name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(loc.id);
      toast('Location deleted');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to delete location', 'error');
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'default', label: 'Default' },
    { key: 'notes', label: 'Notes' },
    { key: 'actions', label: '', align: 'right' as const },
  ];

  if (isLoading) {
    return <div className="text-sm text-gray-600">Loading...</div>;
  }

  const data = locations ?? [];
  const warehouseOptions = [
    { value: '', label: 'Select warehouse...' },
    ...(warehouses ?? []).map((w) => ({ value: String(w.id), label: `${w.name} (${w.code})` })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Locations</h1>
        <Button variant="primary" size="sm" onClick={openCreate}>
          + Add Location
        </Button>
      </div>

      {data.length === 0 ? (
        <div className="border border-black p-8 text-center">
          <p className="text-sm text-gray-600">No locations yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            Locations are auto-created when you add a warehouse. Add more here.
          </p>
        </div>
      ) : (
        <div className="border border-black">
          <Table
            columns={columns}
            data={data}
            renderRow={(loc: Location) => (
              <>
                <td className="p-2 text-sm font-bold">{loc.name}</td>
                <td className="p-2 text-sm">
                  {loc.warehouse_name ?? '-'}
                  {loc.warehouse_code && (
                    <span className="text-xs text-gray-400 ml-1">({loc.warehouse_code})</span>
                  )}
                </td>
                <td className="p-2 text-sm">{loc.is_default ? 'Yes' : '-'}</td>
                <td className="p-2 text-sm text-gray-600 truncate max-w-[200px]">
                  {loc.notes ?? '-'}
                </td>
                <td className="p-2 text-right space-x-2">
                  <Button size="sm" onClick={() => openEdit(loc)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(loc)}>
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
        title={editing ? 'Edit Location' : 'New Location'}
      >
        <div className="space-y-3">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
            placeholder="e.g. Cold Storage"
          />
          {!editing && (
            <Select
              label="Warehouse"
              value={form.warehouse_id}
              onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
              options={warehouseOptions}
              error={errors.warehouse_id}
            />
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_default"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              className="border-black"
            />
            <label htmlFor="is_default" className="text-sm">
              Default location for this warehouse
            </label>
          </div>
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
