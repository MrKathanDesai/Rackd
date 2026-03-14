import React, { useState } from 'react';
import { useProducts, useSuppliers } from '../hooks/queries';
import { useCreateProduct, useUpdateProduct, useDeleteProduct } from '../hooks/mutations';
import { useToast } from '../hooks/useToast';
import { usePermission } from '../hooks/useAuth';
import { Table, Button, Input, Select, Textarea, Modal } from '../components/common';
import type { Product } from '../types';

interface ProductFormData {
  name: string;
  sku: string;
  category: string;
  process: string;
  origin: string;
  unit: string;
  reorder_pt: string;
  shelf_life_days: string;
  supplier_id: string;
  notes: string;
}

const emptyForm: ProductFormData = {
  name: '',
  sku: '',
  category: '',
  process: '',
  origin: '',
  unit: 'kg',
  reorder_pt: '0',
  shelf_life_days: '30',
  supplier_id: '',
  notes: '',
};

const unitOptions = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'bags', label: 'bags' },
  { value: 'units', label: 'units' },
];

export const ProductsList: React.FC = () => {
  const { data: products, isLoading } = useProducts();
  const { data: suppliers } = useSuppliers();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const { toast } = useToast();
  const canCreateProduct = usePermission('products.create');
  const canEditProduct = usePermission('products.edit');
  const canDeleteProduct = usePermission('products.delete');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      category: p.category ?? '',
      process: p.process ?? '',
      origin: p.origin ?? '',
      unit: p.unit,
      reorder_pt: String(p.reorder_pt),
      shelf_life_days: String(p.shelf_life_days ?? 30),
      supplier_id: p.supplier_id ? String(p.supplier_id) : '',
      notes: p.notes ?? '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof ProductFormData, string>> = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (!form.sku.trim()) errs.sku = 'Required';
    if (!form.unit) errs.unit = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const body = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      unit: form.unit,
      category: form.category.trim() || undefined,
      process: form.process.trim() || undefined,
      origin: form.origin.trim() || undefined,
      reorder_pt: Number(form.reorder_pt) || 0,
      shelf_life_days: Number(form.shelf_life_days) || 30,
      supplier_id: form.supplier_id ? Number(form.supplier_id) : undefined,
      notes: form.notes.trim() || undefined,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...body });
        toast('Product updated');
      } else {
        await createMutation.mutateAsync(body);
        toast('Product created');
      }
      setModalOpen(false);
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to save product', 'error');
    }
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Delete product "${p.name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(p.id);
      toast('Product deleted');
    } catch (err: any) {
      toast(err.response?.data?.error || 'Failed to delete product', 'error');
    }
  };

  const columns = [
    { key: 'name', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'origin', label: 'Origin' },
    { key: 'unit', label: 'UoM' },
    { key: 'onHand', label: 'On Hand', align: 'right' as const },
    { key: 'available', label: 'Available', align: 'right' as const },
    { key: 'actions', label: '', align: 'right' as const },
  ];

  if (isLoading) {
    return <div className="text-sm text-gray-600">Loading...</div>;
  }

  const data = products ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        {canCreateProduct && (
          <Button variant="primary" size="sm" onClick={openCreate}>
            + Add Product
          </Button>
        )}
      </div>

      {data.length === 0 ? (
        <div className="border border-black p-8 text-center">
          <p className="text-sm text-gray-600">No products yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            Add coffee products to get started.
          </p>
        </div>
      ) : (
        <div className="border border-black">
          <Table
            columns={columns}
            data={data}
            renderRow={(product: Product) => (
              <>
                <td className="p-2 text-sm font-bold">{product.name}</td>
                <td className="p-2 text-xs font-mono text-gray-600">{product.sku}</td>
                <td className="p-2 text-sm">{product.supplier_name ?? '-'}</td>
                <td className="p-2 text-sm">{product.origin ?? '-'}</td>
                <td className="p-2 text-sm">{product.unit}</td>
                <td className="p-2 text-sm text-right">{product.onHand}</td>
                <td
                  className={`p-2 text-sm text-right font-bold ${
                    product.isLowStock ? 'text-danger' : ''
                  }`}
                >
                  {product.available}
                  {product.isLowStock && ' LOW'}
                </td>
                <td className="p-2 text-right space-x-2">
                  {canEditProduct && (
                    <Button size="sm" onClick={() => openEdit(product)}>
                      Edit
                    </Button>
                  )}
                  {canDeleteProduct && (
                    <Button size="sm" variant="danger" onClick={() => handleDelete(product)}>
                      Delete
                    </Button>
                  )}
                </td>
              </>
            )}
          />
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Product' : 'New Product'}
        width="max-w-xl"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
              placeholder="e.g. Ethiopia Yirgacheffe"
            />
            <Input
              label="SKU"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              error={errors.sku}
              placeholder="e.g. ETH-YRG-001"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Unit"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              options={unitOptions}
              error={errors.unit}
            />
            <Input
              label="Shelf Life (days)"
              type="number"
              value={form.shelf_life_days}
              onChange={(e) => setForm({ ...form, shelf_life_days: e.target.value })}
              min="1"
            />
          </div>
          <Select
            label="Supplier"
            value={form.supplier_id}
            onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
            options={[
              { value: '', label: 'None' },
              ...(suppliers ?? []).map((s) => ({ value: String(s.id), label: `${s.name} (${s.code})` })),
            ]}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. Single Origin"
            />
            <Input
              label="Process"
              value={form.process}
              onChange={(e) => setForm({ ...form, process: e.target.value })}
              placeholder="e.g. Washed"
            />
            <Input
              label="Origin"
              value={form.origin}
              onChange={(e) => setForm({ ...form, origin: e.target.value })}
              placeholder="e.g. Ethiopia"
            />
          </div>
          <Input
            label="Reorder Point"
            type="number"
            value={form.reorder_pt}
            onChange={(e) => setForm({ ...form, reorder_pt: e.target.value })}
            min="0"
            step="0.1"
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
