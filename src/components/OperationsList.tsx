import React from 'react';
import { Receipt, Delivery } from '../types';
import { ArrowDownLeft, ArrowUpRight, Clock, ChevronRight } from 'lucide-react';

interface OperationsListProps {
  receipts: Receipt[];
  deliveries: Delivery[];
}

export const OperationsList: React.FC<OperationsListProps> = ({ receipts, deliveries }) => {
  return (
    <div className="space-y-6">
      <div className="bg-surface-dark border border-border-dark rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border-dark flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Incoming Receipts</h3>
          <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">LIVE</span>
        </div>
        <div className="divide-y divide-border-dark">
          {receipts.map((rc) => (
            <div key={rc.id} className="p-4 hover:bg-white/2 transition-colors flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{rc.reference}</p>
                  <p className="text-xs text-slate-500">{rc.supplier}</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <div>
                  <p className="text-xs font-mono text-white">{rc.items} Items</p>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    {rc.arrivalDate}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-primary transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-dark border border-border-dark rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border-dark flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Outgoing Deliveries</h3>
          <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">LIVE</span>
        </div>
        <div className="divide-y divide-border-dark">
          {deliveries.map((dl) => (
            <div key={dl.id} className="p-4 hover:bg-white/2 transition-colors flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{dl.reference}</p>
                  <p className="text-xs text-slate-500">{dl.customer}</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <div>
                  <p className="text-xs font-mono text-white">{dl.items} Items</p>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    {dl.shipDate}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-primary transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
