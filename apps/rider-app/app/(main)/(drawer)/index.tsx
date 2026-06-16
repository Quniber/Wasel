import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { router, useNavigation, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MapView, MapMarker as Marker, MAP_PROVIDER_GOOGLE as PROVIDER_GOOGLE } from '@/components/maps/MapView';
import * as Location from 'expo-location';
import { useBookingStore } from '@/stores/booking-store';
import { useAuthStore } from '@/stores/auth-store';
import { DrawerActions } from '@react-navigation/native';
import { changeLanguage } from '@/i18n';
import { socketService } from '@/lib/socket';
import { orderApi, notificationApi } from '@/lib/api';
import ScheduleSheet from '@/components/ScheduleSheet';

const BASE_W = 393;

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const {
    pickup,
    setPickup,
    activeOrder,
    setActiveOrder,
    _hasHydrated,
    isScheduled,
    scheduledDate,
    setScheduled,
  } = useBookingStore();
  const { user, logout } = useAuthStore();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;

  const isRTL = i18n.language === 'ar';
  const writingDirection: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const mapRef = useRef<MapView>(null);
  const lastGeocodeTime = useRef<number>(0);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [showWebMenu, setShowWebMenu] = useState(false);
  const [hasUnreadNotif, setHasUnreadNotif] = useState(false);
  const [scheduleSheetVisible, setScheduleSheetVisible] = useState(false);

  // Draggable bottom sheet
  const [sheetHeight, setSheetHeight] = useState(0);
  const SHEET_COLLAPSED_HEIGHT = 120 * s; // shows handle + a peek of the search bar
  const sheetTranslateY = useSharedValue(0);
  const COLLAPSE_DELTA = Math.max(0, sheetHeight - SHEET_COLLAPSED_HEIGHT);

  const onSheetLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h && Math.abs(h - sheetHeight) > 1) setSheetHeight(h);
  };

  const sheetPan = Gesture.Pan()
    .onChange((e) => {
      const next = sheetTranslateY.value + e.changeY;
      sheetTranslateY.value = Math.max(0, Math.min(COLLAPSE_DELTA, next));
    })
    .onEnd((e) => {
      const halfway = COLLAPSE_DELTA / 2;
      if (e.velocityY > 600 || sheetTranslateY.value > halfway) {
        sheetTranslateY.value = withSpring(COLLAPSE_DELTA, { damping: 18, stiffness: 160 });
      } else {
        sheetTranslateY.value = withSpring(0, { damping: 18, stiffness: 160 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!pickup && _hasHydrated) {
        getCurrentLocation();
      }
      // Refresh unread-notification badge whenever home regains focus.
      (async () => {
        try {
          const res = await notificationApi.getNotifications();
          const list = res.data || [];
          setHasUnreadNotif(list.some((n: any) => !n.isRead));
        } catch {
          setHasUnreadNotif(false);
        }
      })();
    }, [pickup, _hasHydrated])
  );

  // Active order detection — redirect to the right screen if the user has an in-flight ride
  useEffect(() => {
    if (!_hasHydrated) return;
    (async () => {
      try {
        const response = await orderApi.getCurrentOrder();
        if (response.data) {
          const order = response.data;
          const completedStatuses = ['Finished', 'Cancelled', 'Expired', 'RiderCanceled', 'DriverCanceled'];
          if (completedStatuses.includes(order.status)) {
            setActiveOrder(null);
            return;
          }
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

          if (order.status === 'Requested' || order.status === 'Found') {
            router.replace('/(main)/finding-driver');
          } else if (['DriverAccepted', 'Arrived', 'Started'].includes(order.status)) {
            router.replace('/(main)/ride-active');
          } else if (order.status === 'WaitingForPostPay') {
            router.replace('/(main)/ride-complete');
          } else {
            router.replace('/(main)/ride-active');
          }
        } else if (activeOrder) {
          setActiveOrder(null);
        }
      } catch (error) {
        if (activeOrder) setActiveOrder(null);
      }
    })();
  }, [_hasHydrated]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setIsLoadingLocation(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude });

      const now = Date.now();
      if (now - lastGeocodeTime.current < 5000) {
        setPickup({
          latitude,
          longitude,
          address: pickup?.address || t('home.currentLocation'),
        });
        return;
      }
      lastGeocodeTime.current = now;
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      const addressString = [address?.street, address?.city, address?.region]
        .filter(Boolean)
        .join(', ');
      setPickup({
        latitude,
        longitude,
        address: addressString || t('home.currentLocation'),
      });
    } catch (error) {
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

  useEffect(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        { ...currentLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        1000
      );
    }
  }, [currentLocation]);

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

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    await changeLanguage(newLang);
  };

  const menuItems = [
    { icon: 'home', label: t('drawer.home'), route: '/(main)/(drawer)' },
    { icon: 'time', label: t('drawer.myRides'), route: '/(main)/(drawer)/history' },
    { icon: 'calendar', label: t('drawer.scheduledRides'), route: '/(main)/(drawer)/scheduled' },
    { icon: 'location', label: t('drawer.savedPlaces'), route: '/(main)/(drawer)/places' },
    { icon: 'pricetag', label: t('drawer.promotions'), route: '/(main)/(drawer)/promotions' },
    { icon: 'chatbubbles', label: t('drawer.support'), route: '/(main)/(drawer)/support' },
    { icon: 'settings', label: t('drawer.settings'), route: '/(main)/(drawer)/settings' },
  ];

  // Round white floating button (drawer / notif / fab)
  const FAB = ({
    icon,
    onPress,
    showDot,
    size = 48,
  }: {
    icon: string;
    onPress: () => void;
    showDot?: boolean;
    size?: number;
  }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        width: size * s,
        height: size * s,
        borderRadius: (size * s) / 2,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6,
      }}
    >
      <Ionicons name={icon as any} size={22 * s} color="#111111" />
      {showDot && (
        <View
          style={{
            position: 'absolute',
            top: 10 * s,
            right: 10 * s,
            width: 10 * s,
            height: 10 * s,
            borderRadius: 5 * s,
            backgroundColor: '#E63946',
            borderWidth: 2,
            borderColor: '#FFFFFF',
          }}
        />
      )}
    </TouchableOpacity>
  );

  const QuickChip = ({
    icon,
    label,
    onPress,
    primary,
  }: {
    icon?: string;
    label: string;
    onPress: () => void;
    primary?: boolean;
  }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 6 * s,
        paddingHorizontal: 14 * s,
        paddingVertical: 10 * s,
        borderRadius: 999,
        backgroundColor: '#F5F7FC',
        borderWidth: 1,
        borderColor: '#E5EBF2',
      }}
    >
      {icon && (
        <Ionicons name={icon as any} size={16 * s} color={primary ? '#101969' : '#111111'} />
      )}
      <Text
        style={{
          color: primary ? '#101969' : '#111111',
          fontSize: 13 * s,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#EBF0F7' }}>
      {/* Map */}
      <View style={{ flex: 1 }}>
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
            showsUserLocation={false}
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
                <View style={{ alignItems: 'center' }}>
                  <View
                    style={{
                      width: 56 * s,
                      height: 56 * s,
                      borderRadius: 28 * s,
                      backgroundColor: 'rgba(3, 102, 251, 0.18)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View
                      style={{
                        width: 18 * s,
                        height: 18 * s,
                        borderRadius: 9 * s,
                        backgroundColor: '#0366FB',
                        borderWidth: 3,
                        borderColor: '#FFFFFF',
                      }}
                    />
                  </View>
                </View>
              </Marker>
            )}
          </MapView>
        ) : (
          <View
            style={{
              flex: 1,
              backgroundColor: '#EBF0F7',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ActivityIndicator size="large" color="#101969" />
            <Text style={{ color: '#6B7380', marginTop: 16 }}>{t('common.loading')}</Text>
          </View>
        )}

        {/* Header floating buttons */}
        <SafeAreaView
          edges={['top']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
          pointerEvents="box-none"
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingHorizontal: 20 * s,
              paddingTop: 8 * s,
            }}
          >
            <FAB icon="menu" onPress={openDrawer} />
            <FAB
              icon="notifications-outline"
              onPress={() => router.push('/(main)/notifications')}
              showDot={hasUnreadNotif}
            />
          </View>
        </SafeAreaView>
      </View>

      {/* My-location FAB (sits above the bottom card) */}
      <View
        style={{
          position: 'absolute',
          right: 20 * s,
          bottom: (sheetHeight || 280 * s) + 16 * s,
        }}
      >
        <FAB icon="locate" onPress={centerOnCurrentLocation} />
      </View>

      {/* Draggable bottom card */}
      <Animated.View
        onLayout={onSheetLayout}
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28 * s,
            borderTopRightRadius: 28 * s,
            paddingHorizontal: 20 * s,
            paddingBottom: 28 * s,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 24,
            elevation: 12,
            gap: 14 * s,
          },
          sheetStyle,
        ]}
      >
        {/* Drag handle (gesture target) */}
        <GestureDetector gesture={sheetPan}>
          <View
            style={{
              paddingTop: 12 * s,
              paddingBottom: 6 * s,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 40 * s,
                height: 4 * s,
                borderRadius: 2 * s,
                backgroundColor: '#E5EBF2',
              }}
            />
          </View>
        </GestureDetector>

        {/* Search bar */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/(main)/search')}
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 12 * s,
            height: 56 * s,
            paddingHorizontal: 16 * s,
            borderRadius: 16 * s,
            borderWidth: 1,
            borderColor: '#E5EBF2',
            backgroundColor: '#F5F7FC',
          }}
        >
          <Ionicons name="search" size={20 * s} color="#101969" />
          <Text
            style={{
              flex: 1,
              color: '#6B7380',
              fontSize: 17 * s,
              fontWeight: '500',
              textAlign,
              writingDirection,
            }}
          >
            {t('home.whereTo')}
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={(e) => {
              e.stopPropagation();
              setScheduleSheetVisible(true);
            }}
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 6 * s,
              paddingHorizontal: 10 * s,
              paddingVertical: 6 * s,
              borderRadius: 999,
              backgroundColor: isScheduled ? '#101969' : '#FFFFFF',
              borderWidth: 1,
              borderColor: isScheduled ? '#101969' : '#E5EBF2',
            }}
          >
            <Ionicons
              name="time-outline"
              size={14 * s}
              color={isScheduled ? '#FFFFFF' : '#111111'}
            />
            <Text
              style={{
                color: isScheduled ? '#FFFFFF' : '#111111',
                fontSize: 13 * s,
                fontWeight: '600',
              }}
            >
              {isScheduled && scheduledDate
                ? new Date(scheduledDate).toLocaleString(undefined, {
                    weekday: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : t('home.now')}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Quick chips */}
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            gap: 12 * s,
          }}
        >
          <QuickChip
            icon="home-outline"
            label={t('home.home')}
            onPress={() => router.push('/(main)/(drawer)/places')}
          />
          <QuickChip
            icon="briefcase-outline"
            label={t('home.work')}
            onPress={() => router.push('/(main)/(drawer)/places')}
          />
          <QuickChip
            label={t('home.add')}
            primary
            onPress={() => router.push('/(main)/(drawer)/places')}
          />
        </View>

        {/* Recent header */}
        <Text
          style={{
            color: '#6B7380',
            fontSize: 14 * s,
            fontWeight: '600',
            letterSpacing: 0.4,
            textAlign,
            writingDirection,
          }}
        >
          {t('home.recent')}
        </Text>

        {/* Recent placeholder (empty for now — can be wired to backend) */}
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 14 * s,
          }}
        >
          <Ionicons name="time-outline" size={20 * s} color="#6B7380" />
          <Text
            style={{
              color: '#6B7380',
              fontSize: 14 * s,
              flex: 1,
              textAlign,
              writingDirection,
            }}
          >
            {t('home.noRecent')}
          </Text>
        </View>
      </Animated.View>

      {/* Schedule sheet — opens when tapping the "Now" pill */}
      <ScheduleSheet
        visible={scheduleSheetVisible}
        onClose={() => setScheduleSheetVisible(false)}
        initialDate={scheduledDate ? new Date(scheduledDate as any) : null}
        onConfirm={(date) => setScheduled(true, date)}
        onClear={() => setScheduled(false, null)}
      />

      {/* Web Menu Modal (unchanged behavior) */}
      {Platform.OS === 'web' && (
        <Modal visible={showWebMenu} transparent animationType="fade">
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
            activeOpacity={1}
            onPress={() => setShowWebMenu(false)}
          >
            <View style={{ width: 300, height: '100%', backgroundColor: '#FFFFFF' }}>
              <SafeAreaView style={{ flex: 1 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowWebMenu(false);
                    router.push('/(main)/profile');
                  }}
                  style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5EBF2' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: '#101969',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' }}>
                        {user?.firstName?.[0]}
                        {user?.lastName?.[0]}
                      </Text>
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#111111' }}>
                        {user?.firstName} {user?.lastName}
                      </Text>
                      <Text style={{ color: '#6B7380', fontSize: 14 }}>{user?.mobileNumber}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

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
                      <Ionicons name={item.icon as any} size={24} color="#111111" />
                      <Text style={{ marginLeft: 16, fontSize: 15, color: '#111111' }}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={{ borderTopWidth: 1, borderTopColor: '#E5EBF2', paddingVertical: 8 }}>
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
                      <Ionicons name="globe" size={24} color="#111111" />
                      <Text style={{ marginLeft: 16, fontSize: 15, color: '#111111' }}>
                        {i18n.language === 'en' ? 'العربية' : 'English'}
                      </Text>
                    </View>
                    <Text style={{ color: '#101969', fontWeight: '500' }}>
                      {i18n.language.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                </View>

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
                    borderTopColor: '#E5EBF2',
                  }}
                >
                  <Ionicons name="log-out" size={24} color="#DC2626" />
                  <Text
                    style={{
                      marginLeft: 16,
                      fontSize: 15,
                      color: '#DC2626',
                      fontWeight: '500',
                    }}
                  >
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
