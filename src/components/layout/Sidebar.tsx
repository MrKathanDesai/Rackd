import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import LogoSvg from '../../assets/logo.svg';

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/receipts', label: 'Receipts' },
  { path: '/deliveries', label: 'Deliveries' },
  { path: '/transfers', label: 'Transfers' },
  { path: '/adjustments', label: 'Adjustments' },
  { path: '/products', label: 'Products' },
  { path: '/moves', label: 'Move History' },
  { path: '/settings/warehouses', label: 'Warehouses' },
  { path: '/settings/locations', label: 'Locations' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  
  return (
    <div className="w-64 h-screen border-r border-black bg-white flex flex-col">
      <div className="p-4 border-b border-black flex items-center gap-2">
        <img src={LogoSvg} alt="Logo" className="w-8 h-8" />
        <span className="text-lg font-bold">RACKD</span>
      </div>
      
      <nav className="flex-1 p-2">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-3 py-2 text-sm ${
                isActive 
                  ? 'bg-gray-100 font-bold' 
                  : 'hover:bg-gray-50'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
