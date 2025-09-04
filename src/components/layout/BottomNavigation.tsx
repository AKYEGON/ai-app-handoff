
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { 
  BarChart3, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationItems = [
  { 
    id: 'dashboard', 
    icon: BarChart3, 
    path: '/app/dashboard',
    label: 'Dashboard',
    matchPaths: ['/app/dashboard', '/app']
  },
  { 
    id: 'sales', 
    icon: ShoppingCart, 
    path: '/app/sales',
    label: 'Sales',
    matchPaths: ['/app/sales']
  },
  { 
    id: 'inventory', 
    icon: Package, 
    path: '/app/inventory',
    label: 'Inventory',
    matchPaths: ['/app/inventory']
  },
  { 
    id: 'customers', 
    icon: Users, 
    path: '/app/customers',
    label: 'Customers',
    matchPaths: ['/app/customers']
  },
  { 
    id: 'reports', 
    icon: FileText, 
    path: '/app/reports',
    label: 'Reports',
    matchPaths: ['/app/reports']
  }
];

export const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <nav className={cn(
      "h-16 w-full border-t",
      isDark 
        ? "bg-background border-border" 
        : "bg-white border-gray-200"
    )}>
      <div className="grid grid-cols-5 h-full">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.matchPaths?.includes(location.pathname) || location.pathname === item.path;
          
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-1",
                "transition-colors duration-200",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon 
                className={cn(
                  "w-5 h-5 transition-all duration-200",
                  isActive && "scale-110"
                )} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={cn(
                "text-xs font-medium leading-none",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
