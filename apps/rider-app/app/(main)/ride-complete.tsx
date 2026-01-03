import { View, Text, TouchableOpacity, Platform, useEffect } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MapView, MapMarker as Marker, MapPolyline as Polyline, MAP_PROVIDER_GOOGLE as PROVIDER_GOOGLE } from '@/components/maps/MapView';
import { useThemeStore } from '@/stores/theme-store';
import { useBookingStore } from '@/stores/booking-store';

export default function RideCompleteScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { activeOrder, resetBooking } = useBookingStore();
  const isDark = resolvedTheme === 'dark';

  const handleRate = () => {
    router.push('/(main)/rate-driver');
  };

  const handleDone = () => {
    resetBooking();
    router.replace('/(main)');
  };

  // Handle missing activeOrder in useEffect, not during render
  useEffect(() => {
    if (!activeOrder) {
      resetBooking();
      router.replace('/(main)');
    }
  }, [activeOrder]);

  if (!activeOrder) {
    return null;
  }

  const { pickup, dropoff, fare, service } = activeOrder;

  const fareBreakdown = [
    { label: t('ride.completed.tripFare'), amount: fare - 1.5 },
    { label: t('ride.completed.serviceFee'), amount: 1.5 },
  ];

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      {/* Header */}
      <View className="items-center py-6">
        <View className="w-20 h-20 rounded-full bg-primary items-center justify-center mb-4">
          <Ionicons name="checkmark" size={48} color="#FFFFFF" />
        </View>
        <Text className={`text-2xl font-bold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
          {t('ride.completed.title')}
        </Text>
      </View>

      {/* Mini Map */}
      <View className="h-40 mx-4 rounded-xl overflow-hidden">
        <MapView
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: (pickup.latitude + dropoff.latitude) / 2,
            longitude: (pickup.longitude + dropoff.longitude) / 2,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Marker coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}>
            <View className="w-4 h-4 rounded-full bg-primary border-2 border-white" />
          </Marker>
          <Marker coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }}>
            <View className="w-4 h-4 rounded-full bg-destructive border-2 border-white" />
          </Marker>
          <Polyline
            coordinates={[
              { latitude: pickup.latitude, longitude: pickup.longitude },
              { latitude: dropoff.latitude, longitude: dropoff.longitude },
            ]}
            strokeColor="#4CAF50"
            strokeWidth={3}
          />
        </MapView>
      </View>

      {/* Fare Breakdown */}
      <View className={`mx-4 mt-6 p-4 rounded-xl ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}>
        {fareBreakdown.map((item, index) => (
          <View
            key={index}
            className={`flex-row justify-between py-2 ${
              index > 0 ? `border-t ${isDark ? 'border-border-dark' : 'border-border'}` : ''
            }`}
          >
            <Text className="text-muted-foreground">{item.label}</Text>
            <Text className={`${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              ${item.amount.toFixed(2)}
            </Text>
          </View>
        ))}

        <View className={`flex-row justify-between pt-3 mt-2 border-t-2 ${isDark ? 'border-border-dark' : 'border-border'}`}>
          <Text className={`text-lg font-bold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
            {t('ride.completed.total')}
          </Text>
          <Text className={`text-lg font-bold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
            ${fare.toFixed(2)}
          </Text>
        </View>

        <View className="flex-row items-center mt-3">
          <Ionicons name="cash" size={20} color="#4CAF50" />
          <Text className="text-muted-foreground ml-2">
            {t('ride.completed.paidWith', { method: t('booking.payment.cash') })}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View className="flex-1 justify-end px-4 pb-4">
        <TouchableOpacity
          onPress={handleRate}
          className="bg-primary py-4 rounded-xl items-center mb-3"
        >
          <Text className="text-white text-lg font-semibold">
            {t('ride.completed.rateTrip')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDone}
          className="py-3 items-center"
        >
          <Text className="text-muted-foreground">
            {t('common.skip')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
