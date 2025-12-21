import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { getColors } from '@/constants/Colors';
import { ordersApi } from '@/lib/api';

interface RideHistory {
  id: string;
  pickup: { address: string };
  dropoff: { address: string };
  fare: number;
  distance: number;
  status: string;
  createdAt: string;
  rider: { name: string };
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [rides, setRides] = useState<RideHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async (pageNum = 1) => {
    if (pageNum === 1) setIsLoading(true);
    try {
      const response = await ordersApi.getHistory(pageNum);
      const newRides = response.data.data || response.data;
      if (pageNum === 1) {
        setRides(newRides);
      } else {
        setRides((prev) => [...prev, ...newRides]);
      }
      setHasMore(newRides.length >= 10);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchHistory(page + 1);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'cancelled':
        return colors.destructive;
      default:
        return colors.mutedForeground;
    }
  };

  const renderItem = ({ item }: { item: RideHistory }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(main)/history/${item.id}` as any)}
      className="mx-4 mb-3 p-4 rounded-xl"
      style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View
            className="w-8 h-8 rounded-full items-center justify-center mr-2"
            style={{ backgroundColor: colors.secondary }}
          >
            <Ionicons name="car" size={16} color={colors.foreground} />
          </View>
          <View>
            <Text style={{ color: colors.foreground }} className="text-base font-medium">
              {item.rider?.name || 'Rider'}
            </Text>
            <Text style={{ color: colors.mutedForeground }} className="text-xs">
              {new Date(item.createdAt).toLocaleDateString('en', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text style={{ color: colors.success }} className="text-lg font-bold">
            QAR {item.fare?.toFixed(0) || '0'}
          </Text>
          <View className="flex-row items-center">
            <View
              className="w-2 h-2 rounded-full mr-1"
              style={{ backgroundColor: getStatusColor(item.status) }}
            />
            <Text style={{ color: getStatusColor(item.status) }} className="text-xs capitalize">
              {t(`history.status.${item.status}`)}
            </Text>
          </View>
        </View>
      </View>

      {/* Locations */}
      <View className="flex-row items-start">
        <View className="items-center mr-3">
          <View className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.success }} />
          <View className="w-0.5 h-6" style={{ backgroundColor: colors.border }} />
          <View className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.destructive }} />
        </View>
        <View className="flex-1">
          <Text style={{ color: colors.foreground }} className="text-sm mb-2" numberOfLines={1}>
            {item.pickup?.address}
          </Text>
          <Text style={{ color: colors.foreground }} className="text-sm" numberOfLines={1}>
            {item.dropoff?.address}
          </Text>
        </View>
      </View>

      {/* Distance */}
      <View className="flex-row items-center mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
        <Ionicons name="navigate-outline" size={14} color={colors.mutedForeground} />
        <Text style={{ color: colors.mutedForeground }} className="text-sm ml-1">
          {item.distance?.toFixed(1) || '--'} km
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.secondary }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ color: colors.foreground }} className="text-xl font-bold ml-4">
          {t('history.title')}
        </Text>
      </View>

      {isLoading && rides.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : rides.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="time-outline" size={64} color={colors.muted} />
          <Text style={{ color: colors.foreground }} className="text-xl font-semibold mt-4">
            {t('history.noRides')}
          </Text>
          <Text style={{ color: colors.mutedForeground }} className="text-base text-center mt-2">
            {t('history.noRidesSubtitle')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rides}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoading ? (
              <View className="py-4">
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
