import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LogoSvg from '../../assets/logo.svg';

interface NavItem {
  path: string;
  label: string;
  permission?: string;
  permissions?: string[]; // any of these = show
}

interface NavSection {
  heading?: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isSuperAdmin = user?.is_super_admin === true;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Build nav sections with permission requirements
  const navSections: NavSection[] = [
    {
      items: [
        { path: '/', label: 'Dashboard', permission: 'dashboard.view' },
      ],
    },
    {
      heading: 'Operations',
      items: [
        { path: '/receipts', label: 'Receipts', permission: 'receipts.view' },
        { path: '/deliveries', label: 'Deliveries', permission: 'deliveries.view' },
        { path: '/production', label: 'Production', permission: 'production.view' },
        { path: '/adjustments', label: 'Adjustments', permission: 'adjustments.view' },
        { path: '/transfers', label: 'Transfers', permission: 'transfers.view' },
      ],
    },
    {
      heading: 'Inventory',
      items: [
        { path: '/products', label: 'Products', permission: 'products.view' },
        { path: '/moves', label: 'Move History', permission: 'movehistory.view' },
      ],
    },
    {
      heading: 'Settings',
      items: [
        { path: '/settings/warehouses', label: 'Warehouses', permission: 'settings.warehouses' },
        { path: '/settings/locations', label: 'Locations', permission: 'settings.locations' },
        { path: '/settings/suppliers', label: 'Suppliers', permission: 'settings.suppliers' },
        { path: '/settings/users', label: 'Users', permission: 'settings.users' },
      ],
    },
  ];

  const hasPermission = (perm: string): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return user.permissions[perm] === true;
  };

  return (
    <div className="w-64 h-screen border-r border-black bg-white flex flex-col">
      <div className="p-4 border-b border-black flex items-center justify-center">
        <img src={LogoSvg} alt="Logo" className="w-auto h-12" />
      </div>

      <nav className="flex-1 p-2 overflow-y-auto">
        {navSections.map((section, si) => {
          // Filter items by permission
          const visibleItems = section.items.filter((item) => {
            if (!item.permission) return true;
            return hasPermission(item.permission);
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={si} className={si > 0 ? 'mt-4' : ''}>
              {section.heading && (
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {section.heading}
                </div>
              )}
              {visibleItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block px-3 py-2 text-sm ${
                    isActive(item.path)
                      ? 'bg-gray-100 font-bold'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>
    </div>
  );
};
