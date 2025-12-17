import { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, ActivityIndicator, Modal, ScrollView, Switch } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MapView, MapMarker as Marker, MAP_PROVIDER_GOOGLE as PROVIDER_GOOGLE } from '@/components/maps/MapView';
import * as Location from 'expo-location';
import { useThemeStore } from '@/stores/theme-store';
import { useBookingStore } from '@/stores/booking-store';
import { useAuthStore } from '@/stores/auth-store';
import { DrawerActions } from '@react-navigation/native';
import { changeLanguage } from '@/i18n';
import { socketService } from '@/lib/socket';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { resolvedTheme, mode, setMode } = useThemeStore();
  const { pickup, setPickup } = useBookingStore();
  const { user, logout } = useAuthStore();
  const isDark = resolvedTheme === 'dark';

  const mapRef = useRef<MapView>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [showWebMenu, setShowWebMenu] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

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

      // Get address for current location
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

  const savedPlaces = [
    { icon: 'home', label: t('home.home'), address: null },
    { icon: 'briefcase', label: t('home.work'), address: null },
  ];

  return (
    <View className="flex-1">
      {/* Map */}
      <View className="flex-1">
        {currentLocation ? (
          <MapView
            ref={mapRef}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
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
                  <View className="w-4 h-4 rounded-full bg-primary border-2 border-white" />
                </View>
              </Marker>
            )}
          </MapView>
        ) : (
          <View className={`flex-1 items-center justify-center ${isDark ? 'bg-background-dark' : 'bg-muted'}`}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text className="mt-4 text-muted-foreground">
              {t('common.loading')}
            </Text>
          </View>
        )}

        {/* Header Overlay */}
        <SafeAreaView className="absolute top-0 left-0 right-0" edges={['top']}>
          <View className="flex-row items-center justify-between px-4 py-2">
            <TouchableOpacity
              onPress={openDrawer}
              className={`w-12 h-12 rounded-full items-center justify-center shadow-lg ${
                isDark ? 'bg-background-dark' : 'bg-white'
              }`}
            >
              <Ionicons name="menu" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(main)/notifications')}
              className={`w-12 h-12 rounded-full items-center justify-center shadow-lg ${
                isDark ? 'bg-background-dark' : 'bg-white'
              }`}
            >
              <Ionicons name="notifications" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* My Location Button */}
        <TouchableOpacity
          onPress={centerOnCurrentLocation}
          className={`absolute right-4 bottom-48 w-12 h-12 rounded-full items-center justify-center shadow-lg ${
            isDark ? 'bg-background-dark' : 'bg-white'
          }`}
        >
          <Ionicons name="locate" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet */}
      <View
        className={`rounded-t-3xl shadow-lg px-5 py-6 ${
          isDark ? 'bg-background-dark' : 'bg-white'
        }`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 10,
        }}
      >
        {/* Search Bar */}
        <TouchableOpacity
          onPress={() => router.push('/(main)/search')}
          className={`flex-row items-center px-4 py-4 rounded-xl ${
            isDark ? 'bg-muted-dark' : 'bg-muted'
          }`}
        >
          <Ionicons name="search" size={24} color="#4CAF50" />
          <Text className="ml-3 text-base text-muted-foreground flex-1">
            {t('home.whereTo')}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={isDark ? '#757575' : '#9E9E9E'} />
        </TouchableOpacity>

        {/* Saved Places */}
        <View className="flex-row mt-4 gap-3">
          {savedPlaces.map((place, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                if (place.address) {
                  // Use saved address
                } else {
                  router.push('/(main)/places');
                }
              }}
              className={`flex-1 flex-row items-center px-4 py-3 rounded-xl ${
                isDark ? 'bg-muted-dark' : 'bg-muted'
              }`}
            >
              <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
                <Ionicons name={place.icon as any} size={18} color="#4CAF50" />
              </View>
              <Text
                className={`ml-2 text-sm font-medium ${
                  isDark ? 'text-foreground-dark' : 'text-foreground'
                }`}
                numberOfLines={1}
              >
                {place.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => router.push('/(main)/places')}
            className={`w-14 items-center justify-center px-3 py-3 rounded-xl ${
              isDark ? 'bg-muted-dark' : 'bg-muted'
            }`}
          >
            <Ionicons name="add" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>
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
                backgroundColor: isDark ? '#121212' : '#FFFFFF',
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
                    borderBottomColor: isDark ? '#333' : '#E0E0E0',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: '#4CAF50',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </Text>
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '600',
                          color: isDark ? '#FAFAFA' : '#212121',
                        }}
                      >
                        {user?.firstName} {user?.lastName}
                      </Text>
                      <Text style={{ color: '#757575', fontSize: 14 }}>
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
                        color={isDark ? '#FAFAFA' : '#212121'}
                      />
                      <Text
                        style={{
                          marginLeft: 16,
                          fontSize: 15,
                          color: isDark ? '#FAFAFA' : '#212121',
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
                    borderTopColor: isDark ? '#333' : '#E0E0E0',
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
                      <Ionicons name="moon" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
                      <Text
                        style={{
                          marginLeft: 16,
                          fontSize: 15,
                          color: isDark ? '#FAFAFA' : '#212121',
                        }}
                      >
                        {t('drawer.darkMode')}
                      </Text>
                    </View>
                    <Switch
                      value={mode === 'dark'}
                      onValueChange={toggleDarkMode}
                      trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
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
                      <Ionicons name="globe" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
                      <Text
                        style={{
                          marginLeft: 16,
                          fontSize: 15,
                          color: isDark ? '#FAFAFA' : '#212121',
                        }}
                      >
                        {i18n.language === 'en' ? 'العربية' : 'English'}
                      </Text>
                    </View>
                    <Text style={{ color: '#4CAF50', fontWeight: '500' }}>
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
                    borderTopColor: isDark ? '#333' : '#E0E0E0',
                  }}
                >
                  <Ionicons name="log-out" size={24} color="#F44336" />
                  <Text style={{ marginLeft: 16, fontSize: 15, color: '#F44336', fontWeight: '500' }}>
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
