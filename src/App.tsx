import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { StatCard } from './components/StatCard';
import { InventoryTable } from './components/InventoryTable';
import { OperationsList } from './components/OperationsList';
import { 
  Package, 
  Truck, 
  ArrowRightLeft, 
  AlertCircle,
  Plus,
  Download
} from 'lucide-react';
import { 
  MOCK_PRODUCTS, 
  MOCK_RECEIPTS, 
  MOCK_DELIVERIES 
} from './constants';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex h-screen bg-background-dark overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {activeTab === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Welcome Section */}
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">Operational Overview</h2>
                  <p className="text-slate-500 mt-1">System status: <span className="text-emerald-500 font-mono font-bold">OPTIMAL</span> • 3 nodes active</p>
                </div>
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-border-dark rounded-lg text-sm font-semibold text-white hover:bg-white/10 transition-all">
                    <Download className="w-4 h-4" /> Export Report
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-primary text-background-dark rounded-lg text-sm font-bold hover:opacity-90 transition-all">
                    <Plus className="w-4 h-4" /> New Operation
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  label="Total Inventory" 
                  value="2,485" 
                  icon={Package} 
                  trend={{ value: '+12.5%', positive: true }}
                  delay={0.1}
                />
                <StatCard 
                  label="Pending Receipts" 
                  value="14" 
                  icon={Truck} 
                  trend={{ value: '2 urgent', positive: false }}
                  delay={0.2}
                />
                <StatCard 
                  label="Active Deliveries" 
                  value="38" 
                  icon={ArrowRightLeft} 
                  trend={{ value: '+5.2%', positive: true }}
                  delay={0.3}
                />
                <StatCard 
                  label="Low Stock Alerts" 
                  value="3" 
                  icon={AlertCircle} 
                  trend={{ value: '-18%', positive: true }}
                  delay={0.4}
                />
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-8">
                  <InventoryTable products={MOCK_PRODUCTS} />
                </div>
                <div className="xl:col-span-1">
                  <OperationsList 
                    receipts={MOCK_RECEIPTS} 
                    deliveries={MOCK_DELIVERIES} 
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'dashboard' && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-border-dark">
                <Package className="w-8 h-8 text-slate-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Module Under Construction</h3>
                <p className="text-slate-500 max-w-xs mx-auto">The {activeTab} module is currently being optimized for industrial-scale operations.</p>
              </div>
              <button 
                onClick={() => setActiveTab('dashboard')}
                className="text-primary font-mono text-xs hover:underline"
              >
                RETURN TO COMMAND CENTER
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
