import React from 'react';
import { Link } from 'react-router-dom';
import { MOCK_PRODUCTS } from '../constants';
import { Button, Table } from '../components/common';

export const ProductsList: React.FC = () => {
  const columns = [
    { key: 'name', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { key: 'category', label: 'Category' },
    { key: 'uom', label: 'UoM' },
    { key: 'onHand', label: 'On Hand', align: 'right' as const },
    { key: 'reserved', label: 'Reserved', align: 'right' as const },
    { key: 'available', label: 'Available', align: 'right' as const },
  ];
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button variant="primary">New Product</Button>
      </div>
      
      <div className="border border-black">
        <Table
          columns={columns}
          data={MOCK_PRODUCTS}
          renderRow={(product) => {
            const isLowStock = product.available <= product.reorderPt;
            return (
              <>
                <td className="p-2 text-sm font-bold">{product.name}</td>
                <td className="p-2 text-xs text-gray-600">{product.sku}</td>
                <td className="p-2 text-sm">{product.category}</td>
                <td className="p-2 text-sm">{product.uom}</td>
                <td className="p-2 text-sm text-right">{product.onHand}</td>
                <td className="p-2 text-sm text-right">{product.reserved}</td>
                <td className={`p-2 text-sm text-right font-bold ${isLowStock ? 'text-danger' : ''}`}>
                  {product.available}
                  {isLowStock && ' ⚠'}
                </td>
              </>
            );
          }}
        />
      </div>
    </div>
  );
};
