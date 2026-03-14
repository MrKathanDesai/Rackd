import React from 'react';

interface BadgeProps {
  status: 'draft' | 'waiting' | 'ready' | 'done' | 'cancelled';
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ status, children }) => {
  const statusConfig = {
    draft: { bg: 'bg-gray-100', border: 'border-gray-600', text: 'text-gray-600' },
    waiting: { bg: 'bg-yellow-50', border: 'border-warning', text: 'text-warning' },
    ready: { bg: 'bg-blue-50', border: 'border-primary', text: 'text-primary' },
    done: { bg: 'bg-green-50', border: 'border-success', text: 'text-success' },
    cancelled: { bg: 'bg-red-50', border: 'border-danger', text: 'text-danger' },
  };
  
  const config = statusConfig[status];
  
  return (
    <span className={`px-2 py-0.5 text-xs border ${config.bg} ${config.border} ${config.text} uppercase`}>
      {children || status}
    </span>
  );
};
