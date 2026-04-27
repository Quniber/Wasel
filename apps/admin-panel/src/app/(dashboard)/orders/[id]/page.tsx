'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ArrowLeft, MapPin, User, Car, Clock, CreditCard } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  Requested: 'bg-yellow-100 text-yellow-800',
  Found: 'bg-blue-100 text-blue-800',
  DriverAccepted: 'bg-blue-100 text-blue-800',
  Arrived: 'bg-purple-100 text-purple-800',
  Started: 'bg-purple-100 text-purple-800',
  WaitingForPostPay: 'bg-orange-100 text-orange-800',
  WaitingForPrePay: 'bg-orange-100 text-orange-800',
  Finished: 'bg-green-100 text-green-800',
  RiderCanceled: 'bg-gray-100 text-gray-700',
  DriverCanceled: 'bg-gray-100 text-gray-700',
  Expired: 'bg-gray-100 text-gray-700',
  NotFound: 'bg-red-100 text-red-800',
  NoCloseFound: 'bg-red-100 text-red-800',
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const orderId = parseInt(id);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.getOrder(orderId),
    enabled: !isNaN(orderId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link href="/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700 font-medium">Order #{orderId} not found</p>
          <p className="text-sm text-red-600 mt-1">It may have been deleted or never existed.</p>
        </div>
      </div>
    );
  }

  const statusClass = STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Order #{order.id}</h1>
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusClass}`}>
            {order.status}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Section icon={<User className="h-4 w-4" />} title="Customer">
          {order.customer ? (
            <>
              <p className="font-medium">{order.customer.firstName} {order.customer.lastName}</p>
              <p className="text-sm text-muted-foreground">{order.customer.mobileNumber || '—'}</p>
              {order.customer.email && <p className="text-sm text-muted-foreground">{order.customer.email}</p>}
            </>
          ) : <p className="text-sm text-muted-foreground">—</p>}
        </Section>

        <Section icon={<Car className="h-4 w-4" />} title="Driver">
          {order.driver ? (
            <>
              <p className="font-medium">{order.driver.firstName} {order.driver.lastName}</p>
              <p className="text-sm text-muted-foreground">{order.driver.mobileNumber || '—'}</p>
            </>
          ) : <p className="text-sm text-muted-foreground">No driver assigned</p>}
        </Section>

        <Section icon={<MapPin className="h-4 w-4" />} title="Pickup">
          <p className="text-sm">{order.pickupAddress || '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {order.pickupLatitude}, {order.pickupLongitude}
          </p>
        </Section>

        <Section icon={<MapPin className="h-4 w-4" />} title="Drop-off">
          <p className="text-sm">{order.dropoffAddress || '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {order.dropoffLatitude}, {order.dropoffLongitude}
          </p>
        </Section>

        <Section icon={<CreditCard className="h-4 w-4" />} title="Fare">
          <div className="space-y-1 text-sm">
            {order.estimatedFare !== undefined && (
              <Row label="Estimated">{formatCurrency(order.estimatedFare)}</Row>
            )}
            {order.finalFare !== undefined && (
              <Row label="Final">{formatCurrency(order.finalFare)}</Row>
            )}
            {order.distance !== undefined && (
              <Row label="Distance">{(order.distance / 1000).toFixed(2)} km</Row>
            )}
            {order.duration !== undefined && (
              <Row label="Duration">{Math.round(order.duration / 60)} min</Row>
            )}
          </div>
        </Section>

        <Section icon={<Clock className="h-4 w-4" />} title="Timeline">
          <div className="space-y-1 text-sm">
            <Row label="Created">{formatDateTime(order.createdAt)}</Row>
            {order.acceptedAt && <Row label="Accepted">{formatDateTime(order.acceptedAt)}</Row>}
            {order.startedAt && <Row label="Started">{formatDateTime(order.startedAt)}</Row>}
            {order.completedAt && <Row label="Completed">{formatDateTime(order.completedAt)}</Row>}
            {order.cancelledAt && <Row label="Cancelled">{formatDateTime(order.cancelledAt)}</Row>}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
        {icon}
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}
