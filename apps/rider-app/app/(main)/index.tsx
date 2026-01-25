import { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, ActivityIndicator, Modal, ScrollView, Switch } from 'react-native';
import { router, useNavigation, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MapView, MapMarker as Marker, MAP_PROVIDER_GOOGLE as PROVIDER_GOOGLE } from '@/components/maps/MapView';
import * as Location from 'expo-location';
import { useCallback } from 'react';
import { useThemeStore } from '@/stores/theme-store';
import { useBookingStore } from '@/stores/booking-store';
import { useAuthStore } from '@/stores/auth-store';
import { DrawerActions } from '@react-navigation/native';
import { changeLanguage } from '@/i18n';
import { socketService } from '@/lib/socket';
import { getColors } from '@/constants/Colors';
import { orderApi } from '@/lib/api';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { resolvedTheme, mode, setMode } = useThemeStore();
  const { pickup, setPickup, activeOrder, setActiveOrder, _hasHydrated } = useBookingStore();
  const { user, logout } = useAuthStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const mapRef = useRef<MapView>(null);
  const lastGeocodeTime = useRef<number>(0);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [showWebMenu, setShowWebMenu] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Refetch current location when screen comes into focus (e.g., after canceling a ride)
  useFocusEffect(
    useCallback(() => {
      // Only refetch if pickup is not set (e.g., after resetBooking was called)
      if (!pickup && _hasHydrated) {
        console.log('[Home] Screen focused with no pickup, refetching location');
        getCurrentLocation();
      }
    }, [pickup, _hasHydrated])
  );

  // Check for active order on app load and verify with server
  useEffect(() => {
    if (!_hasHydrated) return;

    (async () => {
      try {
        const response = await orderApi.getCurrentOrder();
        if (response.data) {
          const order = response.data;
          console.log('[Home] Found active order:', order.id, 'status:', order.status);

          // Skip completed/cancelled orders
          const completedStatuses = ['Finished', 'Cancelled', 'Expired', 'RiderCanceled', 'DriverCanceled'];
          if (completedStatuses.includes(order.status)) {
            console.log('[Home] Order is completed/cancelled, clearing state');
            setActiveOrder(null);
            return;
          }

          // Build proper driver object if driver exists
          const driverData = order.driver;
          const driver = driverData ? {
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
            latitude: driverData.latitude || order.pickupLatitude || 0,
            longitude: driverData.longitude || order.pickupLongitude || 0,
          } : undefined;

          // Update local state with proper data before navigating
          setActiveOrder({
            id: String(order.id),
            status: order.status,
            pickup: {
              latitude: order.pickupLatitude,
              longitude: order.pickupLongitude,
              address: order.pickupAddress || '',
            },
            dropoff: {
              latitude: order.dropoffLatitude,
              longitude: order.dropoffLongitude,
              address: order.dropoffAddress || '',
            },
            service: order.service ? {
              id: String(order.service.id),
              name: order.service.name || '',
              baseFare: 0,
              perKilometer: 0,
              perMinute: 0,
              minimumFare: 0,
              personCapacity: order.service.personCapacity || 4,
            } : {
              id: '',
              name: 'Ride',
              baseFare: 0,
              perKilometer: 0,
              perMinute: 0,
              minimumFare: 0,
              personCapacity: 4,
            },
            fare: order.costAfterCoupon || order.serviceCost || 0,
            driver,
            createdAt: order.createdAt || new Date().toISOString(),
          });

          // Navigate based on order status
          if (order.status === 'Requested' || order.status === 'Found') {
            // Order is still searching for driver
            router.replace('/(main)/finding-driver');
          } else if (['DriverAccepted', 'Arrived', 'Started'].includes(order.status)) {
            // Order has driver, go to ride-active
            router.replace('/(main)/ride-active');
          } else if (order.status === 'WaitingForPostPay') {
            // Order needs payment
            router.replace('/(main)/ride-complete');
          } else {
            // Default to ride-active
            router.replace('/(main)/ride-active');
          }
        } else if (activeOrder) {
          // Local state has order but server doesn't, clear local
          console.log('[Home] No active order on server, clearing local state');
          setActiveOrder(null);
        }
      } catch (error) {
        console.error('[Home] Error checking active order:', error);
        // Clear local state if we can't verify
        if (activeOrder) {
          setActiveOrder(null);
        }
      }
    })();
  }, [_hasHydrated]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        setIsLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude });

      // Rate limit geocoding to prevent "too many requests" error
      // Only call reverseGeocodeAsync if at least 5 seconds have passed
      const now = Date.now();
      const timeSinceLastGeocode = now - lastGeocodeTime.current;

      if (timeSinceLastGeocode < 5000) {
        console.log('[Home] Skipping geocode - rate limited');
        // Use coordinates as fallback address
        setPickup({
          latitude,
          longitude,
          address: pickup?.address || t('home.currentLocation'),
        });
        return;
      }

      lastGeocodeTime.current = now;
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      const addressString = [
        address?.street,
        address?.city,
        address?.region,
      ].filter(Boolean).join(', ');

      setPickup({
        latitude,
        longitude,
        address: addressString || t('home.currentLocation'),
      });
    } catch (error) {
      console.error('Error getting location:', error);
      // If geocoding fails, still set the location with a fallback address
      if (currentLocation) {
        setPickup({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          address: t('home.currentLocation'),
        });
      }
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const centerOnCurrentLocation = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...currentLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const openDrawer = () => {
    if (Platform.OS === 'web') {
      setShowWebMenu(true);
    } else {
      navigation.dispatch(DrawerActions.openDrawer());
    }
  };

  const handleLogout = async () => {
    await logout();
    socketService.disconnect();
    router.replace('/(auth)/welcome');
  };

  const toggleDarkMode = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    await changeLanguage(newLang);
  };

  const menuItems = [
    { icon: 'home', label: t('drawer.home'), route: '/(main)' },
    { icon: 'time', label: t('drawer.myRides'), route: '/(main)/history' },
    { icon: 'calendar', label: t('drawer.scheduledRides'), route: '/(main)/scheduled' },
    { icon: 'location', label: t('drawer.savedPlaces'), route: '/(main)/places' },
    { icon: 'pricetag', label: t('drawer.promotions'), route: '/(main)/promotions' },
    { icon: 'chatbubbles', label: t('drawer.support'), route: '/(main)/support' },
    { icon: 'settings', label: t('drawer.settings'), route: '/(main)/settings' },
  ];


  return (
    <View className="flex-1">
      {/* Map */}
      <View className="flex-1">
        {currentLocation ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            initialRegion={{
              ...currentLocation,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {pickup && (
              <Marker
                coordinate={{
                  latitude: pickup.latitude,
                  longitude: pickup.longitude,
                }}
                title={t('booking.pickup')}
              >
                <View className="items-center">
                  <View
                    style={{ backgroundColor: colors.primary }}
                    className="w-4 h-4 rounded-full border-2 border-white"
                  />
                </View>
              </Marker>
            )}
          </MapView>
        ) : (
          <View
            style={{ backgroundColor: colors.muted }}
            className="flex-1 items-center justify-center"
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.mutedForeground }} className="mt-4">
              {t('common.loading')}
            </Text>
          </View>
        )}

        {/* Header Overlay */}
        <SafeAreaView className="absolute top-0 left-0 right-0" edges={['top']}>
          <View className="px-4 py-2">
            {/* Menu and Notification Icons */}
            <View className="flex-row items-center justify-between mb-3">
              <TouchableOpacity
                onPress={openDrawer}
                style={{ backgroundColor: colors.card }}
                className="w-12 h-12 rounded-full items-center justify-center shadow-lg"
              >
                <Ionicons name="menu" size={24} color={colors.foreground} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/(main)/notifications')}
                style={{ backgroundColor: colors.card }}
                className="w-12 h-12 rounded-full items-center justify-center shadow-lg"
              >
                <Ionicons name="notifications" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <TouchableOpacity
              onPress={() => router.push('/(main)/search')}
              style={{
                backgroundColor: colors.card,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 5,
              }}
              className="flex-row items-center px-4 py-4 rounded-xl"
            >
              <Ionicons name="search" size={22} color={colors.primary} />
              <Text style={{ color: colors.mutedForeground }} className="ml-3 text-base flex-1">
                {t('home.whereTo')}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* My Location Button */}
        <TouchableOpacity
          onPress={centerOnCurrentLocation}
          style={{ backgroundColor: colors.card }}
          className="absolute right-4 bottom-8 w-12 h-12 rounded-full items-center justify-center shadow-lg"
        >
          <Ionicons name="locate" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>


      {/* Web Menu Modal */}
      {Platform.OS === 'web' && (
        <Modal visible={showWebMenu} transparent animationType="fade">
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
            activeOpacity={1}
            onPress={() => setShowWebMenu(false)}
          >
            <View
              style={{
                width: 300,
                height: '100%',
                backgroundColor: colors.card,
              }}
            >
              <SafeAreaView style={{ flex: 1 }}>
                {/* User Profile Header */}
                <TouchableOpacity
                  onPress={() => {
                    setShowWebMenu(false);
                    router.push('/(main)/profile');
                  }}
                  style={{
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: colors.primary,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: colors.primaryForeground, fontSize: 20, fontWeight: 'bold' }}>
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </Text>
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: colors.foreground,
                        }}
                      >
                        {user?.firstName} {user?.lastName}
                      </Text>
                      <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                        {user?.mobileNumber}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Menu Items */}
                <ScrollView style={{ flex: 1, paddingVertical: 8 }}>
                  {menuItems.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        setShowWebMenu(false);
                        router.push(item.route as any);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                      }}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={24}
                        color={colors.foreground}
                      />
                      <Text
                        style={{
                          marginLeft: 16,
                          fontSize: 15,
                          color: colors.foreground,
                        }}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Theme & Language Toggles */}
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    paddingVertical: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="moon" size={24} color={colors.foreground} />
                      <Text
                        style={{
                          marginLeft: 16,
                          fontSize: 15,
                          color: colors.foreground,
                        }}
                      >
                        {t('drawer.darkMode')}
                      </Text>
                    </View>
                    <Switch
                      value={mode === 'dark'}
                      onValueChange={toggleDarkMode}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <TouchableOpacity
                    onPress={toggleLanguage}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="globe" size={24} color={colors.foreground} />
                      <Text
                        style={{
                          marginLeft: 16,
                          fontSize: 15,
                          color: colors.foreground,
                        }}
                      >
                        {i18n.language === 'en' ? 'العربية' : 'English'}
                      </Text>
                    </View>
                    <Text style={{ color: colors.primary, fontWeight: '500' }}>
                      {i18n.language.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Logout */}
                <TouchableOpacity
                  onPress={() => {
                    setShowWebMenu(false);
                    handleLogout();
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <Ionicons name="log-out" size={24} color={colors.destructive} />
                  <Text style={{ marginLeft: 16, fontSize: 15, color: colors.destructive, fontWeight: '500' }}>
                    {t('drawer.logout')}
                  </Text>
                </TouchableOpacity>
              </SafeAreaView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}
