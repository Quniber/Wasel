import { View, Text, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MapView, MapMarker as Marker, MapPolyline as Polyline, MAP_PROVIDER_GOOGLE as PROVIDER_GOOGLE } from '@/components/maps/MapView';
import { useThemeStore } from '@/stores/theme-store';

// Mock data - in real app, fetch from API based on ID
const mockRideDetails = {
  id: '1',
  date: 'December 15, 2025',
  time: '2:30 PM',
  pickup: {
    address: '123 Main Street, Downtown',
    latitude: 30.0444,
    longitude: 31.2357,
  },
  dropoff: {
    address: '456 Oak Avenue, Business District',
    latitude: 30.0500,
    longitude: 31.2400,
  },
  driver: {
    name: 'Ahmed Mohamed',
    rating: 4.8,
    carModel: 'Toyota Camry',
    carColor: 'White',
    carPlate: 'ABC 123',
  },
  service: 'Economy',
  fare: {
    tripFare: 11.00,
    serviceFee: 1.50,
    discount: 0,
    total: 12.50,
  },
  paymentMethod: 'Cash',
  status: 'completed' as const,
  rating: 5,
  duration: '18 min',
  distance: '5.2 km',
};

export default function RideDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  // In real app, fetch ride details based on ID
  const ride = mockRideDetails;

  const handleReportIssue = () => {
    router.push('/(main)/support');
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
        </TouchableOpacity>
        <Text className={`flex-1 text-xl font-semibold text-center mr-10 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
          {t('history.details.title')}
        </Text>
      </View>

      <ScrollView className="flex-1">
        {/* Mini Map */}
        <View className="h-48 mx-4 rounded-xl overflow-hidden">
          <MapView
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            style={{ flex: 1 }}
            initialRegion={{
              latitude: (ride.pickup.latitude + ride.dropoff.latitude) / 2,
              longitude: (ride.pickup.longitude + ride.dropoff.longitude) / 2,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <Marker coordinate={{ latitude: ride.pickup.latitude, longitude: ride.pickup.longitude }}>
              <View className="w-4 h-4 rounded-full bg-primary border-2 border-white" />
            </Marker>
            <Marker coordinate={{ latitude: ride.dropoff.latitude, longitude: ride.dropoff.longitude }}>
              <View className="w-4 h-4 rounded-full bg-destructive border-2 border-white" />
            </Marker>
            <Polyline
              coordinates={[
                { latitude: ride.pickup.latitude, longitude: ride.pickup.longitude },
                { latitude: ride.dropoff.latitude, longitude: ride.dropoff.longitude },
              ]}
              strokeColor="#4CAF50"
              strokeWidth={3}
            />
          </MapView>
        </View>

        {/* Status Badge */}
        <View className="items-center mt-4">
          <View className={`px-4 py-2 rounded-full ${ride.status === 'completed' ? 'bg-primary/10' : 'bg-destructive/10'}`}>
            <Text className={`font-semibold ${ride.status === 'completed' ? 'text-primary' : 'text-destructive'}`}>
              {ride.status === 'completed' ? t('history.completed') : t('history.cancelled')}
            </Text>
          </View>
        </View>

        {/* Date & Time */}
        <View className="items-center mt-2">
          <Text className="text-muted-foreground">
            {ride.date} • {ride.time}
          </Text>
        </View>

        {/* Route */}
        <View className={`mx-4 mt-4 p-4 rounded-xl ${isDark ? 'bg-card-dark' : 'bg-card'}`}>
          <View className="flex-row items-start mb-3">
            <View className="w-3 h-3 rounded-full bg-primary mt-1" />
            <View className="flex-1 ml-3">
              <Text className="text-muted-foreground text-xs">{t('history.details.pickup')}</Text>
              <Text className={`${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {ride.pickup.address}
              </Text>
            </View>
          </View>
          <View className="flex-row items-start">
            <View className="w-3 h-3 rounded-full bg-destructive mt-1" />
            <View className="flex-1 ml-3">
              <Text className="text-muted-foreground text-xs">{t('history.details.dropoff')}</Text>
              <Text className={`${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {ride.dropoff.address}
              </Text>
            </View>
          </View>
        </View>

        {/* Trip Stats */}
        <View className="flex-row mx-4 mt-4 gap-3">
          <View className={`flex-1 p-4 rounded-xl items-center ${isDark ? 'bg-card-dark' : 'bg-card'}`}>
            <Ionicons name="time" size={24} color="#4CAF50" />
            <Text className="text-muted-foreground text-sm mt-1">{t('history.details.duration')}</Text>
            <Text className={`font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {ride.duration}
            </Text>
          </View>
          <View className={`flex-1 p-4 rounded-xl items-center ${isDark ? 'bg-card-dark' : 'bg-card'}`}>
            <Ionicons name="speedometer" size={24} color="#4CAF50" />
            <Text className="text-muted-foreground text-sm mt-1">{t('history.details.distance')}</Text>
            <Text className={`font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {ride.distance}
            </Text>
          </View>
        </View>

        {/* Driver Info */}
        <View className={`mx-4 mt-4 p-4 rounded-xl ${isDark ? 'bg-card-dark' : 'bg-card'}`}>
          <Text className="text-muted-foreground text-xs mb-3">{t('history.details.driver')}</Text>
          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-full bg-primary items-center justify-center">
              <Text className="text-white font-bold">{ride.driver.name.split(' ').map(n => n[0]).join('')}</Text>
            </View>
            <View className="flex-1 ml-3">
              <Text className={`font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {ride.driver.name}
              </Text>
              <View className="flex-row items-center mt-1">
                <Ionicons name="star" size={14} color="#FFB300" />
                <Text className="text-muted-foreground ml-1">{ride.driver.rating}</Text>
              </View>
            </View>
            {ride.rating && (
              <View className="items-end">
                <Text className="text-muted-foreground text-xs">{t('history.details.yourRating')}</Text>
                <View className="flex-row items-center">
                  <Ionicons name="star" size={16} color="#FFB300" />
                  <Text className={`ml-1 font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                    {ride.rating}
                  </Text>
                </View>
              </View>
            )}
          </View>
          <View className={`flex-row items-center mt-3 pt-3 border-t ${isDark ? 'border-border-dark' : 'border-border'}`}>
            <Ionicons name="car" size={16} color={isDark ? '#FAFAFA' : '#212121'} />
            <Text className={`ml-2 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {ride.driver.carColor} {ride.driver.carModel}
            </Text>
            <View className="flex-1" />
            <View className="px-2 py-1 rounded bg-primary/10">
              <Text className="text-primary font-medium">{ride.driver.carPlate}</Text>
            </View>
          </View>
        </View>

        {/* Fare Breakdown */}
        <View className={`mx-4 mt-4 p-4 rounded-xl ${isDark ? 'bg-card-dark' : 'bg-card'}`}>
          <Text className="text-muted-foreground text-xs mb-3">{t('history.details.fareBreakdown')}</Text>
          <View className="flex-row justify-between py-2">
            <Text className="text-muted-foreground">{ride.service}</Text>
            <Text className={`${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              ${ride.fare.tripFare.toFixed(2)}
            </Text>
          </View>
          <View className={`flex-row justify-between py-2 border-t ${isDark ? 'border-border-dark' : 'border-border'}`}>
            <Text className="text-muted-foreground">{t('history.details.serviceFee')}</Text>
            <Text className={`${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              ${ride.fare.serviceFee.toFixed(2)}
            </Text>
          </View>
          {ride.fare.discount > 0 && (
            <View className={`flex-row justify-between py-2 border-t ${isDark ? 'border-border-dark' : 'border-border'}`}>
              <Text className="text-primary">{t('history.details.discount')}</Text>
              <Text className="text-primary">-${ride.fare.discount.toFixed(2)}</Text>
            </View>
          )}
          <View className={`flex-row justify-between pt-3 mt-2 border-t-2 ${isDark ? 'border-border-dark' : 'border-border'}`}>
            <Text className={`font-bold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {t('history.details.total')}
            </Text>
            <Text className={`font-bold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              ${ride.fare.total.toFixed(2)}
            </Text>
          </View>
          <View className="flex-row items-center mt-3">
            <Ionicons name="cash" size={16} color="#4CAF50" />
            <Text className="text-muted-foreground ml-2">
              {t('history.details.paidWith', { method: ride.paymentMethod })}
            </Text>
          </View>
        </View>

        {/* Report Issue Button */}
        <TouchableOpacity
          onPress={handleReportIssue}
          className={`mx-4 mt-4 mb-8 p-4 rounded-xl flex-row items-center justify-center ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}
        >
          <Ionicons name="flag" size={20} color="#EF5350" />
          <Text className="text-destructive font-medium ml-2">{t('history.details.reportIssue')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
