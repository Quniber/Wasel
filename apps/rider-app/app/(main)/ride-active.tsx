import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, Linking, Image, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MapView, MapMarker as Marker, MapPolyline as Polyline, MAP_PROVIDER_GOOGLE as PROVIDER_GOOGLE } from '@/components/maps/MapView';
import { useThemeStore } from '@/stores/theme-store';
import { useBookingStore } from '@/stores/booking-store';
import { socketService } from '@/lib/socket';
import { orderApi } from '@/lib/api';
import { getColors } from '@/constants/Colors';

type RideStatus = 'driver_on_way' | 'driver_arrived' | 'trip_started';

export default function RideActiveScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { activeOrder, setActiveOrder, updateDriverLocation, updateOrderStatus, resetBooking, _hasHydrated } = useBookingStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const mapRef = useRef<MapView>(null);
  const [status, setStatus] = useState<RideStatus>('driver_on_way');
  const [eta, setEta] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);

  // Fetch order details from server if driver info is missing
  useEffect(() => {
    if (!_hasHydrated) return;

    if (!activeOrder) {
      router.replace('/(main)');
      return;
    }

    const fetchOrderDetails = async () => {
      // If we have driver info, we're good
      if (activeOrder.driver) {
        setIsLoading(false);
        return;
      }

      // Fetch full order details from server
      try {
        console.log('[RideActive] Fetching order details for:', activeOrder.id);
        const response = await orderApi.getOrderDetails(String(activeOrder.id));
        if (response.data) {
          const order = response.data;
          // Update the active order with full details including driver
          const driverData = order.driver;
          setActiveOrder({
            ...activeOrder,
            driver: driverData ? {
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
              latitude: driverData.latitude || activeOrder.pickup.latitude,
              longitude: driverData.longitude || activeOrder.pickup.longitude,
            } : null,
          });
        }
        setIsLoading(false);
      } catch (error) {
        console.error('[RideActive] Error fetching order details:', error);
        // If we can't fetch order, go back to home
        resetBooking();
        router.replace('/(main)');
      }
    };

    fetchOrderDetails();
  }, [activeOrder?.id, _hasHydrated]);

  // Setup socket connection and listeners
  useEffect(() => {
    if (!_hasHydrated || !activeOrder) return;

    // Ensure socket is connected and join order room
    const setupSocket = async () => {
      await socketService.connect();
      // Wait a moment for socket to fully connect
      await new Promise(resolve => setTimeout(resolve, 500));
      socketService.joinOrderRoom(activeOrder.id);
      console.log('[RideActive] Joined order room:', activeOrder.id);
      setSocketConnected(true);
    };
    setupSocket();

    // Listen for driver location updates
    const locationUnsub = socketService.on('driver:location', (data) => {
      if (data.latitude && data.longitude) {
        updateDriverLocation(data.latitude, data.longitude);
      }
    });

    // Listen for order status updates
    const statusUnsub = socketService.on('order:status', (data) => {
      console.log('[RideActive] Received order:status:', data);
      const status = data.status?.toLowerCase();
      if (status === 'driver_arrived' || status === 'arrived') {
        setStatus('driver_arrived');
      } else if (status === 'trip_started' || status === 'started') {
        setStatus('trip_started');
      } else if (status === 'trip_completed' || status === 'completed' || status === 'finished') {
        router.replace('/(main)/ride-complete');
      }
    });

    // Listen for ride cancelled event
    const cancelledUnsub = socketService.on('order:cancelled', (data) => {
      console.log('[RideActive] Order cancelled by:', data.cancelledBy);

      // Show alert to user explaining the cancellation
      const cancelledBy = data.cancelledBy === 'driver' ? t('common.driver') : t('common.rider');
      Alert.alert(
        t('ride.cancelled.title'),
        t('ride.cancelled.message', { who: cancelledBy }),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              // Reset booking and go home after user acknowledges
              resetBooking();
              if (activeOrder) {
                socketService.leaveOrderRoom(activeOrder.id);
              }
              router.replace('/(main)');
            }
          }
        ],
        { cancelable: false }
      );
    });

    return () => {
      locationUnsub?.();
      statusUnsub?.();
      cancelledUnsub?.();
      if (activeOrder) {
        socketService.leaveOrderRoom(activeOrder.id);
      }
    };
  }, [activeOrder?.id, _hasHydrated]);

  useEffect(() => {
    fitMapToRoute();
  }, [status, activeOrder?.driver?.latitude, activeOrder?.driver?.longitude]);

  const fitMapToRoute = () => {
    if (!activeOrder || !mapRef.current) return;

    const coordinates = [];
    if (activeOrder.driver) {
      coordinates.push({
        latitude: activeOrder.driver.latitude,
        longitude: activeOrder.driver.longitude,
      });
    }

    if (status === 'trip_started') {
      coordinates.push({
        latitude: activeOrder.dropoff.latitude,
        longitude: activeOrder.dropoff.longitude,
      });
    } else {
      coordinates.push({
        latitude: activeOrder.pickup.latitude,
        longitude: activeOrder.pickup.longitude,
      });
    }

    if (coordinates.length >= 2) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 250, left: 50 },
        animated: true,
      });
    }
  };

  const handleCall = () => {
    if (activeOrder?.driver?.mobileNumber) {
      Linking.openURL(`tel:${activeOrder.driver.mobileNumber}`);
    }
  };

  const handleChat = () => {
    router.push('/(main)/chat');
  };

  const handleCancel = async () => {
    if (!activeOrder?.id) return;

    // Show confirmation dialog
    Alert.alert(
      t('ride.cancel.title'),
      t('ride.cancel.confirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.ok'),
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[RideActive] Rider cancelling order:', activeOrder.id);

              // Cancel order via API - this will notify driver via socket
              await orderApi.cancelOrder(activeOrder.id);

              // Leave socket room
              socketService.leaveOrderRoom(Number(activeOrder.id));

              // Reset local state
              resetBooking();
              router.replace('/(main)');
            } catch (error) {
              console.error('[RideActive] Error cancelling order:', error);
              Alert.alert(t('common.error'), t('errors.generic'));
            }
          },
        },
      ]
    );
  };

  // Show loading while hydrating, fetching order details, or if no active order
  if (!_hasHydrated || isLoading || !activeOrder || !activeOrder.driver) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.mutedForeground }} className="mt-4">
          {t('common.loading')}
        </Text>
      </SafeAreaView>
    );
  }

  const { pickup, dropoff } = activeOrder;
  // Ensure driver has all required fields with defaults (spread first, then override with fallbacks)
  const rawDriver = activeOrder.driver || {};
  const driver = {
    ...rawDriver,
    firstName: rawDriver.firstName || 'Driver',
    lastName: rawDriver.lastName || '',
    rating: rawDriver.rating || 5.0,
    carModel: rawDriver.carModel || '',
    carColor: rawDriver.carColor || '',
    carPlate: rawDriver.carPlate || '',
    mobileNumber: rawDriver.mobileNumber || '',
    latitude: rawDriver.latitude || pickup?.latitude || 0,
    longitude: rawDriver.longitude || pickup?.longitude || 0,
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'driver_on_way':
        return t('ride.driverAccepted.title');
      case 'driver_arrived':
        return t('ride.driverArrived.title');
      case 'trip_started':
        return t('ride.inProgress.title');
      default:
        return '';
    }
  };

  const destination = status === 'trip_started' ? dropoff : pickup;

  return (
    <View className="flex-1">
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: driver.latitude,
          longitude: driver.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        {/* Driver Marker */}
        <Marker
          coordinate={{ latitude: driver.latitude, longitude: driver.longitude }}
          title={`${driver.firstName} ${driver.lastName}`}
        >
          <View className="w-10 h-10 rounded-full bg-primary items-center justify-center border-3 border-white">
            <Ionicons name="car" size={20} color="#FFFFFF" />
          </View>
        </Marker>

        {/* Pickup Marker */}
        {status !== 'trip_started' && (
          <Marker coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}>
            <View className="w-6 h-6 rounded-full bg-primary border-2 border-white" />
          </Marker>
        )}

        {/* Dropoff Marker */}
        <Marker coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }}>
          <View className="w-6 h-6 rounded-full bg-destructive border-2 border-white" />
        </Marker>

        {/* Route Line */}
        <Polyline
          coordinates={[
            { latitude: driver.latitude, longitude: driver.longitude },
            { latitude: destination.latitude, longitude: destination.longitude },
          ]}
          strokeColor="#4CAF50"
          strokeWidth={4}
        />
      </MapView>

      {/* Header */}
      <SafeAreaView className="absolute top-0 left-0 right-0 items-center" edges={['top']}>
        <View className={`mx-4 mt-4 px-6 py-3 rounded-full shadow-lg ${isDark ? 'bg-background-dark' : 'bg-white'}`}>
          <Text className={`text-lg font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
            {getStatusTitle()}
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
        <View className="px-6 py-5">
          {/* Driver Info */}
          <View className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}>
            <View className="flex-row items-center">
              <View className="w-14 h-14 rounded-full bg-primary items-center justify-center">
                <Text className="text-white text-xl font-bold">
                  {driver.firstName?.[0] || ''}{driver.lastName?.[0] || ''}
                </Text>
              </View>
              <View className="flex-1 ml-3">
                <Text className={`text-lg font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                  {driver.firstName} {driver.lastName}
                </Text>
                <View className="flex-row items-center">
                  <Ionicons name="star" size={16} color="#FFB300" />
                  <Text className="text-muted-foreground ml-1">{driver.rating}</Text>
                </View>
              </View>
              <View className="items-end">
                {status === 'driver_on_way' && (
                  <Text className="text-primary font-semibold">
                    {t('ride.driverAccepted.arriving', { minutes: eta })}
                  </Text>
                )}
              </View>
            </View>

            {/* Car Info */}
            <View className={`flex-row items-center mt-3 pt-3 border-t ${isDark ? 'border-border-dark' : 'border-border'}`}>
              <Ionicons name="car" size={20} color={isDark ? '#FAFAFA' : '#212121'} />
              <Text className={`ml-2 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {driver.carModel} • {driver.carColor}
              </Text>
              <View className="flex-1" />
              <View className="px-3 py-1 rounded-lg bg-primary/10">
                <Text className="text-primary font-bold">{driver.carPlate}</Text>
              </View>
            </View>
          </View>

          {/* Status Message */}
          {status === 'driver_arrived' && (
            <View className={`p-4 rounded-xl mb-4 bg-primary/10`}>
              <Text className="text-primary font-semibold text-center">
                {t('ride.driverArrived.lookFor')} {driver.carColor} {driver.carModel}
              </Text>
            </View>
          )}

          {status === 'trip_started' && (
            <View className="flex-row justify-around mb-4">
              <View className="items-center">
                <Text className="text-muted-foreground text-sm">{t('ride.inProgress.remaining', { minutes: 12 })}</Text>
              </View>
              <View className="items-center">
                <Text className="text-muted-foreground text-sm">{t('ride.inProgress.distance', { km: 4.5 })}</Text>
              </View>
            </View>
          )}

          {/* Destination */}
          {status === 'trip_started' && (
            <View className={`flex-row items-center p-3 rounded-xl mb-4 ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}>
              <View className="w-3 h-3 rounded-full bg-destructive" />
              <Text className={`ml-3 flex-1 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`} numberOfLines={1}>
                {dropoff.address}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleCall}
              className={`flex-1 flex-row items-center justify-center py-4 rounded-xl ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}
            >
              <Ionicons name="call" size={20} color="#4CAF50" />
              <Text className="text-primary font-semibold ml-2">{t('ride.call')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleChat}
              className={`flex-1 flex-row items-center justify-center py-4 rounded-xl ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}
            >
              <Ionicons name="chatbubble" size={20} color="#4CAF50" />
              <Text className="text-primary font-semibold ml-2">{t('ride.chat')}</Text>
            </TouchableOpacity>
          </View>

          {/* Cancel Button (only before trip starts) */}
          {status !== 'trip_started' && (
            <TouchableOpacity
              onPress={handleCancel}
              className="mt-4 py-3 items-center"
            >
              <Text className="text-destructive font-medium">
                {t('ride.cancel.title')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
