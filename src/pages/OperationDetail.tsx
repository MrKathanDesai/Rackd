import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Operation, OperationType } from '../types';
import { Button, Badge } from '../components/common';

interface OperationDetailProps {
  operations: Operation[];
  type: OperationType;
  typeLabel: string;
}

export const OperationDetail: React.FC<OperationDetailProps> = ({ operations, type, typeLabel }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const operation = operations.find(op => op.id === id && op.type === type);
  
  if (!operation) {
    return (
      <div className="space-y-4">
        <div className="text-sm">
          <Link to={`/${type}s`} className="hover:underline">← Back to {typeLabel}</Link>
        </div>
        <div className="border border-black p-8 text-center">
          <p className="text-lg font-bold mb-2">{typeLabel.slice(0, -1)} Not Found</p>
          <p className="text-sm text-gray-600">The requested {typeLabel.toLowerCase().slice(0, -1)} does not exist.</p>
        </div>
      </div>
    );
  }
  
  const handleValidate = () => {
    alert(`Validated ${operation.reference}. Stock moves would be created here.`);
    navigate(`/${type}s`);
  };
  
  const handleCancel = () => {
    if (confirm(`Are you sure you want to cancel ${operation.reference}?`)) {
      alert('Operation cancelled');
      navigate(`/${type}s`);
    }
  };
  
  const canEdit = operation.status === 'draft';
  const canValidate = operation.status === 'waiting' || operation.status === 'ready';
  const canCancel = operation.status !== 'done' && operation.status !== 'cancelled';
  
  return (
    <div className="space-y-6">
      <div className="text-sm">
        <Link to={`/${type}s`} className="hover:underline">← Back to {typeLabel}</Link>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{operation.reference}</h1>
          <Badge status={operation.status} />
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Link to={`/${type}s/${id}/edit`}>
              <Button>Edit</Button>
            </Link>
          )}
          {canValidate && (
            <Button variant="primary" onClick={handleValidate}>
              Validate
            </Button>
          )}
          {canCancel && (
            <Button variant="danger" onClick={handleCancel}>
              Cancel
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="border border-black p-4">
            <h2 className="text-sm font-bold mb-4 uppercase">Details</h2>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-gray-600">Partner</div>
                <div className="text-sm">{operation.partner || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Scheduled Date</div>
                <div className="text-sm">{operation.scheduledDate}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Source Location</div>
                <div className="text-sm">{operation.sourceLocationName}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Destination Location</div>
                <div className="text-sm">{operation.destLocationName}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="border border-black p-4">
            <h2 className="text-sm font-bold mb-4 uppercase">Metadata</h2>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-gray-600">Created Date</div>
                <div className="text-sm">{new Date(operation.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Created By</div>
                <div className="text-sm">{operation.createdBy}</div>
              </div>
              {operation.notes && (
                <div>
                  <div className="text-xs text-gray-600">Notes</div>
                  <div className="text-sm">{operation.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="border border-black">
        <div className="p-4 border-b border-black bg-gray-100">
          <h2 className="text-sm font-bold uppercase">Line Items</h2>
        </div>
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 border-b border-black">
            <tr>
              <th className="text-left p-2 text-xs font-bold">Product</th>
              <th className="text-left p-2 text-xs font-bold">SKU</th>
              <th className="text-right p-2 text-xs font-bold">Quantity</th>
              <th className="text-left p-2 text-xs font-bold">UoM</th>
            </tr>
          </thead>
          <tbody>
            {operation.lines.map(line => (
              <tr key={line.id} className="border-b hover:bg-gray-50">
                <td className="p-2 text-sm">{line.productName}</td>
                <td className="p-2 text-xs text-gray-600">{line.productSku}</td>
                <td className="p-2 text-sm text-right font-bold">{line.quantity}</td>
                <td className="p-2 text-sm">{line.uom}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
