import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { MapView, MapMarker, MAP_PROVIDER_GOOGLE } from '@/components/maps/MapView';
import { useThemeStore } from '@/stores/theme-store';
import { useDriverStore } from '@/stores/driver-store';
import { getColors } from '@/constants/Colors';
import { ordersApi } from '@/lib/api';
import { socketService } from '@/lib/socket';

type RideStatus = 'accepted' | 'arriving' | 'arrived' | 'started' | 'completed';

export default function ActiveRideScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { activeRide, setActiveRide, currentLocation, setCurrentLocation } = useDriverStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);
  const mapRef = useRef<any>(null);

  const [status, setStatus] = useState<RideStatus>(activeRide?.status as RideStatus || 'accepted');
  const [isLoading, setIsLoading] = useState(false);

  // Join order room and listen for updates
  useEffect(() => {
    if (!activeRide) return;

    // Join the order room for real-time updates
    socketService.joinOrderRoom(activeRide.orderId);

    // Listen for order cancellation from rider
    const unsubscribeCancelled = socketService.on('order:cancelled', (data: { orderId: number; reason?: string }) => {
      if (data.orderId === activeRide.orderId) {
        Alert.alert(
          t('activeRide.rideCancelled'),
          data.reason || t('activeRide.riderCancelledRide'),
          [{ text: t('common.ok'), onPress: () => {
            setActiveRide(null);
            // No need to navigate - state change will show home screen
          }}]
        );
      }
    });

    return () => {
      unsubscribeCancelled();
      if (activeRide) {
        socketService.leaveOrderRoom(activeRide.orderId);
      }
    };
  }, [activeRide?.orderId]);

  // Continue location updates during ride
  useEffect(() => {
    const locationInterval = setInterval(async () => {
      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCurrentLocation(coords);
      socketService.updateLocation(coords.latitude, coords.longitude);
    }, 5000);

    return () => clearInterval(locationInterval);
  }, []);

  const getStatusButton = () => {
    switch (status) {
      case 'accepted':
      case 'arriving':
        return {
          text: t('activeRide.iArrived'),
          action: handleArrived,
          color: colors.primary,
        };
      case 'arrived':
        return {
          text: t('activeRide.startRide'),
          action: handleStartRide,
          color: colors.success,
        };
      case 'started':
        return {
          text: t('activeRide.completeRide'),
          action: handleCompleteRide,
          color: colors.success,
        };
      default:
        return null;
    }
  };

  const handleArrived = async () => {
    if (!activeRide) return;
    setIsLoading(true);
    try {
      await ordersApi.arrive(activeRide.orderId);
      setStatus('arrived');
      setActiveRide({ ...activeRide, status: 'arrived' });
    } catch (error) {
      console.error('Error marking arrived:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartRide = async () => {
    if (!activeRide) return;
    setIsLoading(true);
    try {
      await ordersApi.startRide(activeRide.orderId);
      setStatus('started');
      setActiveRide({ ...activeRide, status: 'started' });
    } catch (error) {
      console.error('Error starting ride:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRide = async () => {
    if (!activeRide) return;
    setIsLoading(true);
    try {
      const completedRide = { ...activeRide }; // Save ride data for summary screen
      await ordersApi.completeRide(activeRide.orderId);

      // Clear active ride state BEFORE navigating
      setActiveRide(null);

      // Navigate to completion screen (ride data passed via route or stored temporarily)
      router.replace({
        pathname: '/(main)/ride-complete',
        params: {
          orderId: completedRide.orderId,
          fare: completedRide.estimatedFare?.toString() || '0',
          distance: completedRide.distance?.toString() || '0',
          paymentMethod: completedRide.paymentMethod || 'cash',
        },
      });
    } catch (error) {
      console.error('Error completing ride:', error);
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      t('activeRide.cancelTitle'),
      t('activeRide.cancelMessage'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yes'),
          style: 'destructive',
          onPress: async () => {
            if (!activeRide) return;
            try {
              await ordersApi.cancelRide(activeRide.orderId);
              setActiveRide(null);
              // No need to navigate - state change will show home screen
            } catch (error) {
              console.error('Error cancelling ride:', error);
            }
          },
        },
      ]
    );
  };

  const handleCall = () => {
    if (activeRide?.rider?.mobileNumber) {
      Linking.openURL(`tel:${activeRide.rider.mobileNumber}`);
    }
  };

  const handleNavigate = () => {
    const destination = status === 'started' ? activeRide?.dropoff : activeRide?.pickup;
    if (destination) {
      const url = Platform.select({
        ios: `maps:0,0?q=${destination.latitude},${destination.longitude}`,
        android: `google.navigation:q=${destination.latitude},${destination.longitude}`,
      });
      if (url) Linking.openURL(url);
    }
  };

  const handleChat = () => {
    router.push('/(main)/chat');
  };

  if (!activeRide) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: colors.mutedForeground }}>{t('activeRide.noActiveRide')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const destination = status === 'started' ? activeRide.dropoff : activeRide.pickup;
  const statusButton = getStatusButton();

  return (
    <View className="flex-1">
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={MAP_PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={
          currentLocation
            ? {
                ...currentLocation,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }
            : undefined
        }
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Destination Marker */}
        {destination && (
          <MapMarker coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}>
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: status === 'started' ? colors.destructive : colors.success }}
            >
              <Ionicons name={status === 'started' ? 'flag' : 'location'} size={20} color="#fff" />
            </View>
          </MapMarker>
        )}
      </MapView>

      {/* Header */}
      <SafeAreaView className="absolute top-0 left-0 right-0" edges={['top']}>
        <View className="flex-row items-center justify-between px-4 py-2">
          <TouchableOpacity
            onPress={handleCancel}
            className="w-12 h-12 rounded-full items-center justify-center shadow-lg"
            style={{ backgroundColor: colors.background }}
          >
            <Ionicons name="close" size={24} color={colors.destructive} />
          </TouchableOpacity>

          {/* Status Badge */}
          <View
            className="px-4 py-2 rounded-full shadow-lg"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white text-sm font-medium">
              {status === 'accepted' || status === 'arriving'
                ? t('activeRide.goingToPickup')
                : status === 'arrived'
                ? t('activeRide.waitingForRider')
                : t('activeRide.onTrip')}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleNavigate}
            className="w-12 h-12 rounded-full items-center justify-center shadow-lg"
            style={{ backgroundColor: colors.background }}
          >
            <Ionicons name="navigate" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Bottom Panel */}
      <SafeAreaView
        className="absolute bottom-0 left-0 right-0"
        edges={['bottom']}
        style={{ backgroundColor: colors.background }}
      >
        <View className="p-4">
          {/* Destination Info */}
          <View className="flex-row items-start mb-4">
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{
                backgroundColor: (status === 'started' ? colors.destructive : colors.success) + '20',
              }}
            >
              <Ionicons
                name={status === 'started' ? 'flag' : 'location'}
                size={20}
                color={status === 'started' ? colors.destructive : colors.success}
              />
            </View>
            <View className="flex-1">
              <Text style={{ color: colors.mutedForeground }} className="text-xs uppercase mb-1">
                {status === 'started' ? t('activeRide.dropoff') : t('activeRide.pickup')}
              </Text>
              <Text style={{ color: colors.foreground }} className="text-base font-medium" numberOfLines={2}>
                {destination?.address}
              </Text>
            </View>
          </View>

          {/* Rider Info */}
          <View
            className="flex-row items-center justify-between p-3 rounded-xl mb-4"
            style={{ backgroundColor: colors.secondary }}
          >
            <View className="flex-row items-center flex-1">
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.muted }}
              >
                <Ionicons name="person" size={24} color={colors.mutedForeground} />
              </View>
              <View className="ml-3">
                <Text style={{ color: colors.foreground }} className="text-base font-medium">
                  {activeRide.rider ? `${activeRide.rider.firstName} ${activeRide.rider.lastName}` : 'Rider'}
                </Text>
                <View className="flex-row items-center">
                  <Ionicons name="star" size={12} color="#f59e0b" />
                  <Text style={{ color: colors.mutedForeground }} className="text-sm ml-1">
                    {activeRide.rider?.rating?.toFixed(1) || '5.0'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={handleChat}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.primary + '20' }}
              >
                <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCall}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.success + '20' }}
              >
                <Ionicons name="call-outline" size={20} color={colors.success} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Trip Info */}
          <View className="flex-row justify-between mb-4">
            <View className="items-center flex-1">
              <Text style={{ color: colors.mutedForeground }} className="text-xs mb-1">
                {t('activeRide.distance')}
              </Text>
              <Text style={{ color: colors.foreground }} className="text-lg font-bold">
                {activeRide.distance?.toFixed(1) || '--'} km
              </Text>
            </View>
            <View className="items-center flex-1 border-l border-r" style={{ borderColor: colors.border }}>
              <Text style={{ color: colors.mutedForeground }} className="text-xs mb-1">
                {t('activeRide.fare')}
              </Text>
              <Text style={{ color: colors.success }} className="text-lg font-bold">
                QAR {activeRide.estimatedFare?.toFixed(0) || '--'}
              </Text>
            </View>
            <View className="items-center flex-1">
              <Text style={{ color: colors.mutedForeground }} className="text-xs mb-1">
                {t('activeRide.payment')}
              </Text>
              <View className="flex-row items-center">
                <Ionicons
                  name={activeRide.paymentMethod === 'cash' ? 'cash-outline' : 'card-outline'}
                  size={16}
                  color={colors.foreground}
                />
                <Text style={{ color: colors.foreground }} className="text-sm ml-1">
                  {activeRide.paymentMethod === 'cash' ? t('payment.cash') : t('payment.card')}
                </Text>
              </View>
            </View>
          </View>

          {/* Status Action Button */}
          {statusButton && (
            <TouchableOpacity
              onPress={statusButton.action}
              disabled={isLoading}
              className="py-4 rounded-xl items-center"
              style={{ backgroundColor: statusButton.color }}
            >
              <Text className="text-white text-lg font-semibold">
                {isLoading ? t('common.loading') : statusButton.text}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
