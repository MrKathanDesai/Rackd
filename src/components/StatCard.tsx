import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'motion/react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  delay?: number;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, trend, delay = 0 }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-surface-dark border border-border-dark p-6 rounded-xl hover:border-primary/30 transition-colors group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-white/5 rounded-lg group-hover:bg-primary/10 transition-colors">
          <Icon className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded ${
            trend.positive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
          }`}>
            {trend.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
      </div>
      
      <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: '70%' }}
          transition={{ duration: 1, delay: delay + 0.5 }}
          className="h-full bg-primary/40"
        />
      </div>
    </motion.div>
  );
};
