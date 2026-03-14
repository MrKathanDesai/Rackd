import React from 'react';
import { Search, Bell, User, Clock } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="h-16 border-b border-border-dark bg-background-dark/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search inventory, orders, or locations... (CMD+K)"
            className="w-full bg-surface-dark border border-border-dark rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="w-4 h-4" />
          <span className="text-xs font-mono">05:08:12 UTC</span>
        </div>
        
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border-2 border-background-dark" />
        </button>

        <div className="h-8 w-[1px] bg-border-dark" />

        <button className="flex items-center gap-3 pl-2 group">
          <div className="text-right">
            <p className="text-xs font-semibold text-white group-hover:text-primary transition-colors">Kathan Desai</p>
            <p className="text-[10px] text-slate-500 font-mono uppercase">Ops Manager</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-border-dark flex items-center justify-center overflow-hidden border border-border-dark group-hover:border-primary transition-colors">
            <User className="w-5 h-5 text-slate-400" />
          </div>
        </button>
      </div>
    </header>
  );
};
