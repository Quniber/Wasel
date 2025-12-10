import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { StyleSheet, View, Text } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useState, useEffect, useCallback } from 'react';

const GOOGLE_MAPS_API_KEY = 'AIzaSyCcjyEPNrx4eRMYof-Z_4aEBjUdRQN8VlE';

interface MapProps {
  pickupLocation?: { lat: number; lng: number };
  dropoffLocation?: { lat: number; lng: number };
  currentLocation?: { lat: number; lng: number };
  driverLocation?: { lat: number; lng: number };
  showCurrentLocation?: boolean;
  showRoute?: boolean;
  showDriverRoute?: boolean;
}

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060,
};

const containerStyle = {
  width: '100%',
  height: '100%',
};

const libraries: ("places" | "geometry" | "drawing")[] = ['places'];

function MapContent({
  pickupLocation,
  dropoffLocation,
  currentLocation,
  driverLocation,
  showCurrentLocation = true,
  showRoute = true,
  showDriverRoute = false,
}: MapProps) {
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [driverDirections, setDriverDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const center = currentLocation || pickupLocation || defaultCenter;

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  // Calculate route between pickup and dropoff
  useEffect(() => {
    if (pickupLocation && dropoffLocation && showRoute && map) {
      const directionsService = new google.maps.DirectionsService();

      directionsService.route(
        {
          origin: pickupLocation,
          destination: dropoffLocation,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            setDirections(result);

            // Fit bounds to show entire route
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(pickupLocation);
            bounds.extend(dropoffLocation);
            map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
          }
        }
      );
    } else {
      setDirections(null);
    }
  }, [pickupLocation, dropoffLocation, showRoute, map]);

  // Calculate route from driver to pickup
  useEffect(() => {
    if (driverLocation && pickupLocation && showDriverRoute && map) {
      const directionsService = new google.maps.DirectionsService();

      directionsService.route(
        {
          origin: driverLocation,
          destination: pickupLocation,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            setDriverDirections(result);
          }
        }
      );
    } else {
      setDriverDirections(null);
    }
  }, [driverLocation, pickupLocation, showDriverRoute, map]);

  // Create icon URLs (SVG data URIs don't need google.maps.Size)
  const currentLocationIcon = {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="8" fill="${Colors.primary}" stroke="white" stroke-width="3"/>
      </svg>
    `),
    scaledSize: new google.maps.Size(24, 24),
    anchor: new google.maps.Point(12, 12),
  };

  const pickupIcon = {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.16 0 0 7.16 0 16C0 28 16 40 16 40S32 28 32 16C32 7.16 24.84 0 16 0Z" fill="#4CAF50"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
      </svg>
    `),
    scaledSize: new google.maps.Size(32, 40),
    anchor: new google.maps.Point(16, 40),
  };

  const dropoffIcon = {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.16 0 0 7.16 0 16C0 28 16 40 16 40S32 28 32 16C32 7.16 24.84 0 16 0Z" fill="#F44336"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
      </svg>
    `),
    scaledSize: new google.maps.Size(32, 40),
    anchor: new google.maps.Point(16, 40),
  };

  const driverIcon = {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="${Colors.primary}" stroke="white" stroke-width="3"/>
        <path d="M20 10L28 26H12L20 10Z" fill="white"/>
      </svg>
    `),
    scaledSize: new google.maps.Size(40, 40),
    anchor: new google.maps.Point(20, 20),
  };

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={14}
      onLoad={onLoad}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
      }}
    >
      {/* Route from pickup to dropoff */}
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: Colors.primary,
              strokeWeight: 4,
              strokeOpacity: 0.8,
            },
          }}
        />
      )}

      {/* Route from driver to pickup */}
      {driverDirections && (
        <DirectionsRenderer
          directions={driverDirections}
          options={{
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#4CAF50',
              strokeWeight: 3,
              strokeOpacity: 0.7,
            },
          }}
        />
      )}

      {/* Current location marker */}
      {showCurrentLocation && currentLocation && (
        <Marker position={currentLocation} icon={currentLocationIcon} />
      )}

      {/* Pickup marker */}
      {pickupLocation && (
        <Marker position={pickupLocation} icon={pickupIcon} />
      )}

      {/* Dropoff marker */}
      {dropoffLocation && (
        <Marker position={dropoffLocation} icon={dropoffIcon} />
      )}

      {/* Driver marker */}
      {driverLocation && (
        <Marker position={driverLocation} icon={driverIcon} />
      )}
    </GoogleMap>
  );
}

export default function Map(props: MapProps) {
  if (GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE') {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>Google Maps</Text>
        <Text style={styles.placeholderText}>
          Add your API key in components/Map.tsx
        </Text>
        <Text style={styles.placeholderSubtext}>
          Get one at: console.cloud.google.com
        </Text>
      </View>
    );
  }

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries}>
      <MapContent {...props} />
    </LoadScript>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: '#e8e8e8',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
