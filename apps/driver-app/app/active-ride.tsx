import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Map from '@/components/Map';

export default function ActiveRideScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <Map
          currentLocation={{ lat: 40.7128, lng: -74.0060 }}
          pickupLocation={{ lat: 40.7180, lng: -74.0020 }}
          dropoffLocation={{ lat: 40.7300, lng: -73.9950 }}
          showCurrentLocation={true}
          showRouteToPickup={true}
          showRouteToDropoff={true}
        />
      </View>

      <View style={styles.rideCard}>
        <View style={styles.passengerInfo}>
          <Ionicons name="person-circle" size={50} color={Colors.textLight} />
          <View style={styles.passengerDetails}>
            <Text style={styles.passengerName}>John Doe</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color={Colors.warning} />
              <Text style={styles.rating}>4.8</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.callButton}>
            <Ionicons name="call" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.locationInfo}>
          <View style={styles.locationRow}>
            <View style={[styles.dot, { backgroundColor: Colors.success }]} />
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationAddress}>123 Main Street</Text>
            </View>
          </View>
          <View style={styles.locationDivider} />
          <View style={styles.locationRow}>
            <View style={[styles.dot, { backgroundColor: Colors.error }]} />
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>Drop-off</Text>
              <Text style={styles.locationAddress}>456 Oak Avenue</Text>
            </View>
          </View>
        </View>

        <View style={styles.tripStats}>
          <View style={styles.tripStatItem}>
            <Text style={styles.tripStatValue}>2.5 km</Text>
            <Text style={styles.tripStatLabel}>Distance</Text>
          </View>
          <View style={styles.tripStatItem}>
            <Text style={styles.tripStatValue}>8 min</Text>
            <Text style={styles.tripStatLabel}>ETA</Text>
          </View>
          <View style={styles.tripStatItem}>
            <Text style={styles.tripStatValue}>$12.50</Text>
            <Text style={styles.tripStatLabel}>Fare</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.arrivedButton}>
            <Text style={styles.arrivedButtonText}>Arrived at Pickup</Text>
          </TouchableOpacity>
        </View>
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
  rideCard: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  passengerDetails: {
    flex: 1,
    marginLeft: 12,
  },
  passengerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 4,
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.backgroundMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    marginBottom: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
  },
  locationDivider: {
    width: 2,
    height: 20,
    backgroundColor: Colors.border,
    marginLeft: 5,
    marginVertical: 4,
  },
  locationDetails: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  locationAddress: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  tripStats: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundMuted,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  tripStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  tripStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  tripStatLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  actionButtons: {
    gap: 12,
  },
  arrivedButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  arrivedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
