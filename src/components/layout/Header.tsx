import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="h-12 border-b border-black bg-white px-4 flex items-center justify-between">
      <div className="text-sm">
        <span className="font-bold">Warehouse:</span> Main Distribution Center
      </div>
      <div className="text-xs text-gray-600">
        {new Date().toLocaleDateString('en-US', { 
          weekday: 'short', 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })}
      </div>
    </header>
  );
};
