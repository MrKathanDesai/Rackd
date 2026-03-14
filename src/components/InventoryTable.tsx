import React from 'react';
import { Product } from '../types';
import { MoreVertical, AlertTriangle, ArrowRight } from 'lucide-react';

interface InventoryTableProps {
  products: Product[];
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ products }) => {
  return (
    <div className="bg-surface-dark border border-border-dark rounded-xl overflow-hidden">
      <div className="p-6 border-b border-border-dark flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Inventory Overview</h3>
          <p className="text-xs text-slate-500">Real-time stock levels across all nodes</p>
        </div>
        <button className="text-xs font-mono text-primary hover:underline flex items-center gap-1">
          VIEW ALL <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/2 bg-opacity-50">
              <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-wider text-right">On Hand</th>
              <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-wider text-right">Available</th>
              <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-wider w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-dark">
            {products.map((product) => {
              const isLowStock = product.available <= product.reorderPt;
              
              return (
                <tr key={product.id} className="hover:bg-white/2 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={product.thumbnail} 
                        alt={product.name} 
                        className="w-10 h-10 rounded-lg object-cover border border-border-dark"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <p className="text-sm font-semibold text-white group-hover:text-primary transition-colors">{product.name}</p>
                        <p className="text-[10px] text-slate-500">{product.uom}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="sku-text text-xs text-slate-400">{product.sku}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-400">{product.category}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-mono text-white">{product.onHand}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-mono ${isLowStock ? 'text-rose-500 font-bold' : 'text-white'}`}>
                      {product.available}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {isLowStock ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-full w-fit">
                        <AlertTriangle className="w-3 h-3" />
                        LOW STOCK
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full w-fit">
                        OPTIMAL
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-1 text-slate-500 hover:text-white transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
