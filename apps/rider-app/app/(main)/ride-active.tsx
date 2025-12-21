import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, Linking, Image } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MapView, MapMarker as Marker, MapPolyline as Polyline, MAP_PROVIDER_GOOGLE as PROVIDER_GOOGLE } from '@/components/maps/MapView';
import { useThemeStore } from '@/stores/theme-store';
import { useBookingStore } from '@/stores/booking-store';
import { socketService } from '@/lib/socket';

type RideStatus = 'driver_on_way' | 'driver_arrived' | 'trip_started';

export default function RideActiveScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { activeOrder, updateDriverLocation, updateOrderStatus, resetBooking } = useBookingStore();
  const isDark = resolvedTheme === 'dark';

  const mapRef = useRef<MapView>(null);
  const [status, setStatus] = useState<RideStatus>('driver_on_way');
  const [eta, setEta] = useState(5);

  useEffect(() => {
    if (!activeOrder) {
      router.replace('/(main)');
      return;
    }

    // Join order room for real-time updates
    socketService.joinOrderRoom(activeOrder.orderId);

    // Listen for driver location updates
    const locationUnsub = socketService.on('location:driver', (data) => {
      if (data.location) {
        updateDriverLocation(data.location.latitude, data.location.longitude);
      } else if (data.latitude && data.longitude) {
        updateDriverLocation(data.latitude, data.longitude);
      }
    });

    // Also listen for driver:location event
    const locationUnsub2 = socketService.on('driver:location', (data) => {
      if (data.latitude && data.longitude) {
        updateDriverLocation(data.latitude, data.longitude);
      }
    });

    // Listen for order status updates
    const statusUnsub = socketService.on('order:status', (data) => {
      if (data.status === 'driver_arrived' || data.status === 'arrived') {
        setStatus('driver_arrived');
      } else if (data.status === 'trip_started' || data.status === 'started') {
        setStatus('trip_started');
      } else if (data.status === 'trip_completed' || data.status === 'completed') {
        router.replace('/(main)/ride-complete');
      }
    });

    // Listen for driver arrived event
    const arrivedUnsub = socketService.on('order:driver_arrived', () => {
      setStatus('driver_arrived');
    });

    // Listen for ride started event
    const startedUnsub = socketService.on('order:started', () => {
      setStatus('trip_started');
    });

    // Listen for ride completed event
    const completedUnsub = socketService.on('order:completed', () => {
      router.replace('/(main)/ride-complete');
    });

    // Listen for ride cancelled event
    const cancelledUnsub = socketService.on('order:cancelled', (data) => {
      if (data.cancelledBy === 'driver') {
        // TODO: Show alert that driver cancelled
        resetBooking();
        router.replace('/(main)');
      }
    });

    return () => {
      locationUnsub?.();
      locationUnsub2?.();
      statusUnsub?.();
      arrivedUnsub?.();
      startedUnsub?.();
      completedUnsub?.();
      cancelledUnsub?.();
      if (activeOrder) {
        socketService.leaveOrderRoom(activeOrder.orderId);
      }
    };
  }, [activeOrder?.orderId]);

  useEffect(() => {
    fitMapToRoute();
  }, [status, activeOrder?.driver]);

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

  const handleCancel = () => {
    // TODO: Show confirmation dialog and cancel via API
    resetBooking();
    router.replace('/(main)');
  };

  if (!activeOrder || !activeOrder.driver) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
        <Text className="text-muted-foreground">{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  const { driver, pickup, dropoff } = activeOrder;

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
                  {driver.firstName[0]}{driver.lastName[0]}
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
