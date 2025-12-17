import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MapView, MAP_PROVIDER_GOOGLE as PROVIDER_GOOGLE } from '@/components/maps/MapView';
type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
import * as Location from 'expo-location';
import { useThemeStore } from '@/stores/theme-store';
import { useBookingStore } from '@/stores/booking-store';

export default function ConfirmLocationScreen() {
  const { t } = useTranslation();
  const { type } = useLocalSearchParams<{ type?: 'pickup' | 'dropoff' }>();
  const { resolvedTheme } = useThemeStore();
  const { pickup, dropoff, setPickup, setDropoff } = useBookingStore();
  const isDark = resolvedTheme === 'dark';

  const mapRef = useRef<MapView>(null);
  const [address, setAddress] = useState('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);

  const locationType = type || 'dropoff';
  const currentLocation = locationType === 'pickup' ? pickup : dropoff;

  useEffect(() => {
    if (currentLocation) {
      setRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
      setAddress(currentLocation.address);
    }
  }, []);

  const handleRegionChangeComplete = async (newRegion: Region) => {
    setRegion(newRegion);
    setIsLoadingAddress(true);

    try {
      const [result] = await Location.reverseGeocodeAsync({
        latitude: newRegion.latitude,
        longitude: newRegion.longitude,
      });

      if (result) {
        const addressString = [
          result.street,
          result.city,
          result.region,
        ].filter(Boolean).join(', ');
        setAddress(addressString || t('home.currentLocation'));
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const handleConfirm = () => {
    if (!region) return;

    const location = {
      latitude: region.latitude,
      longitude: region.longitude,
      address,
    };

    if (locationType === 'pickup') {
      setPickup(location);
    } else {
      setDropoff(location);
    }

    // Navigate to service selection
    router.push('/(main)/select-service');
  };

  if (!region) {
    return (
      <View className={`flex-1 items-center justify-center ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={{ flex: 1 }}
        initialRegion={region}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
      />

      {/* Center Pin */}
      <View className="absolute top-0 left-0 right-0 bottom-0 items-center justify-center pointer-events-none">
        <View className="mb-10">
          <Ionicons
            name="location"
            size={48}
            color={locationType === 'pickup' ? '#4CAF50' : '#F44336'}
          />
        </View>
      </View>

      {/* Header */}
      <SafeAreaView className="absolute top-0 left-0 right-0" edges={['top']}>
        <View className="flex-row items-center px-4 py-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className={`w-12 h-12 rounded-full items-center justify-center shadow-lg ${
              isDark ? 'bg-background-dark' : 'bg-white'
            }`}
          >
            <Ionicons name="arrow-back" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
          </TouchableOpacity>
          <View className={`flex-1 mx-4 px-4 py-3 rounded-xl shadow-lg ${isDark ? 'bg-background-dark' : 'bg-white'}`}>
            <Text className={`text-center font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {locationType === 'pickup' ? t('booking.pickup') : t('booking.dropoff')}
            </Text>
          </View>
          <View className="w-12" />
        </View>
      </SafeAreaView>

      {/* Bottom Sheet */}
      <SafeAreaView
        edges={['bottom']}
        className={`absolute bottom-0 left-0 right-0 rounded-t-3xl shadow-lg ${
          isDark ? 'bg-background-dark' : 'bg-white'
        }`}
      >
        <View className="px-5 py-6">
          {/* Address Display */}
          <View className={`flex-row items-center px-4 py-4 rounded-xl ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}>
            <Ionicons
              name="location"
              size={24}
              color={locationType === 'pickup' ? '#4CAF50' : '#F44336'}
            />
            <View className="flex-1 ml-3">
              {isLoadingAddress ? (
                <ActivityIndicator size="small" color="#4CAF50" />
              ) : (
                <Text
                  className={`text-base ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}
                  numberOfLines={2}
                >
                  {address || t('common.loading')}
                </Text>
              )}
            </View>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={isLoadingAddress || !address}
            className={`mt-4 py-4 rounded-xl items-center ${
              !isLoadingAddress && address ? 'bg-primary' : 'bg-muted dark:bg-muted-dark'
            }`}
          >
            <Text
              className={`text-lg font-semibold ${
                !isLoadingAddress && address ? 'text-white' : 'text-muted-foreground'
              }`}
            >
              {t('booking.confirmLocation')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
