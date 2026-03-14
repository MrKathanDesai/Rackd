import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Operation, OperationType } from '../types';
import { Button, Badge, Table } from '../components/common';

interface OperationsListProps {
  operations: Operation[];
  type: OperationType;
  typeLabel: string;
}

export const OperationsList: React.FC<OperationsListProps> = ({ operations, type, typeLabel }) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const filteredOps = operations.filter(op => {
    if (op.type !== type) return false;
    if (statusFilter === 'all') return true;
    return op.status === statusFilter;
  });
  
  const columns = [
    { key: 'reference', label: 'Reference' },
    { key: 'partner', label: 'Partner' },
    { key: 'scheduled', label: 'Scheduled Date' },
    { key: 'route', label: 'Source → Destination' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: '', align: 'right' as const },
  ];
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{typeLabel}</h1>
        <Link to={`/${type}s/new`}>
          <Button variant="primary">New {typeLabel.slice(0, -1)}</Button>
        </Link>
      </div>
      
      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant={statusFilter === 'all' ? 'primary' : 'secondary'}
          onClick={() => setStatusFilter('all')}
        >
          All
        </Button>
        <Button 
          size="sm" 
          variant={statusFilter === 'draft' ? 'primary' : 'secondary'}
          onClick={() => setStatusFilter('draft')}
        >
          Draft
        </Button>
        <Button 
          size="sm" 
          variant={statusFilter === 'waiting' ? 'primary' : 'secondary'}
          onClick={() => setStatusFilter('waiting')}
        >
          Waiting
        </Button>
        <Button 
          size="sm" 
          variant={statusFilter === 'ready' ? 'primary' : 'secondary'}
          onClick={() => setStatusFilter('ready')}
        >
          Ready
        </Button>
        <Button 
          size="sm" 
          variant={statusFilter === 'done' ? 'primary' : 'secondary'}
          onClick={() => setStatusFilter('done')}
        >
          Done
        </Button>
      </div>
      
      <div className="border border-black">
        <Table
          columns={columns}
          data={filteredOps}
          renderRow={(op) => (
            <>
              <td className="p-2 text-sm">
                <Link to={`/${type}s/${op.id}`} className="hover:underline font-bold">
                  {op.reference}
                </Link>
              </td>
              <td className="p-2 text-sm">{op.partner || '-'}</td>
              <td className="p-2 text-sm">{op.scheduledDate}</td>
              <td className="p-2 text-sm text-xs">
                {op.sourceLocationName} → {op.destLocationName}
              </td>
              <td className="p-2">
                <Badge status={op.status} />
              </td>
              <td className="p-2 text-right">
                <Link to={`/${type}s/${op.id}`}>
                  <Button size="sm">View</Button>
                </Link>
              </td>
            </>
          )}
        />
      </div>
      
      {filteredOps.length === 0 && (
        <div className="text-center p-8 text-gray-600 text-sm">
          No {typeLabel.toLowerCase()} found
        </div>
      )}
    </div>
  );
};
