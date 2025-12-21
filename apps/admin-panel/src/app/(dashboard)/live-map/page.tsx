'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { api, Driver } from '@/lib/api';
import { MapPin, Car, Users, Clock, RefreshCw, Filter, Search, Navigation, Locate } from 'lucide-react';
import { useSocket } from '@/contexts/socket-context';

const mapContainerStyle = {
  width: '100%',
  height: 'calc(100vh - 200px)',
  minHeight: '500px',
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
  mapTypeControl: true,
  fullscreenControl: true,
};

// Driver status colors for markers
const statusColors: Record<string, string> = {
  online: '#22c55e',      // green
  offline: '#6b7280',     // gray
  in_service: '#3b82f6',  // blue
  busy: '#f59e0b',        // yellow/amber
};

export default function LiveMapPage() {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Geolocation error:', error.message);
          // Fall back to default center if geolocation fails
        }
      );
    }
  }, []);

  // Get real-time driver locations from socket
  const { driverLocations } = useSocket();

  // Fetch all drivers with locations
  const { data: driversData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['drivers-locations', statusFilter],
    queryFn: () => api.getDriversWithLocations({ status: statusFilter !== 'all' ? statusFilter : undefined }),
    refetchInterval: 5000, // Refetch every 5 seconds for faster updates
  });

  // Apply real-time location updates to drivers
  const drivers = useMemo(() => {
    const baseDrivers = driversData?.data || [];
    return baseDrivers.map((driver: Driver) => {
      const liveLocation = driverLocations.get(driver.id);
      if (liveLocation) {
        return {
          ...driver,
          latitude: liveLocation.latitude,
          longitude: liveLocation.longitude,
        };
      }
      return driver;
    });
  }, [driversData?.data, driverLocations]);

  // Filter drivers based on search and those with valid coordinates
  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver: Driver) => {
      // Must have valid coordinates
      if (!driver.latitude || !driver.longitude) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${driver.firstName} ${driver.lastName}`.toLowerCase();
        const plate = (driver.carPlate || '').toLowerCase();
        const phone = (driver.mobileNumber || '').toLowerCase();
        if (!fullName.includes(query) && !plate.includes(query) && !phone.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [drivers, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const withLocation = drivers.filter((d: Driver) => d.latitude && d.longitude);
    return {
      total: drivers.length,
      withLocation: withLocation.length,
      online: withLocation.filter((d: Driver) => d.status === 'online').length,
      inService: withLocation.filter((d: Driver) => d.status === 'in_service').length,
      offline: withLocation.filter((d: Driver) => d.status === 'offline').length,
    };
  }, [drivers]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Fit bounds to show all drivers when data changes
  useEffect(() => {
    if (map && filteredDrivers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      filteredDrivers.forEach((driver: Driver) => {
        if (driver.latitude && driver.longitude) {
          bounds.extend({
            lat: Number(driver.latitude),
            lng: Number(driver.longitude),
          });
        }
      });
      map.fitBounds(bounds, 50);

      // Don't zoom in too much for single driver
      const listener = google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom()! > 16) map.setZoom(16);
        google.maps.event.removeListener(listener);
      });
    }
  }, [map, filteredDrivers]);

  // Get marker icon based on status
  const getMarkerIcon = (status: string) => {
    const color = statusColors[status] || statusColors.offline;
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      scale: 10,
    };
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error loading Google Maps</h2>
          <p className="text-muted-foreground">
            Please check your API key in .env.local
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Map</h1>
          <p className="text-muted-foreground">Real-time driver locations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (userLocation && map) {
                map.panTo(userLocation);
                map.setZoom(15);
              }
            }}
            disabled={!userLocation}
            className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            title="Center on my location"
          >
            <Locate className="h-4 w-4" />
            My Location
          </button>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.withLocation}</p>
              <p className="text-sm text-muted-foreground">Drivers on Map</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-2">
              <Car className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.online}</p>
              <p className="text-sm text-muted-foreground">Online</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-yellow-100 p-2">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.inService}</p>
              <p className="text-sm text-muted-foreground">In Service</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-gray-100 p-2">
              <MapPin className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.offline}</p>
              <p className="text-sm text-muted-foreground">Offline</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, plate, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="online">Online</option>
            <option value="in_service">In Service</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {/* Map */}
      <div className="rounded-lg border overflow-hidden">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={userLocation || defaultCenter}
          zoom={13}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={mapOptions}
        >
          {/* User location marker (blue dot) */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
                scale: 12,
              }}
              title="Your location"
              zIndex={1000}
            />
          )}

          {/* Driver markers */}
          {filteredDrivers.map((driver: Driver) => (
            <Marker
              key={driver.id}
              position={{
                lat: Number(driver.latitude),
                lng: Number(driver.longitude),
              }}
              icon={getMarkerIcon(driver.status)}
              onClick={() => setSelectedDriver(driver)}
              title={`${driver.firstName} ${driver.lastName}`}
            />
          ))}

          {selectedDriver && selectedDriver.latitude && selectedDriver.longitude && (
            <InfoWindow
              position={{
                lat: Number(selectedDriver.latitude),
                lng: Number(selectedDriver.longitude),
              }}
              onCloseClick={() => setSelectedDriver(null)}
            >
              <div className="p-2 min-w-[200px]">
                <h3 className="font-semibold text-base">
                  {selectedDriver.firstName} {selectedDriver.lastName}
                </h3>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="flex items-center gap-2">
                    <span className="text-gray-500">Status:</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: statusColors[selectedDriver.status] || '#6b7280' }}
                    >
                      {selectedDriver.status.replace('_', ' ')}
                    </span>
                  </p>
                  {selectedDriver.mobileNumber && (
                    <p>
                      <span className="text-gray-500">Phone:</span> {selectedDriver.mobileNumber}
                    </p>
                  )}
                  {selectedDriver.carPlate && (
                    <p>
                      <span className="text-gray-500">Plate:</span> {selectedDriver.carPlate}
                    </p>
                  )}
                  {selectedDriver.carModel && (
                    <p>
                      <span className="text-gray-500">Car:</span> {selectedDriver.carModel.name}
                    </p>
                  )}
                  {selectedDriver.rating && (
                    <p>
                      <span className="text-gray-500">Rating:</span> {Number(selectedDriver.rating).toFixed(1)} / 5
                    </p>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t">
                  <a
                    href={`/drivers/${selectedDriver.id}`}
                    className="text-primary text-sm font-medium hover:underline"
                  >
                    View Profile
                  </a>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <span className="text-muted-foreground">Legend:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Online</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>In Service</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span>Busy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-500"></div>
          <span>Offline</span>
        </div>
      </div>

      {/* No drivers message */}
      {!isLoading && filteredDrivers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No drivers with location data found</p>
          <p className="text-sm mt-1">Drivers will appear on the map when they share their location</p>
        </div>
      )}
    </div>
  );
}
