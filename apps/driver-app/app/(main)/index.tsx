import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { MapView, MapMarker, MAP_PROVIDER_GOOGLE } from '@/components/maps/MapView';
import { useThemeStore } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import { useDriverStore } from '@/stores/driver-store';
import { getColors } from '@/constants/Colors';
import { socketService, IncomingOrder } from '@/lib/socket';
import { driverApi } from '@/lib/api';
import ActiveRideScreen from './active-ride';

export default function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { resolvedTheme } = useThemeStore();
  const { user } = useAuthStore();
  const {
    isOnline,
    setOnline,
    currentLocation,
    setCurrentLocation,
    todayStats,
    updateStats,
    setIncomingOrder,
    incomingOrder,
    activeRide
  } = useDriverStore();

  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);
  const mapRef = useRef<any>(null);

  // Request location permissions and get current location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', t('errors.locationPermission'));
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  // Listen for incoming orders
  useEffect(() => {
    const unsubscribe = socketService.on('order:new', (order: IncomingOrder) => {
      console.log('[Home] Received new order:', order.orderId);
      console.log('[Home] Order details:', JSON.stringify(order));
      setIncomingOrder(order);
      router.push('/(main)/incoming-order');
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Start/stop location updates when online status changes
  useEffect(() => {
    if (isOnline) {
      // Start location updates
      socketService.startLocationUpdates(async () => {
        const location = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setCurrentLocation(coords);
        return coords;
      }, 5000);

      // Notify server with current location
      socketService.goOnline(currentLocation || undefined);

      // Send initial location update immediately
      if (currentLocation) {
        socketService.updateLocation(currentLocation.latitude, currentLocation.longitude);
      }
    } else {
      socketService.stopLocationUpdates();
      socketService.goOffline();
    }

    return () => {
      socketService.stopLocationUpdates();
    };
  }, [isOnline]);

  // If there's an active ride, show the active ride screen
  if (activeRide) {
    return <ActiveRideScreen />;
  }

  const handleToggleOnline = async () => {
    if (!currentLocation) {
      Alert.alert('Error', t('errors.locationRequired'));
      return;
    }

    try {
      if (!isOnline) {
        await driverApi.goOnline();
      } else {
        await driverApi.goOffline();
      }
      setOnline(!isOnline);
    } catch (error: any) {
      console.error('Error toggling online status:', error);
      const message = error?.response?.data?.message || t('errors.generic');
      Alert.alert(t('errors.error'), message);
    }
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

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
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : {
                latitude: 25.2854,
                longitude: 51.5310,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }
        }
        showsUserLocation
        showsMyLocationButton={false}
      >
        {currentLocation && (
          <MapMarker coordinate={currentLocation}>
            <View
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ backgroundColor: isOnline ? colors.success : colors.muted }}
            >
              <Ionicons name="car" size={24} color={isOnline ? '#fff' : colors.mutedForeground} />
            </View>
          </MapMarker>
        )}
      </MapView>

      {/* Header */}
      <SafeAreaView className="absolute top-0 left-0 right-0" edges={['top']}>
        <View className="flex-row items-center justify-between px-4 py-2">
          <TouchableOpacity
            onPress={openDrawer}
            className="w-12 h-12 rounded-full items-center justify-center shadow-lg"
            style={{ backgroundColor: colors.background }}
          >
            <Ionicons name="menu" size={24} color={colors.foreground} />
          </TouchableOpacity>

          {/* Online Status Badge */}
          <View
            className="px-4 py-2 rounded-full shadow-lg flex-row items-center"
            style={{ backgroundColor: isOnline ? colors.success : colors.background }}
          >
            <View
              className="w-2 h-2 rounded-full mr-2"
              style={{ backgroundColor: isOnline ? '#fff' : colors.mutedForeground }}
            />
            <Text
              className="text-sm font-medium"
              style={{ color: isOnline ? '#fff' : colors.foreground }}
            >
              {isOnline ? t('home.online') : t('home.offline')}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(main)/notifications')}
            className="w-12 h-12 rounded-full items-center justify-center shadow-lg"
            style={{ backgroundColor: colors.background }}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.foreground} />
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
          {/* Today's Stats */}
          <View className="flex-row justify-between mb-4">
            <View className="items-center flex-1">
              <Text style={{ color: colors.mutedForeground }} className="text-xs mb-1">
                {t('home.earned')}
              </Text>
              <Text style={{ color: colors.foreground }} className="text-xl font-bold">
                QAR {todayStats.earnings.toFixed(0)}
              </Text>
            </View>
            <View className="items-center flex-1 border-l border-r" style={{ borderColor: colors.border }}>
              <Text style={{ color: colors.mutedForeground }} className="text-xs mb-1">
                {t('home.trips')}
              </Text>
              <Text style={{ color: colors.foreground }} className="text-xl font-bold">
                {todayStats.trips}
              </Text>
            </View>
            <View className="items-center flex-1">
              <Text style={{ color: colors.mutedForeground }} className="text-xs mb-1">
                {t('home.acceptRate')}
              </Text>
              <Text style={{ color: colors.foreground }} className="text-xl font-bold">
                {todayStats.acceptanceRate}%
              </Text>
            </View>
          </View>

          {/* Go Online/Offline Button */}
          <TouchableOpacity
            onPress={handleToggleOnline}
            className="py-4 rounded-xl items-center flex-row justify-center"
            style={{ backgroundColor: isOnline ? colors.destructive : colors.success }}
          >
            <Ionicons
              name={isOnline ? 'stop-circle-outline' : 'play-circle-outline'}
              size={24}
              color="#fff"
            />
            <Text className="text-white text-lg font-semibold ml-2">
              {isOnline ? t('home.goOffline') : t('home.goOnline')}
            </Text>
          </TouchableOpacity>

          {isOnline && (
            <Text
              style={{ color: colors.mutedForeground }}
              className="text-center text-sm mt-3"
            >
              {t('home.waitingForRides')}
            </Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
