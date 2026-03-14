import React from 'react';
import { MOCK_WAREHOUSES } from '../constants';
import { Button, Table } from '../components/common';

export const WarehousesList: React.FC = () => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'code', label: 'Code' },
    { key: 'address', label: 'Address' },
    { key: 'actions', label: '', align: 'right' as const },
  ];
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Warehouses</h1>
        <Button variant="primary">New Warehouse</Button>
      </div>
      
      <div className="border border-black">
        <Table
          columns={columns}
          data={MOCK_WAREHOUSES}
          renderRow={(warehouse) => (
            <>
              <td className="p-2 text-sm font-bold">{warehouse.name}</td>
              <td className="p-2 text-sm">{warehouse.code}</td>
              <td className="p-2 text-sm">{warehouse.address}</td>
              <td className="p-2 text-right">
                <Button size="sm">Edit</Button>
              </td>
            </>
          )}
        />
      </div>
    </div>
  );
};
