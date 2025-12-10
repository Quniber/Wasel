'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';
import { ArrowLeft, MapPin, User, Car, Search } from 'lucide-react';
import Link from 'next/link';

export default function CreateOrderPage() {
  const router = useRouter();
  const toast = useToast();

  // Form state
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [driverId, setDriverId] = useState<number | null>(null);
  const [serviceId, setServiceId] = useState<number | null>(null);

  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLatitude, setPickupLatitude] = useState('');
  const [pickupLongitude, setPickupLongitude] = useState('');

  const [dropoffAddress, setDropoffAddress] = useState('');
  const [dropoffLatitude, setDropoffLatitude] = useState('');
  const [dropoffLongitude, setDropoffLongitude] = useState('');

  // Search filters
  const [customerSearch, setCustomerSearch] = useState('');
  const [driverSearch, setDriverSearch] = useState('');

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers', customerSearch],
    queryFn: () => api.getCustomers({ page: 1, limit: 50, search: customerSearch || undefined }),
  });

  // Fetch drivers
  const { data: driversData } = useQuery({
    queryKey: ['drivers', driverSearch],
    queryFn: () => api.getDrivers({ page: 1, limit: 50, search: driverSearch || undefined }),
  });

  // Fetch services
  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.getServices(),
  });

  const customers = customersData?.data || [];
  const drivers = driversData?.data || [];
  const services = servicesData?.data || [];

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!customerId || !serviceId) {
        throw new Error('Please select a customer and service');
      }
      if (!pickupAddress || !pickupLatitude || !pickupLongitude) {
        throw new Error('Please enter pickup location');
      }

      const orderData: any = {
        customerId,
        serviceId,
        pickupAddress,
        pickupLatitude: parseFloat(pickupLatitude),
        pickupLongitude: parseFloat(pickupLongitude),
      };

      if (dropoffAddress && dropoffLatitude && dropoffLongitude) {
        orderData.dropoffAddress = dropoffAddress;
        orderData.dropoffLatitude = parseFloat(dropoffLatitude);
        orderData.dropoffLongitude = parseFloat(dropoffLongitude);
      }

      if (driverId) {
        orderData.driverId = driverId;
      }

      return api.createOrder(orderData);
    },
    onSuccess: (data) => {
      toast.success(`Order #${data.id} created successfully!`);
      router.push('/orders');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create order');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrderMutation.mutate();
  };

  const selectedCustomer = customers.find((c: any) => c.id === customerId);
  const selectedDriver = drivers.find((d: any) => d.id === driverId);
  const selectedService = services.find((s: any) => s.id === serviceId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/orders"
          className="rounded-md p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Order</h1>
          <p className="text-muted-foreground">Manually create a new order</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Customer Selection */}
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer
            </h2>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search customers..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 rounded-md bg-primary/10 border border-primary/20">
                <div>
                  <p className="font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.mobileNumber}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomerId(null)}
                  className="text-sm text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {customers.map((customer: any) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => setCustomerId(customer.id)}
                    className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors"
                  >
                    <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                    <p className="text-sm text-muted-foreground">{customer.mobileNumber}</p>
                  </button>
                ))}
                {customers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No customers found</p>
                )}
              </div>
            )}
          </div>

          {/* Driver Selection (Optional) */}
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Car className="h-5 w-5" />
              Driver (Optional)
            </h2>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search drivers..."
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {selectedDriver ? (
              <div className="flex items-center justify-between p-3 rounded-md bg-primary/10 border border-primary/20">
                <div>
                  <p className="font-medium">{selectedDriver.firstName} {selectedDriver.lastName}</p>
                  <p className="text-sm text-muted-foreground">{selectedDriver.mobileNumber}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDriverId(null)}
                  className="text-sm text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1">
                <button
                  type="button"
                  onClick={() => setDriverId(null)}
                  className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors border-b"
                >
                  <p className="font-medium text-muted-foreground">Auto-assign (dispatch to nearby drivers)</p>
                </button>
                {drivers.map((driver: any) => (
                  <button
                    key={driver.id}
                    type="button"
                    onClick={() => setDriverId(driver.id)}
                    className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors"
                  >
                    <p className="font-medium">{driver.firstName} {driver.lastName}</p>
                    <p className="text-sm text-muted-foreground">{driver.mobileNumber} - {driver.status}</p>
                  </button>
                ))}
                {drivers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No drivers found</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Service Selection */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Service Type</h2>
          <div className="flex flex-wrap gap-3">
            {services.map((service: any) => (
              <button
                key={service.id}
                type="button"
                onClick={() => setServiceId(service.id)}
                className={`px-4 py-2 rounded-md border transition-colors ${
                  serviceId === service.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted'
                }`}
              >
                {service.name}
              </button>
            ))}
          </div>
        </div>

        {/* Locations */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Pickup Location */}
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-500" />
              Pickup Location
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Address</label>
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Enter pickup address"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">Latitude</label>
                  <input
                    type="text"
                    value={pickupLatitude}
                    onChange={(e) => setPickupLatitude(e.target.value)}
                    placeholder="25.30"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Longitude</label>
                  <input
                    type="text"
                    value={pickupLongitude}
                    onChange={(e) => setPickupLongitude(e.target.value)}
                    placeholder="51.42"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dropoff Location */}
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-500" />
              Dropoff Location
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Address</label>
                <input
                  type="text"
                  value={dropoffAddress}
                  onChange={(e) => setDropoffAddress(e.target.value)}
                  placeholder="Enter dropoff address"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground">Latitude</label>
                  <input
                    type="text"
                    value={dropoffLatitude}
                    onChange={(e) => setDropoffLatitude(e.target.value)}
                    placeholder="25.32"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Longitude</label>
                  <input
                    type="text"
                    value={dropoffLongitude}
                    onChange={(e) => setDropoffLongitude(e.target.value)}
                    placeholder="51.44"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Link
            href="/orders"
            className="px-4 py-2 rounded-md border hover:bg-muted"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createOrderMutation.isPending || !customerId || !serviceId}
            className="px-6 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
