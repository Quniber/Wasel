import { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';

interface ScheduledRide {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  pickup: string;
  dropoff: string;
  service: string;
  estimatedFare: number;
}

export default function ScheduledRidesScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rides, setRides] = useState<ScheduledRide[]>([
    {
      id: '1',
      scheduledDate: 'Dec 20, 2025',
      scheduledTime: '10:30 AM',
      pickup: 'Home',
      dropoff: 'Airport',
      service: 'Economy',
      estimatedFare: 35.00,
    },
    {
      id: '2',
      scheduledDate: 'Dec 25, 2025',
      scheduledTime: '8:00 AM',
      pickup: '123 Main Street',
      dropoff: 'Downtown Mall',
      service: 'Premium',
      estimatedFare: 25.00,
    },
  ]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    // Fetch scheduled rides from API
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleCancel = (id: string) => {
    Alert.alert(
      t('scheduled.cancelTitle'),
      t('scheduled.cancelConfirm'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yes'),
          style: 'destructive',
          onPress: () => {
            setRides(rides.filter((r) => r.id !== id));
          },
        },
      ]
    );
  };

  const renderRideItem = ({ item }: { item: ScheduledRide }) => (
    <View className={`mx-4 mb-3 p-4 rounded-xl ${isDark ? 'bg-card-dark' : 'bg-card'} shadow-sm`}>
      {/* Date & Time */}
      <View className="flex-row items-center mb-3">
        <Ionicons name="calendar" size={20} color="#4CAF50" />
        <Text className={`ml-2 font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
          {item.scheduledDate}
        </Text>
        <View className="w-1 h-1 rounded-full bg-muted-foreground mx-2" />
        <Ionicons name="time" size={20} color="#4CAF50" />
        <Text className={`ml-2 font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
          {item.scheduledTime}
        </Text>
      </View>

      {/* Route */}
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

      {/* Service & Fare */}
      <View className={`flex-row justify-between mt-3 pt-3 border-t ${isDark ? 'border-border-dark' : 'border-border'}`}>
        <Text className="text-muted-foreground">{item.service}</Text>
        <Text className={`font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
          ~${item.estimatedFare.toFixed(2)}
        </Text>
      </View>

      {/* Cancel Button */}
      <TouchableOpacity
        onPress={() => handleCancel(item.id)}
        className={`mt-3 py-2 rounded-lg items-center ${isDark ? 'bg-destructive/10' : 'bg-destructive/10'}`}
      >
        <Text className="text-destructive font-medium">{t('scheduled.cancel')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
        </TouchableOpacity>
        <Text className={`flex-1 text-xl font-semibold text-center mr-10 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
          {t('scheduled.title')}
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
            <Ionicons name="calendar-outline" size={64} color={isDark ? '#333' : '#E0E0E0'} />
            <Text className={`text-lg font-semibold mt-4 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {t('scheduled.empty')}
            </Text>
            <Text className="text-muted-foreground mt-2 text-center px-8">
              {t('scheduled.emptySubtitle')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(main)')}
              className="mt-6 bg-primary px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">{t('scheduled.bookNow')}</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
