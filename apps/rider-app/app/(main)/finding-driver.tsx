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
  const { pickup, dropoff, selectedService, paymentMethod, setActiveOrder, resetBooking } = useBookingStore();
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
      // Map payment method to API format
      const paymentModeMap: Record<string, string> = {
        cash: 'cash',
        wallet: 'wallet',
        card: 'payment_gateway',
      };

      // Create order via API
      const response = await orderApi.createOrder({
        serviceId: selectedService.id,
        pickupAddress: pickup.address,
        pickupLatitude: pickup.latitude,
        pickupLongitude: pickup.longitude,
        dropoffAddress: dropoff.address,
        dropoffLatitude: dropoff.latitude,
        dropoffLongitude: dropoff.longitude,
        paymentMode: paymentModeMap[paymentMethod] || 'cash',
      });

      const order = response.data;
      console.log('[FindingDriver] Order created:', order.id);

      // Ensure socket is connected before joining room
      await socketService.connect();
      console.log('[FindingDriver] Socket connected, joining order room:', order.id);

      // Join order room for real-time updates
      socketService.joinOrderRoom(order.id);

      // Listen for driver acceptance
      const unsubscribe = socketService.on('order:status', async (data) => {
        console.log('[FindingDriver] Received order:status:', data);
        if (data.status === 'DriverAccepted') {
          // Build driver object with proper fallbacks
          const buildDriverObject = (driverData: any) => {
            if (!driverData) return null;
            return {
              id: String(driverData.id || ''),
              firstName: driverData.firstName || 'Driver',
              lastName: driverData.lastName || '',
              mobileNumber: driverData.mobileNumber || '',
              rating: driverData.rating || 5.0,
              reviewCount: driverData.reviewCount || 0,
              carModel: typeof driverData.carModel === 'string'
                ? driverData.carModel
                : driverData.carModel
                  ? `${driverData.carModel.brand || ''} ${driverData.carModel.model || ''}`.trim()
                  : '',
              carColor: typeof driverData.carColor === 'string'
                ? driverData.carColor
                : driverData.carColor?.name || '',
              carPlate: driverData.carPlate || '',
              latitude: driverData.latitude || pickup.latitude,
              longitude: driverData.longitude || pickup.longitude,
            };
          };

          try {
            // Fetch full order details including driver info
            const orderDetails = await orderApi.getOrderDetails(order.id);
            const fullOrder = orderDetails.data;
            console.log('[FindingDriver] Fetched order details:', fullOrder);

            // Use fetched driver data, or socket data as fallback
            const driverData = fullOrder.driver || data.driver;

            setActiveOrder({
              id: fullOrder.id?.toString() || order.id.toString(),
              status: 'DriverAccepted',
              pickup,
              dropoff,
              service: selectedService,
              fare: data.fare || parseFloat(order.serviceCost) || 15,
              driver: buildDriverObject(driverData),
              createdAt: order.createdAt || new Date().toISOString(),
            });
            router.replace('/(main)/ride-active');
          } catch (err) {
            console.error('[FindingDriver] Error fetching order details:', err);
            // Fallback with socket driver data
            setActiveOrder({
              id: data.orderId?.toString() || order.id.toString(),
              status: 'DriverAccepted',
              pickup,
              dropoff,
              service: selectedService,
              fare: data.fare || parseFloat(order.serviceCost) || 15,
              driver: buildDriverObject(data.driver) || {
                id: String(data.driverId || ''),
                firstName: 'Driver',
                lastName: '',
                mobileNumber: '',
                rating: 5.0,
                reviewCount: 0,
                carModel: '',
                carColor: '',
                carPlate: '',
                latitude: pickup.latitude,
                longitude: pickup.longitude,
              },
              createdAt: order.createdAt || new Date().toISOString(),
            });
            router.replace('/(main)/ride-active');
          }
        } else if (data.status === 'no_drivers' || data.status === 'NotFound') {
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
    const { activeOrder } = useBookingStore.getState();

    // Cancel the order in the database if we have an order ID
    if (activeOrder?.id) {
      try {
        console.log('[FindingDriver] Cancelling order:', activeOrder.id);
        await orderApi.cancelOrder(activeOrder.id);
        socketService.leaveOrderRoom(Number(activeOrder.id));
      } catch (error) {
        console.error('[FindingDriver] Error cancelling order:', error);
      }
    }

    // Reset local state
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
                  {selectedService?.name} • QAR {(selectedService as any)?.fare || '15.50'}
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
