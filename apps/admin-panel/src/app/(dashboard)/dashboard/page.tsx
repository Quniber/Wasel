'use client';

import { useQuery } from '@tanstack/react-query';
import { api, DashboardStats, Order } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  Users,
  Car,
  ShoppingCart,
  DollarSign,
  Activity,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.getDashboardStats(),
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => api.getRecentOrders(5),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your taxi platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Customers"
          value={stats?.totalCustomers ?? 0}
          icon={Users}
          loading={statsLoading}
        />
        <StatCard
          title="Total Drivers"
          value={stats?.totalDrivers ?? 0}
          icon={Car}
          loading={statsLoading}
          subtitle={`${stats?.activeDrivers ?? 0} active`}
        />
        <StatCard
          title="Total Orders"
          value={stats?.totalOrders ?? 0}
          icon={ShoppingCart}
          loading={statsLoading}
          subtitle={`${stats?.pendingOrders ?? 0} pending`}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          icon={DollarSign}
          loading={statsLoading}
          isFormatted
        />
        <StatCard
          title="Active Drivers"
          value={stats?.activeDrivers ?? 0}
          icon={Activity}
          loading={statsLoading}
        />
        <StatCard
          title="Pending Orders"
          value={stats?.pendingOrders ?? 0}
          icon={Clock}
          loading={statsLoading}
        />
      </div>

      {/* Recent Orders */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
          <Link
            href="/orders"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="p-6">
          {ordersLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : recentOrders && recentOrders.length > 0 ? (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No orders yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  subtitle?: string;
  isFormatted?: boolean;
}

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  subtitle,
  isFormatted,
}: StatCardProps) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center gap-4">
        <div className="rounded-full bg-primary/10 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-muted"></div>
          ) : (
            <>
              <p className="text-2xl font-bold">
                {isFormatted ? value : value.toLocaleString()}
              </p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-blue-100 text-blue-800',
    arrived: 'bg-purple-100 text-purple-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <Link
      href={`/orders/${order.id}`}
      className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">Order #{order.id}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              statusColors[order.status] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {order.status.replace('_', ' ')}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {order.pickupAddress} → {order.dropoffAddress}
        </p>
      </div>
      <div className="text-right">
        <p className="font-medium">
          {formatCurrency(order.finalFare || order.estimatedFare || 0)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDateTime(order.createdAt)}
        </p>
      </div>
    </Link>
  );
}
