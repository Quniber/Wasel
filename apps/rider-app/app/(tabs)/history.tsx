import { StyleSheet, View, Text, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const mockRides = [
  { id: '1', from: '123 Main St', to: 'Airport', date: 'Dec 7, 2024', fare: '$25.50', status: 'completed' },
  { id: '2', from: 'Downtown Mall', to: 'Home', date: 'Dec 6, 2024', fare: '$12.00', status: 'completed' },
  { id: '3', from: 'Office', to: 'Restaurant', date: 'Dec 5, 2024', fare: '$8.75', status: 'completed' },
];

export default function HistoryScreen() {
  const renderRide = ({ item }: { item: typeof mockRides[0] }) => (
    <View style={styles.rideCard}>
      <View style={styles.rideHeader}>
        <Ionicons name="car" size={24} color={Colors.primary} />
        <Text style={styles.rideDate}>{item.date}</Text>
      </View>
      <View style={styles.rideLocations}>
        <View style={styles.locationRow}>
          <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
          <Text style={styles.locationText}>{item.from}</Text>
        </View>
        <View style={styles.locationRow}>
          <View style={[styles.dot, { backgroundColor: Colors.error }]} />
          <Text style={styles.locationText}>{item.to}</Text>
        </View>
      </View>
      <View style={styles.rideFooter}>
        <Text style={styles.fareText}>{item.fare}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={mockRides}
        renderItem={renderRide}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyText}>No rides yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundMuted,
  },
  listContent: {
    padding: 16,
  },
  rideCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideDate: {
    color: Colors.textLight,
    fontSize: 14,
  },
  rideLocations: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  locationText: {
    fontSize: 16,
    color: Colors.text,
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  fareText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statusBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.textLight,
    marginTop: 16,
  },
});
