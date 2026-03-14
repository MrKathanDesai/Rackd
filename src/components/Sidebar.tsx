import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ArrowDownLeft, 
  ArrowUpRight, 
  MoveRight, 
  Warehouse, 
  Settings, 
  BarChart3
} from 'lucide-react';
import { motion } from 'motion/react';
import LogoSvg from '../assets/logo.svg';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'receipts', label: 'Receipts', icon: ArrowDownLeft },
  { id: 'deliveries', label: 'Deliveries', icon: ArrowUpRight },
  { id: 'moves', label: 'Internal Moves', icon: MoveRight },
  { id: 'warehouses', label: 'Warehouses', icon: Warehouse },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="w-64 h-screen bg-surface-dark border-r border-border-dark flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <img src={LogoSvg} alt="RACKD Logo" className="w-10 h-10" />
        <div>
          <h1 className="text-xl font-bold tracking-tighter text-white">RACKD</h1>
          <p className="text-[10px] font-mono text-primary uppercase tracking-[0.2em]">Industrial OS</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive 
                  ? 'bg-primary text-background-dark font-semibold' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-background-dark' : 'group-hover:text-primary'}`} />
              <span className="text-sm">{item.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="active-pill"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-background-dark"
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border-dark">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all">
          <Settings className="w-5 h-5" />
          <span className="text-sm">Settings</span>
        </button>
        <div className="mt-4 px-4 py-3 bg-white/5 rounded-lg border border-border-dark">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase">System Status</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-[10px] font-mono text-slate-300">
            NODE: US-EAST-01<br />
            LATENCY: 14ms
          </div>
        </div>
      </div>
    </div>
  );
};
