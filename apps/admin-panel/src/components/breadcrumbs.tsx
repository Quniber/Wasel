'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

// Map of route segments to display labels
const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  customers: 'Customers',
  drivers: 'Drivers',
  approvals: 'Approvals',
  fleets: 'Fleets',
  services: 'Services',
  coupons: 'Coupons',
  payments: 'Payments',
  support: 'Support',
  operators: 'Operators',
  settings: 'Settings',
  profile: 'Profile',
};

export function Breadcrumbs() {
  const pathname = usePathname();

  if (!pathname || pathname === '/dashboard') {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);

  // Build breadcrumb items
  const breadcrumbs = segments.map((segment, index) => {
    const path = '/' + segments.slice(0, index + 1).join('/');
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = index === segments.length - 1;

    return {
      path,
      label,
      isLast,
    };
  });

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.path} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4" />
          {crumb.isLast ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.path}
              className="hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
