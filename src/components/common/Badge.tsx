import React from 'react';
import type { Status, LotStatus, FreshnessStatus } from '../../types';

interface BadgeProps {
  status: Status | LotStatus | FreshnessStatus | string;
  children?: React.ReactNode;
}

const statusConfig: Record<string, { bg: string; border: string; text: string }> = {
  draft: { bg: 'bg-gray-100', border: 'border-gray-600', text: 'text-gray-600' },
  waiting: { bg: 'bg-yellow-50', border: 'border-warning', text: 'text-warning' },
  ready: { bg: 'bg-blue-50', border: 'border-primary', text: 'text-primary' },
  in_progress: { bg: 'bg-purple-50', border: 'border-purple-600', text: 'text-purple-600' },
  done: { bg: 'bg-green-50', border: 'border-success', text: 'text-success' },
  cancelled: { bg: 'bg-red-50', border: 'border-danger', text: 'text-danger' },
  // Lot statuses
  active: { bg: 'bg-green-50', border: 'border-success', text: 'text-success' },
  depleted: { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-400' },
  expired: { bg: 'bg-red-50', border: 'border-danger', text: 'text-danger' },
  // Freshness statuses
  green: { bg: 'bg-green-50', border: 'border-success', text: 'text-success' },
  amber: { bg: 'bg-yellow-50', border: 'border-warning', text: 'text-warning' },
  red: { bg: 'bg-red-50', border: 'border-danger', text: 'text-danger' },
};

const defaultConfig = { bg: 'bg-gray-100', border: 'border-gray-600', text: 'text-gray-600' };

export const Badge: React.FC<BadgeProps> = ({ status, children }) => {
  const config = statusConfig[status] || defaultConfig;

  return (
    <span
      className={`px-2 py-0.5 text-xs border ${config.bg} ${config.border} ${config.text} uppercase`}
    >
      {children || status.replace('_', ' ')}
    </span>
  );
};
