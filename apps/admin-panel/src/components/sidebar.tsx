'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Car,
  ShoppingCart,
  Settings,
  LogOut,
  Building2,
  Ticket,
  CreditCard,
  UserCog,
  Headphones,
  ClipboardCheck,
  Sun,
  Moon,
  Monitor,
  Cog,
  User,
  MapPin,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Live Map', href: '/live-map', icon: MapPin },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Drivers', href: '/drivers', icon: Car },
  { name: 'Driver Approvals', href: '/drivers/approvals', icon: ClipboardCheck },
  { name: 'Fleets', href: '/fleets', icon: Building2 },
  { name: 'Services', href: '/services', icon: Settings },
  { name: 'Coupons', href: '/coupons', icon: Ticket },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Support', href: '/support', icon: Headphones },
  { name: 'Operators', href: '/operators', icon: UserCog },
  { name: 'Settings', href: '/settings', icon: Cog },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const getThemeIcon = () => {
    if (theme === 'system') return Monitor;
    if (theme === 'dark') return Moon;
    return Sun;
  };

  const ThemeIcon = getThemeIcon();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Car className="h-6 w-6 text-primary" />
        <span className="ml-2 text-lg font-semibold">Wasel Admin Panel</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          // Exact match for most items, but allow sub-paths for items that have nested pages
          const isActive = pathname === item.href ||
            (item.href !== '/drivers' && pathname?.startsWith(item.href + '/'));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        {/* Theme Toggle */}
        <button
          onClick={cycleTheme}
          className="mb-2 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ThemeIcon className="h-5 w-5" />
          <span className="capitalize">{theme} Mode</span>
        </button>

        <Link
          href="/profile"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {user?.firstName?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </Link>
        <button
          onClick={logout}
          className="mt-2 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </div>
  );
}
