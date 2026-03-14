import React, { useState } from 'react';
import { useSuppliers } from '../hooks/queries';
import { useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '../hooks/mutations';
import { useToast } from '../hooks/useToast';
import { Table, Button, Input, Select, Textarea, Modal } from '../components/common';
import type { Supplier, SupplierType } from '../types';

interface SupplierFormData {
  name: string;
  code: string;
  type: string;
  origin_country: string;
  region: string;
  contact_person: string;
  phone: string;
  email: string;
  notes: string;
}

const emptyForm: SupplierFormData = {
  name: '',
  code: '',
  type: '',
  origin_country: '',
  region: '',
  contact_person: '',
  phone: '',
  email: '',
  notes: '',
};

const typeOptions = [
  { value: '', label: 'Select type...' },
  { value: 'estate', label: 'Estate' },
  { value: 'trader', label: 'Trader' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'direct_farm', label: 'Direct Farm' },
];

export const SuppliersList: React.FC = () => {
  const { data: suppliers, isLoading } = useSuppliers();
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const deleteMutation = useDeleteSupplier();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierFormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof SupplierFormData, string>>>({});

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      name: s.name,
      code: s.code,
      type: s.type ?? '',
      origin_country: s.origin_country ?? '',
      region: s.region ?? '',
      contact_person: s.contact_person ?? '',
      phone: s.phone ?? '',
      email: s.email ?? '',
      notes: s.notes ?? '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof SupplierFormData, string>> = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (!form.code.trim()) errs.code = 'Required';
    else if (!/^[A-Z]{2,4}$/.test(form.code)) errs.code = '2-4 uppercase letters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const body = {
      name: form.name.trim(),
      code: form.code.trim(),
      type: form.type || undefined,
      origin_country: form.origin_country.trim() || undefined,
      region: form.region.trim() || undefined,
      contact_person: form.contact_person.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...body });
        toast('Supplier updated');
      } else {
        await createMutation.mutateAsync(body);
        toast('Supplier created');
      }
      setModalOpen(false);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to save supplier', 'error');
    }
  };

  const handleDelete = async (s: Supplier) => {
    if (!confirm(`Delete supplier "${s.name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(s.id);
      toast('Supplier deleted');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to delete supplier', 'error');
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    { key: 'type', label: 'Type' },
    { key: 'origin', label: 'Origin' },
    { key: 'contact', label: 'Contact' },
    { key: 'actions', label: '', align: 'right' as const },
  ];

  if (isLoading) {
    return <div className="text-sm text-gray-600">Loading...</div>;
  }

  const data = suppliers ?? [];

  const formatType = (type: SupplierType | null) => {
    if (!type) return '-';
    return type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <Button variant="primary" size="sm" onClick={openCreate}>
          + Add Supplier
        </Button>
      </div>

      {data.length === 0 ? (
        <div className="border border-black p-8 text-center">
          <p className="text-sm text-gray-600">No suppliers yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            Add your green bean suppliers before creating receipts.
          </p>
        </div>
      ) : (
        <div className="border border-black">
          <Table
            columns={columns}
            data={data}
            renderRow={(supplier: Supplier) => (
              <>
                <td className="p-2 text-sm font-bold">{supplier.name}</td>
                <td className="p-2 text-xs font-mono">{supplier.code}</td>
                <td className="p-2 text-sm">{formatType(supplier.type)}</td>
                <td className="p-2 text-sm">
                  {supplier.origin_country ?? '-'}
                  {supplier.region && (
                    <span className="text-gray-400 text-xs ml-1">/ {supplier.region}</span>
                  )}
                </td>
                <td className="p-2 text-sm">{supplier.contact_person ?? '-'}</td>
                <td className="p-2 text-right space-x-2">
                  <Button size="sm" onClick={() => openEdit(supplier)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(supplier)}>
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
        title={editing ? 'Edit Supplier' : 'New Supplier'}
        width="max-w-xl"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
              placeholder="e.g. Finca La Aurora"
            />
            <Input
              label="Code (2-4 uppercase)"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              error={errors.code}
              placeholder="e.g. FLA"
              maxLength={4}
            />
          </div>
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={typeOptions}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Origin Country"
              value={form.origin_country}
              onChange={(e) => setForm({ ...form, origin_country: e.target.value })}
              placeholder="e.g. Ethiopia"
            />
            <Input
              label="Region"
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              placeholder="e.g. Yirgacheffe"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Contact Person"
              value={form.contact_person}
              onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              type="email"
            />
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
