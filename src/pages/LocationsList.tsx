import React from 'react';
import { MOCK_LOCATIONS } from '../constants';
import { Button, Table } from '../components/common';

export const LocationsList: React.FC = () => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'actions', label: '', align: 'right' as const },
  ];
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Locations</h1>
        <Button variant="primary">New Location</Button>
      </div>
      
      <div className="border border-black">
        <Table
          columns={columns}
          data={MOCK_LOCATIONS}
          renderRow={(location) => (
            <>
              <td className="p-2 text-sm font-bold">{location.name}</td>
              <td className="p-2 text-sm capitalize">{location.type}</td>
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
