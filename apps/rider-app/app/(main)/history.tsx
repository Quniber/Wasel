import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { orderApi } from '@/lib/api';

interface RideHistoryItem {
  id: string;
  date: string;
  time: string;
  pickup: string;
  dropoff: string;
  service: string;
  fare: number;
  status: 'completed' | 'cancelled';
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rides, setRides] = useState<RideHistoryItem[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await orderApi.getOrderHistory();
      const orders = response.data.orders || [];

      // Transform API data to display format
      const transformedRides = orders.map((order: any) => ({
        id: order.id.toString(),
        date: new Date(order.createdAt).toLocaleDateString(),
        time: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pickup: order.pickupAddress || 'Unknown',
        dropoff: order.dropoffAddress || 'Unknown',
        service: order.service?.name || 'Standard',
        fare: parseFloat(order.fare) || 0,
        status: order.status === 'completed' ? 'completed' : 'cancelled',
      }));

      setRides(transformedRides);
    } catch (error) {
      console.error('Error loading history:', error);
      setRides([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadHistory();
    setIsRefreshing(false);
  };

  const renderRideItem = ({ item }: { item: RideHistoryItem }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(main)/history/${item.id}` as any)}
      className={`mx-4 mb-3 p-4 rounded-xl ${isDark ? 'bg-card-dark' : 'bg-card'} shadow-sm`}
    >
      <View className="flex-row justify-between mb-2">
        <Text className="text-muted-foreground text-sm">
          {item.date} • {item.time}
        </Text>
        <View className={`px-2 py-0.5 rounded ${item.status === 'completed' ? 'bg-primary/10' : 'bg-destructive/10'}`}>
          <Text className={`text-xs font-medium ${item.status === 'completed' ? 'text-primary' : 'text-destructive'}`}>
            {item.status === 'completed' ? t('history.completed') : t('history.cancelled')}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center mb-1">
        <View className="w-2 h-2 rounded-full bg-primary mr-2" />
        <Text className={`flex-1 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`} numberOfLines={1}>
          {item.pickup}
        </Text>
      </View>
      <View className="flex-row items-center">
        <View className="w-2 h-2 rounded-full bg-destructive mr-2" />
        <Text className={`flex-1 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`} numberOfLines={1}>
          {item.dropoff}
        </Text>
      </View>

      <View className="flex-row justify-between mt-3 pt-3 border-t border-border dark:border-border-dark">
        <Text className="text-muted-foreground">{item.service}</Text>
        <Text className={`font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
          QAR {item.fare.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
        </TouchableOpacity>
        <Text className={`flex-1 text-xl font-semibold text-center mr-10 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
          {t('history.title')}
        </Text>
      </View>

      {/* Rides List */}
      <FlatList
        data={rides}
        renderItem={renderRideItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 8 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#4CAF50" />
        }
        ListEmptyComponent={() => (
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="car" size={64} color={isDark ? '#333' : '#E0E0E0'} />
            <Text className={`text-lg font-semibold mt-4 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {t('history.empty')}
            </Text>
            <Text className="text-muted-foreground mt-2">{t('history.emptySubtitle')}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
