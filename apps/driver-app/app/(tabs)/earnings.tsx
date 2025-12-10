import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const mockEarnings = [
  { id: '1', date: 'Today', trips: 8, earnings: '$125.50', hours: '6h 30m' },
  { id: '2', date: 'Yesterday', trips: 12, earnings: '$185.00', hours: '8h 15m' },
  { id: '3', date: 'Dec 6', trips: 6, earnings: '$92.25', hours: '4h 45m' },
  { id: '4', date: 'Dec 5', trips: 10, earnings: '$156.75', hours: '7h 20m' },
];

export default function EarningsScreen() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');

  const renderEarning = ({ item }: { item: typeof mockEarnings[0] }) => (
    <View style={styles.earningCard}>
      <View style={styles.earningHeader}>
        <Text style={styles.earningDate}>{item.date}</Text>
        <Text style={styles.earningAmount}>{item.earnings}</Text>
      </View>
      <View style={styles.earningStats}>
        <View style={styles.earningStatItem}>
          <Ionicons name="car" size={16} color={Colors.textLight} />
          <Text style={styles.earningStatText}>{item.trips} trips</Text>
        </View>
        <View style={styles.earningStatItem}>
          <Ionicons name="time" size={16} color={Colors.textLight} />
          <Text style={styles.earningStatText}>{item.hours}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>This Week</Text>
        <Text style={styles.summaryAmount}>$559.50</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatValue}>36</Text>
            <Text style={styles.summaryStatLabel}>Trips</Text>
          </View>
          <View style={styles.summaryStatDivider} />
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatValue}>26h</Text>
            <Text style={styles.summaryStatLabel}>Online</Text>
          </View>
          <View style={styles.summaryStatDivider} />
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatValue}>$15.54</Text>
            <Text style={styles.summaryStatLabel}>Per Trip</Text>
          </View>
        </View>
      </View>

      <View style={styles.periodSelector}>
        {(['day', 'week', 'month'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, period === p && styles.periodButtonActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={mockEarnings}
        renderItem={renderEarning}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundMuted,
  },
  summaryCard: {
    backgroundColor: Colors.primary,
    padding: 24,
    alignItems: 'center',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  summaryAmount: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  summaryStats: {
    flexDirection: 'row',
    marginTop: 16,
  },
  summaryStatItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  summaryStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  summaryStatValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  summaryStatLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: Colors.primary,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  periodTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  earningCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  earningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  earningDate: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  earningAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  earningStats: {
    flexDirection: 'row',
    gap: 20,
  },
  earningStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  earningStatText: {
    fontSize: 14,
    color: Colors.textLight,
  },
});
