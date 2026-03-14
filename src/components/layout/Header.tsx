import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-12 border-b border-black bg-white px-4 flex items-center justify-between">
      <div className="text-sm">
        <span className="font-bold">Warehouse:</span> All
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-600">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
        {user && (
          <>
            <span className="text-xs text-gray-600">{user.name}</span>
            <Button size="sm" onClick={logout}>
              Logout
            </Button>
          </>
        )}
      </div>
    </header>
  );
};
