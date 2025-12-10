'use client';

import { useQuery } from '@tanstack/react-query';
import { api, Order } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { X, MapPin, User, Car, Clock, DollarSign, Phone, Mail, Calendar } from 'lucide-react';

interface OrderDetailsModalProps {
  orderId: number;
  isOpen: boolean;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-blue-100 text-blue-800',
  arrived: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function OrderDetailsModal({ orderId, isOpen, onClose }: OrderDetailsModalProps) {
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.getOrder(orderId),
    enabled: isOpen && !!orderId,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-2xl max-h-[90vh] overflow-auto rounded-lg bg-background shadow-lg">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b bg-background px-6 py-4">
          <h2 className="text-lg font-semibold">Order Details</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : order ? (
            <div className="space-y-6">
              {/* Order Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold">Order #{order.id}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        statusColors[order.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {order.service?.name || 'Standard'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {formatCurrency(order.finalFare || order.estimatedFare || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {order.finalFare ? 'Final Fare' : 'Estimated'}
                  </p>
                </div>
              </div>

              {/* Locations */}
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <MapPin className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Pickup</p>
                    <p className="text-sm">{order.pickupAddress}</p>
                  </div>
                </div>
                <div className="border-l-2 border-dashed border-muted ml-2.5 h-4" />
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <MapPin className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Dropoff</p>
                    <p className="text-sm">{order.dropoffAddress}</p>
                  </div>
                </div>
              </div>

              {/* Trip Details */}
              <div className="grid grid-cols-3 gap-4">
                {order.distance && (
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Distance</p>
                    <p className="text-lg font-semibold">{(order.distance / 1000).toFixed(1)} km</p>
                  </div>
                )}
                {order.duration && (
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-lg font-semibold">{order.duration} min</p>
                  </div>
                )}
                {order.estimatedFare && (
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">Est. Fare</p>
                    <p className="text-lg font-semibold">{formatCurrency(order.estimatedFare)}</p>
                  </div>
                )}
              </div>

              {/* Customer & Driver */}
              <div className="grid grid-cols-2 gap-4">
                {/* Customer */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-primary" />
                    <h4 className="font-medium">Customer</h4>
                  </div>
                  {order.customer ? (
                    <div className="space-y-2">
                      <p className="font-medium">
                        {order.customer.firstName} {order.customer.lastName}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {order.customer.mobileNumber}
                      </div>
                      {order.customer.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {order.customer.email}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No customer assigned</p>
                  )}
                </div>

                {/* Driver */}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Car className="h-4 w-4 text-primary" />
                    <h4 className="font-medium">Driver</h4>
                  </div>
                  {order.driver ? (
                    <div className="space-y-2">
                      <p className="font-medium">
                        {order.driver.firstName} {order.driver.lastName}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {order.driver.mobileNumber}
                      </div>
                      {order.driver.carPlate && (
                        <p className="text-sm text-muted-foreground">
                          Plate: {order.driver.carPlate}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No driver assigned</p>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-primary" />
                  <h4 className="font-medium">Timeline</h4>
                </div>
                <div className="space-y-3">
                  <TimelineItem
                    label="Created"
                    time={order.createdAt}
                    icon={<Calendar className="h-3 w-3" />}
                  />
                  {order.acceptedAt && (
                    <TimelineItem
                      label="Accepted"
                      time={order.acceptedAt}
                      icon={<Clock className="h-3 w-3" />}
                    />
                  )}
                  {order.startedAt && (
                    <TimelineItem
                      label="Started"
                      time={order.startedAt}
                      icon={<Car className="h-3 w-3" />}
                    />
                  )}
                  {order.completedAt && (
                    <TimelineItem
                      label="Completed"
                      time={order.completedAt}
                      icon={<DollarSign className="h-3 w-3" />}
                    />
                  )}
                  {order.cancelledAt && (
                    <TimelineItem
                      label="Cancelled"
                      time={order.cancelledAt}
                      icon={<X className="h-3 w-3" />}
                      isError
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              Order not found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  label,
  time,
  icon,
  isError = false,
}: {
  label: string;
  time: string;
  icon: React.ReactNode;
  isError?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full ${
          isError ? 'bg-red-100 text-red-600' : 'bg-muted text-muted-foreground'
        }`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <span className={`text-sm font-medium ${isError ? 'text-red-600' : ''}`}>
          {label}
        </span>
      </div>
      <span className="text-sm text-muted-foreground">{formatDateTime(time)}</span>
    </div>
  );
}
