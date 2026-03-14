import React from 'react';
import { Link } from 'react-router-dom';
import { MOCK_OPERATIONS, MOCK_PRODUCTS } from '../constants';
import { Badge, Button } from '../components/common';

export const Dashboard: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  
  const pendingReceipts = MOCK_OPERATIONS.filter(op => op.type === 'receipt' && op.status !== 'done' && op.status !== 'cancelled');
  const pendingDeliveries = MOCK_OPERATIONS.filter(op => op.type === 'delivery' && op.status !== 'done' && op.status !== 'cancelled');
  const lowStockProducts = MOCK_PRODUCTS.filter(p => p.available <= p.reorderPt);
  
  const recentOperations = MOCK_OPERATIONS.slice(0, 5);
  
  return (
    <div className="max-w-7xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">{today}</p>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        <div className="border border-black p-4">
          <div className="text-xs text-gray-600 uppercase mb-2">Pending Receipts</div>
          <div className="text-3xl font-bold">{pendingReceipts.length}</div>
        </div>
        
        <div className="border border-black p-4">
          <div className="text-xs text-gray-600 uppercase mb-2">Pending Deliveries</div>
          <div className="text-3xl font-bold">{pendingDeliveries.length}</div>
        </div>
        
        <div className="border border-black p-4">
          <div className="text-xs text-gray-600 uppercase mb-2">Low Stock Items</div>
          <div className="text-3xl font-bold text-danger">{lowStockProducts.length}</div>
        </div>
        
        <div className="border border-black p-4">
          <div className="text-xs text-gray-600 uppercase mb-2">Total Products</div>
          <div className="text-3xl font-bold">{MOCK_PRODUCTS.length}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Recent Operations</h2>
            <Link to="/receipts">
              <Button size="sm">View All</Button>
            </Link>
          </div>
          <table className="w-full border-collapse border border-black">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 text-xs font-bold border-b border-black">Reference</th>
                <th className="text-left p-2 text-xs font-bold border-b border-black">Type</th>
                <th className="text-left p-2 text-xs font-bold border-b border-black">Status</th>
                <th className="text-left p-2 text-xs font-bold border-b border-black">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOperations.map(op => (
                <tr key={op.id} className="border-b hover:bg-gray-50">
                  <td className="p-2 text-sm">
                    <Link to={`/${op.type}s/${op.id}`} className="hover:underline">{op.reference}</Link>
                  </td>
                  <td className="p-2 text-sm capitalize">{op.type}</td>
                  <td className="p-2"><Badge status={op.status} /></td>
                  <td className="p-2 text-sm">{op.scheduledDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Low Stock Alerts</h2>
            <Link to="/products">
              <Button size="sm">View All</Button>
            </Link>
          </div>
          {lowStockProducts.length === 0 ? (
            <div className="border border-black p-4 text-sm text-gray-600 text-center">
              No low stock alerts
            </div>
          ) : (
            <table className="w-full border-collapse border border-black">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-2 text-xs font-bold border-b border-black">Product</th>
                  <th className="text-right p-2 text-xs font-bold border-b border-black">Available</th>
                  <th className="text-right p-2 text-xs font-bold border-b border-black">Reorder Point</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map(p => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-sm">{p.name}</td>
                    <td className="p-2 text-sm text-right text-danger font-bold">{p.available}</td>
                    <td className="p-2 text-sm text-right">{p.reorderPt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
