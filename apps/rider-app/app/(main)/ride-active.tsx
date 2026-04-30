import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  MapView,
  MapMarker as Marker,
  MapPolyline as Polyline,
  MAP_PROVIDER_GOOGLE as PROVIDER_GOOGLE,
} from '@/components/maps/MapView';
import { useBookingStore } from '@/stores/booking-store';
import { socketService } from '@/lib/socket';
import { orderApi } from '@/lib/api';
import AlertModal from '@/components/AlertModal';

const BASE_W = 393;

type RideStatus = 'driver_on_way' | 'driver_arrived' | 'trip_started';

export default function RideActiveScreen() {
  const { t, i18n } = useTranslation();
  const {
    activeOrder,
    setActiveOrder,
    updateDriverLocation,
    updateOrderStatus,
    resetBooking,
    _hasHydrated,
  } = useBookingStore();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;
  const isRTL = i18n.language === 'ar';
  const writingDirection: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const mapRef = useRef<MapView>(null);
  const [status, setStatus] = useState<RideStatus>('driver_on_way');
  const [eta, setEta] = useState(5);
  const [distance, setDistance] = useState(0.4);
  const [confirmCancelVisible, setConfirmCancelVisible] = useState(false);
  const [cancelErrorMsg, setCancelErrorMsg] = useState<string | null>(null);

  const driver = activeOrder?.driver;
  const pickup = activeOrder?.pickup;
  const dropoff = activeOrder?.dropoff;

  // Refresh order details once if missing
  useEffect(() => {
    if (!_hasHydrated || !activeOrder?.id || activeOrder.driver?.id) return;
    (async () => {
      try {
        const res = await orderApi.getOrderDetails(String(activeOrder.id));
        const o = res.data;
        if (o?.driver) {
          setActiveOrder({
            ...activeOrder,
            driver: {
              id: String(o.driver.id || ''),
              firstName: o.driver.firstName || 'Driver',
              lastName: o.driver.lastName || '',
              mobileNumber: o.driver.mobileNumber || '',
              rating: o.driver.rating || 5.0,
              reviewCount: o.driver.reviewCount || 0,
              carModel:
                typeof o.driver.carModel === 'string'
                  ? o.driver.carModel
                  : o.driver.carModel
                  ? `${o.driver.carModel.brand || ''} ${o.driver.carModel.model || ''}`.trim()
                  : '',
              carColor:
                typeof o.driver.carColor === 'string'
                  ? o.driver.carColor
                  : o.driver.carColor?.name || '',
              carPlate: o.driver.carPlate || '',
              latitude: o.driver.latitude || pickup?.latitude || 0,
              longitude: o.driver.longitude || pickup?.longitude || 0,
            },
          });
        }
      } catch {}
    })();
  }, [_hasHydrated, activeOrder?.id]);

  // Listen for socket events
  useEffect(() => {
    if (!activeOrder?.id) return;
    socketService.connect();
    socketService.joinOrderRoom(Number(activeOrder.id));

    const locUnsub = socketService.on('driver:location', (data: any) => {
      if (data?.latitude != null && data?.longitude != null) {
        updateDriverLocation({ latitude: data.latitude, longitude: data.longitude });
      }
      if (data?.eta != null) setEta(data.eta);
      if (data?.distance != null) setDistance(data.distance);
    });

    const statusUnsub = socketService.on('order:status', (data: any) => {
      if (data?.status === 'Arrived') {
        setStatus('driver_arrived');
        updateOrderStatus('Arrived');
      } else if (data?.status === 'Started') {
        setStatus('trip_started');
        updateOrderStatus('Started');
      } else if (data?.status === 'Finished' || data?.status === 'WaitingForPostPay') {
        updateOrderStatus(data.status);
        router.replace('/(main)/ride-complete');
      }
    });

    const cancelledUnsub = socketService.on('order:cancelled', () => {
      resetBooking();
      router.replace('/(main)');
    });

    return () => {
      locUnsub?.();
      statusUnsub?.();
      cancelledUnsub?.();
    };
  }, [activeOrder?.id]);

  const handleCancel = () => {
    if (!activeOrder?.id) return;
    setConfirmCancelVisible(true);
  };

  const performCancel = async () => {
    if (!activeOrder?.id) return;
    setConfirmCancelVisible(false);
    try {
      await orderApi.cancelOrder(activeOrder.id);
      socketService.leaveOrderRoom(Number(activeOrder.id));
      resetBooking();
      router.replace('/(main)');
    } catch (err: any) {
      setCancelErrorMsg(err?.response?.data?.message || t('errors.generic'));
    }
  };

  const callDriver = () => {
    if (!driver?.mobileNumber) return;
    Linking.openURL(`tel:${driver.mobileNumber}`).catch(() => {});
  };

  const messageDriver = () => {
    router.push('/(main)/chat');
  };

  const statusLabel =
    status === 'driver_arrived'
      ? t('ride.driverArrived', 'Driver arrived')
      : status === 'trip_started'
      ? t('ride.onTrip', 'On the trip')
      : t('ride.driverArrivingIn', 'Driver arriving in');

  const statusValue =
    status === 'driver_arrived'
      ? t('ride.atPickup', 'At your pickup point')
      : status === 'trip_started'
      ? t('ride.headingToDropoff', 'Heading to drop-off')
      : `${eta} ${t('booking.minutes', { count: eta })} · ${distance.toFixed(1)} km`;

  if (!activeOrder) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#101969" />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#EBF0F7' }}>
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: (pickup?.latitude || 25.2854) || 25.2854,
          longitude: (pickup?.longitude || 51.531) || 51.531,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {pickup && (
          <Marker coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}>
            <View
              style={{
                width: 32 * s,
                height: 32 * s,
                borderRadius: 16 * s,
                backgroundColor: 'rgba(3, 102, 251, 0.18)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: 14 * s,
                  height: 14 * s,
                  borderRadius: 7 * s,
                  backgroundColor: '#0366FB',
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                }}
              />
            </View>
          </Marker>
        )}
        {dropoff && (
          <Marker coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }}>
            <Ionicons name="location" size={32 * s} color="#ED4557" />
          </Marker>
        )}
        {driver?.latitude != null && driver?.longitude != null && (
          <Marker coordinate={{ latitude: driver.latitude, longitude: driver.longitude }}>
            <View
              style={{
                width: 36 * s,
                height: 36 * s,
                borderRadius: 18 * s,
                backgroundColor: '#FFFFFF',
                borderWidth: 2,
                borderColor: '#101969',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="car-sport" size={18 * s} color="#101969" />
            </View>
          </Marker>
        )}
        {pickup && dropoff && (
          <Polyline
            coordinates={[
              { latitude: pickup.latitude, longitude: pickup.longitude },
              { latitude: dropoff.latitude, longitude: dropoff.longitude },
            ]}
            strokeColor="#0366FB"
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Status pill at top */}
      <SafeAreaView
        edges={['top']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
        pointerEvents="box-none"
      >
        <View
          style={{
            marginHorizontal: 16 * s,
            marginTop: 8 * s,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 12 * s,
            paddingHorizontal: 16 * s,
            paddingVertical: 14 * s,
            borderRadius: 16 * s,
            backgroundColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 14,
            elevation: 6,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: '#6B7380',
                fontSize: 11 * s,
                fontWeight: '500',
                letterSpacing: 0.4,
                textAlign,
                writingDirection,
              }}
            >
              {statusLabel}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: '#111111',
                fontSize: 16 * s,
                fontWeight: '700',
                marginTop: 2 * s,
                textAlign,
                writingDirection,
              }}
            >
              {statusValue}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(main)/chat')}
            style={{
              width: 40 * s,
              height: 40 * s,
              borderRadius: 20 * s,
              backgroundColor: '#F5F7FC',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20 * s} color="#101969" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Driver sheet at bottom */}
      <SafeAreaView
        edges={['bottom']}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 28 * s,
          borderTopRightRadius: 28 * s,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 24,
          elevation: 12,
        }}
      >
        <View
          style={{
            paddingTop: 14 * s,
            paddingHorizontal: 20 * s,
            paddingBottom: 14 * s,
            gap: 16 * s,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 40 * s,
                height: 4 * s,
                borderRadius: 2 * s,
                backgroundColor: '#E5EBF2',
              }}
            />
          </View>

          {/* Driver info */}
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 12 * s,
            }}
          >
            <View
              style={{
                width: 56 * s,
                height: 56 * s,
                borderRadius: 28 * s,
                backgroundColor: '#101969',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 18 * s, fontWeight: '700' }}>
                {(driver?.firstName?.[0] || 'D').toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                style={{
                  color: '#111111',
                  fontSize: 17 * s,
                  fontWeight: '700',
                  textAlign,
                  writingDirection,
                }}
              >
                {[driver?.firstName, driver?.lastName].filter(Boolean).join(' ') ||
                  t('common.driver', 'Driver')}
              </Text>
              <View
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  gap: 6 * s,
                  marginTop: 2 * s,
                }}
              >
                <Ionicons name="star" size={14 * s} color="#F28C0D" />
                <Text style={{ color: '#111111', fontSize: 13 * s, fontWeight: '600' }}>
                  {(driver?.rating || 5).toFixed(1)}
                </Text>
                <Text style={{ color: '#6B7380', fontSize: 13 * s }}>·</Text>
                <Text
                  numberOfLines={1}
                  style={{ color: '#6B7380', fontSize: 13 * s }}
                >
                  {[driver?.carModel, driver?.carColor].filter(Boolean).join(' · ') || ''}
                </Text>
              </View>
            </View>
            {!!driver?.carPlate && (
              <View
                style={{
                  paddingHorizontal: 12 * s,
                  paddingVertical: 8 * s,
                  borderRadius: 10 * s,
                  backgroundColor: '#FFF5D9',
                  borderWidth: 1,
                  borderColor: '#D9B24D',
                }}
              >
                <Text style={{ color: '#111111', fontSize: 14 * s, fontWeight: '700' }}>
                  {driver.carPlate}
                </Text>
              </View>
            )}
          </View>

          {/* Message + Call buttons */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10 * s }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={messageDriver}
              style={{
                flex: 1,
                height: 56 * s,
                borderRadius: 14 * s,
                backgroundColor: '#F5F7FC',
                borderWidth: 1,
                borderColor: '#E5EBF2',
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8 * s,
              }}
            >
              <Ionicons name="chatbubble-outline" size={20 * s} color="#101969" />
              <Text style={{ color: '#111111', fontSize: 15 * s, fontWeight: '600' }}>
                {t('ride.message', 'Message')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={callDriver}
              style={{
                flex: 1,
                height: 56 * s,
                borderRadius: 14 * s,
                backgroundColor: '#101969',
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8 * s,
              }}
            >
              <Ionicons name="call" size={20 * s} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 15 * s, fontWeight: '600' }}>
                {t('ride.call', 'Call')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Pickup → dropoff card */}
          <View
            style={{
              backgroundColor: '#F5F7FC',
              borderWidth: 1,
              borderColor: '#E5EBF2',
              borderRadius: 14 * s,
              paddingHorizontal: 14 * s,
              paddingVertical: 12 * s,
              gap: 10 * s,
            }}
          >
            <View
              style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                gap: 12 * s,
              }}
            >
              <View
                style={{
                  width: 10 * s,
                  height: 10 * s,
                  borderRadius: 5 * s,
                  backgroundColor: '#0366FB',
                }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: '#6B7380',
                    fontSize: 11 * s,
                    fontWeight: '500',
                    textAlign,
                    writingDirection,
                  }}
                >
                  {t('booking.pickup', 'PICKUP').toUpperCase()}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: '#111111',
                    fontSize: 13 * s,
                    fontWeight: '600',
                    textAlign,
                    writingDirection,
                  }}
                >
                  {pickup?.address || t('home.currentLocation')}
                </Text>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: '#E5EBF2' }} />
            <View
              style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                gap: 12 * s,
              }}
            >
              <View
                style={{
                  width: 10 * s,
                  height: 10 * s,
                  borderRadius: 2 * s,
                  backgroundColor: '#ED4557',
                }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: '#6B7380',
                    fontSize: 11 * s,
                    fontWeight: '500',
                    textAlign,
                    writingDirection,
                  }}
                >
                  {t('booking.dropoff', 'DROP-OFF').toUpperCase()}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: '#111111',
                    fontSize: 13 * s,
                    fontWeight: '600',
                    textAlign,
                    writingDirection,
                  }}
                >
                  {dropoff?.address || ''}
                </Text>
              </View>
            </View>
          </View>

          {/* Cancel link */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleCancel}
            style={{ alignItems: 'center', paddingVertical: 4 * s }}
          >
            <Text style={{ color: '#ED4557', fontSize: 14 * s, fontWeight: '600' }}>
              {t('ride.cancelSearch', 'Cancel ride')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <AlertModal
        visible={confirmCancelVisible}
        variant="error"
        icon="warning"
        title={t('ride.cancel.title', 'Cancel ride?')}
        message={t(
          'ride.cancel.confirm',
          'Your driver is already on the way. A QAR 5 cancellation fee may apply.'
        )}
        primaryLabel={t('ride.cancel.yesCancel', 'Yes, cancel')}
        primaryColor="#ED4557"
        onPrimaryPress={performCancel}
        secondaryLabel={t('ride.cancel.keep', 'Keep ride')}
        onSecondaryPress={() => setConfirmCancelVisible(false)}
        onRequestClose={() => setConfirmCancelVisible(false)}
      />

      <AlertModal
        visible={!!cancelErrorMsg}
        variant="error"
        title={t('common.error', 'Error')}
        message={cancelErrorMsg || ''}
        primaryLabel={t('common.ok', 'OK')}
        onPrimaryPress={() => setCancelErrorMsg(null)}
        onRequestClose={() => setCancelErrorMsg(null)}
      />
    </View>
  );
}
