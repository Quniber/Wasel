import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, Animated, Easing } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MapView, MapMarker as Marker, MAP_PROVIDER_GOOGLE as PROVIDER_GOOGLE } from '@/components/maps/MapView';
const Circle = ({ center, radius, ...props }: any) => null; // Web placeholder
import { useThemeStore } from '@/stores/theme-store';
import { useBookingStore } from '@/stores/booking-store';
import { orderApi } from '@/lib/api';
import { socketService } from '@/lib/socket';

export default function FindingDriverScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { pickup, dropoff, selectedService, setActiveOrder, resetBooking } = useBookingStore();
  const isDark = resolvedTheme === 'dark';

  const mapRef = useRef<MapView>(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [status, setStatus] = useState<'searching' | 'not_found'>('searching');
  const [searchRadius, setSearchRadius] = useState(500);

  useEffect(() => {
    startPulseAnimation();
    createOrder();

    return () => {
      // Cleanup
    };
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const createOrder = async () => {
    if (!pickup || !dropoff || !selectedService) return;

    try {
      // Create order via API
      const response = await orderApi.createOrder({
        serviceId: selectedService.id,
        pickupAddress: pickup.address,
        pickupLatitude: pickup.latitude,
        pickupLongitude: pickup.longitude,
        dropoffAddress: dropoff.address,
        dropoffLatitude: dropoff.latitude,
        dropoffLongitude: dropoff.longitude,
      });

      const order = response.data;

      // Join order room for real-time updates
      socketService.joinOrderRoom(order.id);

      // Listen for driver acceptance
      const unsubscribe = socketService.on('order:status', (data) => {
        console.log('[FindingDriver] Received order:status:', data);
        if (data.status === 'DriverAccepted' && data.driver) {
          setActiveOrder({
            id: data.orderId || order.id,
            status: 'DriverAccepted',
            pickup,
            dropoff,
            service: selectedService,
            fare: data.fare || parseFloat(order.fare) || 15,
            driver: data.driver,
            createdAt: order.createdAt || new Date().toISOString(),
          });
          router.replace('/(main)/ride-active');
        } else if (data.status === 'no_drivers') {
          setStatus('not_found');
        }
      });

      // Set initial active order with pending status
      setActiveOrder({
        id: order.id.toString(),
        status: 'searching',
        pickup,
        dropoff,
        service: selectedService,
        fare: parseFloat(order.fare) || 15,
        driver: null,
        createdAt: order.createdAt || new Date().toISOString(),
      });

      // Timeout after 60 seconds if no driver found
      const timeout = setTimeout(() => {
        setStatus('not_found');
      }, 60000);

      return () => {
        unsubscribe?.();
        clearTimeout(timeout);
      };
    } catch (error) {
      console.error('Error creating order:', error);
      setStatus('not_found');
    }
  };

  const handleCancel = async () => {
    // Cancel the order
    resetBooking();
    router.replace('/(main)');
  };

  const handleRetry = () => {
    setStatus('searching');
    setSearchRadius(searchRadius + 500);
    createOrder();
  };

  if (!pickup) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
        <Text className="text-muted-foreground">{t('errors.generic')}</Text>
      </SafeAreaView>
    );
  }

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  });

  return (
    <View className="flex-1">
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: pickup.latitude,
          longitude: pickup.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation
      >
        <Circle
          center={{ latitude: pickup.latitude, longitude: pickup.longitude }}
          radius={searchRadius}
          fillColor="rgba(76, 175, 80, 0.1)"
          strokeColor="rgba(76, 175, 80, 0.3)"
          strokeWidth={1}
        />
        <Marker coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}>
          <View className="items-center">
            <View className="w-6 h-6 rounded-full bg-primary border-3 border-white" />
          </View>
        </Marker>
      </MapView>

      {/* Header */}
      <SafeAreaView className="absolute top-0 left-0 right-0 items-center" edges={['top']}>
        <View className={`mx-4 mt-4 px-6 py-3 rounded-full shadow-lg ${isDark ? 'bg-background-dark' : 'bg-white'}`}>
          <Text className={`text-lg font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
            {t('ride.findingDriver')}
          </Text>
        </View>
      </SafeAreaView>

      {/* Bottom Sheet */}
      <SafeAreaView
        edges={['bottom']}
        className={`absolute bottom-0 left-0 right-0 rounded-t-3xl shadow-lg ${
          isDark ? 'bg-background-dark' : 'bg-white'
        }`}
      >
        <View className="px-6 py-6 items-center">
          {status === 'searching' ? (
            <>
              {/* Pulse Animation */}
              <View className="items-center mb-6">
                <Animated.View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: '#4CAF50',
                    opacity: pulseOpacity,
                    transform: [{ scale: pulseScale }],
                    position: 'absolute',
                  }}
                />
                <View className="w-20 h-20 rounded-full bg-primary items-center justify-center">
                  <Ionicons name="search" size={36} color="#FFFFFF" />
                </View>
              </View>

              <Text className={`text-lg font-semibold mb-2 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {t('ride.lookingForDriver')}
              </Text>

              {/* Trip Summary */}
              <View className={`w-full p-4 rounded-xl mt-4 ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}>
                <Text className="text-primary font-semibold">
                  {selectedService?.name} • ${(selectedService as any)?.fare || '15.50'}
                </Text>
                <View className="flex-row items-center mt-2">
                  <View className="w-2 h-2 rounded-full bg-primary" />
                  <Text className="text-sm text-muted-foreground ml-2 flex-1" numberOfLines={1}>
                    {pickup.address}
                  </Text>
                </View>
                <View className="flex-row items-center mt-1">
                  <View className="w-2 h-2 rounded-full bg-destructive" />
                  <Text className="text-sm text-muted-foreground ml-2 flex-1" numberOfLines={1}>
                    {dropoff?.address}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleCancel}
                className="w-full mt-6 py-4 rounded-xl items-center border-2 border-destructive"
              >
                <Text className="text-destructive text-lg font-semibold">
                  {t('ride.cancelSearch')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View className="w-20 h-20 rounded-full bg-destructive/10 items-center justify-center mb-4">
                <Ionicons name="car" size={40} color="#F44336" />
              </View>

              <Text className={`text-lg font-semibold mb-2 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {t('ride.noDrivers')}
              </Text>
              <Text className="text-muted-foreground text-center mb-6">
                {t('errors.noDrivers')}
              </Text>

              <TouchableOpacity
                onPress={handleRetry}
                className="w-full py-4 rounded-xl items-center bg-primary mb-3"
              >
                <Text className="text-white text-lg font-semibold">
                  {t('ride.tryAgain')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleCancel}>
                <Text className="text-muted-foreground">
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
