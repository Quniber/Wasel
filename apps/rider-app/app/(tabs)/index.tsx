import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Colors } from '@/constants/Colors';
import Map from '@/components/Map';
import PlaceAutocomplete from '@/components/PlaceAutocomplete';

interface Location {
  lat: number;
  lng: number;
  address: string;
}

export default function HomeScreen() {
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);

  const handlePickupSelected = (place: Location) => {
    setPickupLocation(place);
  };

  const handleDestinationSelected = (place: Location) => {
    setDropoffLocation(place);
  };

  const showRoute = pickupLocation && dropoffLocation;

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <Map
          currentLocation={{ lat: 40.7128, lng: -74.0060 }}
          pickupLocation={pickupLocation || undefined}
          dropoffLocation={dropoffLocation || undefined}
          showCurrentLocation={!pickupLocation}
          showRoute={!!showRoute}
        />
      </View>

      <View style={styles.searchContainer}>
        <PlaceAutocomplete
          placeholder="Pickup location"
          value={pickup}
          onChangeText={setPickup}
          onPlaceSelected={handlePickupSelected}
          dotColor={Colors.primary}
        />

        <PlaceAutocomplete
          placeholder="Where to?"
          value={destination}
          onChangeText={setDestination}
          onPlaceSelected={handleDestinationSelected}
          dotColor={Colors.error}
        />

        <TouchableOpacity
          style={[
            styles.bookButton,
            (!pickupLocation || !dropoffLocation) && styles.bookButtonDisabled,
          ]}
          disabled={!pickupLocation || !dropoffLocation}
        >
          <Text style={styles.bookButtonText}>Find Drivers</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapContainer: {
    flex: 1,
  },
  searchContainer: {
    backgroundColor: Colors.background,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  bookButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  bookButtonDisabled: {
    backgroundColor: Colors.textLight,
    opacity: 0.6,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
