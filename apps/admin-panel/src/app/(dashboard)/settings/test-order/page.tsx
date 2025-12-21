'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { api } from '@/lib/api';
import { MapPin, Navigation, Send, User, Car, ArrowLeft, Loader2, Users } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/toast';

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

// Default center - Qatar (Doha)
const defaultCenter = {
  lat: 25.2854,
  lng: 51.5310,
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

interface Driver {
  id: number;
  firstName: string;
  lastName: string;
  status: string;
  mobileNumber?: string;
  carPlate?: string;
}

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  mobileNumber?: string;
}

export default function TestOrderPage() {
  const toast = useToast();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [pickupLocation, setPickupLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectionMode, setSelectionMode] = useState<'pickup' | 'dropoff'>('pickup');
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  // Fetch online drivers
  const { data: driversData, isLoading: driversLoading } = useQuery({
    queryKey: ['online-drivers'],
    queryFn: () => api.getDrivers({ status: 'online', limit: 100 }),
    refetchInterval: 10000,
  });

  const onlineDrivers = driversData?.data?.filter((d: Driver) => d.status === 'online') || [];

  // Fetch customers
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => api.getCustomers({ limit: 50 }),
  });

  const customers = customersData?.data || [];

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Reverse geocode to get address
  const getAddress = async (lat: number, lng: number): Promise<string> => {
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      if (response.results[0]) {
        return response.results[0].formatted_address;
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  // Handle map click
  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;

    const location = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    };

    const address = await getAddress(location.lat, location.lng);

    if (selectionMode === 'pickup') {
      setPickupLocation(location);
      setPickupAddress(address);
      setSelectionMode('dropoff');
      toast.success('Pickup location set! Now click to set dropoff.');
    } else {
      setDropoffLocation(location);
      setDropoffAddress(address);
      toast.success('Dropoff location set!');
    }
  };

  // Send test order
  const handleSendOrder = async () => {
    if (!pickupLocation || !dropoffLocation) {
      toast.error('Please select both pickup and dropoff locations');
      return;
    }

    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (!selectedDriver) {
      toast.error('Please select a driver');
      return;
    }

    setIsSending(true);

    try {
      // Create order via admin API
      const response = await api.createOrder({
        customerId: selectedCustomer,
        serviceId: 1, // Economy service
        pickupAddress: pickupAddress || 'Test Pickup',
        pickupLatitude: pickupLocation.lat,
        pickupLongitude: pickupLocation.lng,
        dropoffAddress: dropoffAddress || 'Test Dropoff',
        dropoffLatitude: dropoffLocation.lat,
        dropoffLongitude: dropoffLocation.lng,
        driverId: selectedDriver,
      });

      toast.success(`Order #${response.id} sent to driver!`);

      // Reset form
      setPickupLocation(null);
      setDropoffLocation(null);
      setPickupAddress('');
      setDropoffAddress('');
      setSelectedDriver(null);
      setSelectedCustomer(null);
      setSelectionMode('pickup');
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error?.response?.data?.message || 'Failed to create order');
    } finally {
      setIsSending(false);
    }
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error loading Google Maps</h2>
          <p className="text-muted-foreground">Please check your API key</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="flex items-center justify-center w-10 h-10 rounded-lg border hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Test Order</h1>
          <p className="text-muted-foreground">Send test orders to drivers</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Select Locations</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectionMode('pickup')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    selectionMode === 'pickup'
                      ? 'bg-green-500 text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Pickup
                </button>
                <button
                  onClick={() => setSelectionMode('dropoff')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    selectionMode === 'dropoff'
                      ? 'bg-red-500 text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <Navigation className="h-4 w-4 inline mr-1" />
                  Dropoff
                </button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Click on the map to set {selectionMode === 'pickup' ? 'pickup' : 'dropoff'} location
            </p>

            <div className="rounded-lg overflow-hidden border">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={pickupLocation || defaultCenter}
                zoom={13}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={mapOptions}
                onClick={handleMapClick}
              >
                {pickupLocation && (
                  <Marker
                    position={pickupLocation}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      fillColor: '#22c55e',
                      fillOpacity: 1,
                      strokeColor: '#ffffff',
                      strokeWeight: 3,
                      scale: 12,
                    }}
                    title="Pickup"
                  />
                )}
                {dropoffLocation && (
                  <Marker
                    position={dropoffLocation}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      fillColor: '#ef4444',
                      fillOpacity: 1,
                      strokeColor: '#ffffff',
                      strokeWeight: 3,
                      scale: 12,
                    }}
                    title="Dropoff"
                  />
                )}
              </GoogleMap>
            </div>
          </div>

          {/* Selected Locations */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="font-medium">Pickup</span>
              </div>
              {pickupLocation ? (
                <p className="text-sm text-muted-foreground">{pickupAddress || 'Loading address...'}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Click on map to set</p>
              )}
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="font-medium">Dropoff</span>
              </div>
              {dropoffLocation ? (
                <p className="text-sm text-muted-foreground">{dropoffAddress || 'Loading address...'}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Click on map to set</p>
              )}
            </div>
          </div>
        </div>

        {/* Customer & Driver Selection & Send */}
        <div className="space-y-4">
          {/* Customer Selection */}
          <div className="rounded-lg border bg-card p-4">
            <h2 className="font-semibold mb-4">Select Customer</h2>

            {customersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No customers found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {customers.map((customer: Customer) => (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      selectedCustomer === customer.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                      <p className="text-xs text-muted-foreground">
                        {customer.mobileNumber}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Driver Selection */}
          <div className="rounded-lg border bg-card p-4">
            <h2 className="font-semibold mb-4">Select Driver</h2>

            {driversLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : onlineDrivers.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No online drivers</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {onlineDrivers.map((driver: Driver) => (
                  <button
                    key={driver.id}
                    onClick={() => setSelectedDriver(driver.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      selectedDriver === driver.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{driver.firstName} {driver.lastName}</p>
                      <p className="text-xs text-muted-foreground">
                        {driver.carPlate || driver.mobileNumber}
                      </p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSendOrder}
            disabled={!pickupLocation || !dropoffLocation || !selectedCustomer || !selectedDriver || isSending}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Send Order to Driver
              </>
            )}
          </button>

          <div className="rounded-lg border bg-muted/50 p-4">
            <h3 className="font-medium mb-2">How it works</h3>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Click on map to set pickup (green)</li>
              <li>Click again to set dropoff (red)</li>
              <li>Select a customer</li>
              <li>Select an online driver</li>
              <li>Click "Send Order" to dispatch</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
