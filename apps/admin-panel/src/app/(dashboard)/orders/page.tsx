'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, Order } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Search, Eye, MapPin, Download, Plus } from 'lucide-react';
import Link from 'next/link';
import { exportToCSV, orderColumns } from '@/lib/export-csv';
import { useToast } from '@/components/toast';
import { OrderDetailsModal } from '@/components/order-details-modal';
import { DateRangePicker } from '@/components/date-range-picker';

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<{ startDate: string | null; endDate: string | null }>({
    startDate: null,
    endDate: null,
  });
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['orders', page, statusFilter, dateRange],
    queryFn: () =>
      api.getOrders({
        page,
        limit: 10,
        status: statusFilter || undefined,
        // Note: Backend needs to support startDate/endDate params
        // startDate: dateRange.startDate || undefined,
        // endDate: dateRange.endDate || undefined,
      }),
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Fetch all orders for export (up to 1000)
      const exportData = await api.getOrders({ page: 1, limit: 1000, status: statusFilter || undefined });
      if (exportData.data.length === 0) {
        toast.error('No orders to export');
        return;
      }
      const filename = `orders_${new Date().toISOString().split('T')[0]}`;
      exportToCSV(exportData.data, orderColumns, filename);
      toast.success(`Exported ${exportData.data.length} orders`);
    } catch (error) {
      toast.error('Failed to export orders');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">View and manage all orders</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <Link
            href="/orders/create"
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Order
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="">All Statuses</option>
          <option value="Requested">Requested</option>
          <option value="DriverAccepted">Driver Accepted</option>
          <option value="Arrived">Arrived</option>
          <option value="Started">In Progress</option>
          <option value="Finished">Completed</option>
          <option value="RiderCanceled">Rider Cancelled</option>
          <option value="DriverCanceled">Driver Cancelled</option>
        </select>
        <DateRangePicker
          value={dateRange}
          onChange={(range) => {
            setDateRange(range);
            setPage(1);
          }}
          placeholder="Filter by date"
        />
      </div>

      {/* Orders Grid */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data?.data && data.data.length > 0 ? (
          data.data.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onViewDetails={() => setSelectedOrderId(order.id)}
            />
          ))
        ) : (
          <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
            No orders found
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrderId && (
        <OrderDetailsModal
          orderId={selectedOrderId}
          isOpen={!!selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}

      {/* Pagination */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === data.meta.totalPages}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onViewDetails }: { order: Order; onViewDetails: () => void }) {
  const statusColors: Record<string, string> = {
    Requested: 'bg-yellow-100 text-yellow-800',
    Booked: 'bg-orange-100 text-orange-800',
    DriverAccepted: 'bg-blue-100 text-blue-800',
    Arrived: 'bg-purple-100 text-purple-800',
    Started: 'bg-indigo-100 text-indigo-800',
    Finished: 'bg-green-100 text-green-800',
    RiderCanceled: 'bg-red-100 text-red-800',
    DriverCanceled: 'bg-red-100 text-red-800',
    NotFound: 'bg-gray-100 text-gray-800',
    NoCloseFound: 'bg-gray-100 text-gray-800',
    Expired: 'bg-gray-100 text-gray-800',
  };

  const statusLabels: Record<string, string> = {
    Requested: 'Requested',
    Booked: 'Booked',
    DriverAccepted: 'Driver Accepted',
    Arrived: 'Arrived',
    Started: 'In Progress',
    Finished: 'Completed',
    RiderCanceled: 'Rider Cancelled',
    DriverCanceled: 'Driver Cancelled',
    NotFound: 'Not Found',
    NoCloseFound: 'No Drivers',
    Expired: 'Expired',
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Order #{order.id}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                statusColors[order.status] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {statusLabels[order.status] || order.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">
            {formatCurrency(order.finalFare || order.estimatedFare || 0)}
          </p>
          {order.service && (
            <p className="text-sm text-muted-foreground">{order.service.name}</p>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 text-green-500" />
          <div>
            <p className="text-xs text-muted-foreground">Pickup</p>
            <p className="text-sm">{order.pickupAddress}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 text-red-500" />
          <div>
            <p className="text-xs text-muted-foreground">Dropoff</p>
            <p className="text-sm">{order.dropoffAddress}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <div className="flex gap-6">
          {order.customer && (
            <div>
              <p className="text-xs text-muted-foreground">Customer</p>
              <p className="text-sm font-medium">
                {order.customer.firstName} {order.customer.lastName}
              </p>
            </div>
          )}
          {order.driver && (
            <div>
              <p className="text-xs text-muted-foreground">Driver</p>
              <p className="text-sm font-medium">
                {order.driver.firstName} {order.driver.lastName}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={onViewDetails}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <Eye className="h-4 w-4" />
          View Details
        </button>
      </div>
    </div>
  );
}
