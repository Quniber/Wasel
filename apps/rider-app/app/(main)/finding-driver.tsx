import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  MapView,
  MapMarker as Marker,
  MAP_PROVIDER_GOOGLE as PROVIDER_GOOGLE,
} from '@/components/maps/MapView';
import { useBookingStore } from '@/stores/booking-store';
import { orderApi } from '@/lib/api';
import { socketService } from '@/lib/socket';
import AlertModal from '@/components/AlertModal';

const BASE_W = 393;

// Three pulsing dots indicator (used in the top pill)
function DotsIndicator({ size = 6, gap = 4 }: { size?: number; gap?: number }) {
  const a1 = useRef(new Animated.Value(0.3)).current;
  const a2 = useRef(new Animated.Value(0.3)).current;
  const a3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const seq = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 350,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0.3,
            duration: 350,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    const l1 = seq(a1, 0);
    const l2 = seq(a2, 150);
    const l3 = seq(a3, 300);
    l1.start();
    l2.start();
    l3.start();
    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, []);

  const Dot = ({ value }: { value: Animated.Value }) => (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#0366FB',
        opacity: value,
      }}
    />
  );
  return (
    <View style={{ flexDirection: 'row', gap, alignItems: 'center' }}>
      <Dot value={a1} />
      <Dot value={a2} />
      <Dot value={a3} />
    </View>
  );
}

export default function FindingDriverScreen() {
  const { t, i18n } = useTranslation();
  const {
    pickup,
    dropoff,
    selectedService,
    paymentMethod,
    setActiveOrder,
    resetBooking,
  } = useBookingStore();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;

  const isRTL = i18n.language === 'ar';
  const writingDirection: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const mapRef = useRef<MapView>(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [status, setStatus] = useState<'searching' | 'not_found'>('searching');
  const [searchRadius, setSearchRadius] = useState(500);

  const cleanupRef = useRef<(() => void) | null>(null);
  const isCancellingRef = useRef(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [confirmCancelVisible, setConfirmCancelVisible] = useState(false);
  const [cancelErrorMsg, setCancelErrorMsg] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      startPulseAnimation();

      const currentState = useBookingStore.getState();
      const existingOrder = currentState.activeOrder;

      if (
        existingOrder?.id &&
        ['Finished', 'finished', 'Completed', 'completed'].includes(existingOrder.status)
      ) {
        router.replace('/(main)/ride-complete');
        return;
      }
      if (
        existingOrder?.id &&
        existingOrder.driver &&
        ['DriverAccepted', 'Arrived', 'Started'].includes(existingOrder.status)
      ) {
        router.replace('/(main)/ride-active');
        return;
      }
      if (existingOrder?.id && existingOrder.status === 'Requested') {
        waitForDriver(Number(existingOrder.id));
      } else {
        createOrder();
      }

      return () => {
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }
      };
    }, [])
  );

  const startPulseAnimation = () => {
    pulseAnim.setValue(0);
    Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    ).start();
  };

  const buildDriverObject = (driverData: any, fallbackLat: number, fallbackLng: number) => {
    if (!driverData) return null;
    return {
      id: String(driverData.id || ''),
      firstName: driverData.firstName || 'Driver',
      lastName: driverData.lastName || '',
      mobileNumber: driverData.mobileNumber || '',
      rating: driverData.rating || 5.0,
      reviewCount: driverData.reviewCount || 0,
      carModel:
        typeof driverData.carModel === 'string'
          ? driverData.carModel
          : driverData.carModel
          ? `${driverData.carModel.brand || ''} ${driverData.carModel.model || ''}`.trim()
          : '',
      carColor:
        typeof driverData.carColor === 'string'
          ? driverData.carColor
          : driverData.carColor?.name || '',
      carPlate: driverData.carPlate || '',
      latitude: driverData.latitude || fallbackLat,
      longitude: driverData.longitude || fallbackLng,
    };
  };

  const waitForDriver = async (orderId: number) => {
    try {
      await socketService.connect();
      socketService.joinOrderRoom(orderId);

      const unsubscribe = socketService.on('order:status', async (data) => {
        if (data.status === 'DriverAccepted') {
          try {
            const orderDetails = await orderApi.getOrderDetails(String(orderId));
            const fullOrder = orderDetails.data;
            const driverData = fullOrder.driver || data.driver;
            setActiveOrder({
              id: fullOrder.id?.toString() || orderId.toString(),
              status: 'DriverAccepted',
              pickup: pickup!,
              dropoff: dropoff!,
              service: selectedService!,
              fare: data.fare || parseFloat(fullOrder.costBest) || 15,
              driver: buildDriverObject(driverData, pickup?.latitude || 0, pickup?.longitude || 0),
              createdAt: fullOrder.createdAt || new Date().toISOString(),
            });
            cleanupRef.current?.();
            cleanupRef.current = null;
            router.replace('/(main)/ride-active');
          } catch {
            setActiveOrder({
              id: data.orderId?.toString() || orderId.toString(),
              status: 'DriverAccepted',
              pickup: pickup!,
              dropoff: dropoff!,
              service: selectedService!,
              fare: data.fare || 15,
              driver: buildDriverObject(data.driver, pickup?.latitude || 0, pickup?.longitude || 0),
              createdAt: new Date().toISOString(),
            });
            cleanupRef.current?.();
            cleanupRef.current = null;
            router.replace('/(main)/ride-active');
          }
        } else if (data.status === 'no_drivers' || data.status === 'NotFound') {
          setStatus('not_found');
        } else if (data.status === 'Finished' || data.status === 'finished') {
          cleanupRef.current?.();
          cleanupRef.current = null;
          router.replace('/(main)/ride-complete');
        }
      });

      const timeout = setTimeout(() => setStatus('not_found'), 60000);
      cleanupRef.current = () => {
        unsubscribe?.();
        clearTimeout(timeout);
      };
    } catch {
      setStatus('not_found');
    }
  };

  const createOrder = async () => {
    const {
      pickup: cp,
      dropoff: cd,
      selectedService: cs,
      paymentMethod: cm,
    } = useBookingStore.getState();
    if (!cp || !cd || !cs) {
      setStatus('not_found');
      return;
    }
    try {
      const paymentModeMap: Record<string, string> = {
        cash: 'cash',
        wallet: 'wallet',
        card: 'payment_gateway',
      };
      const response = await orderApi.createOrder({
        serviceId: parseInt(cs.id, 10),
        pickupAddress: cp.address,
        pickupLatitude: cp.latitude,
        pickupLongitude: cp.longitude,
        dropoffAddress: cd.address,
        dropoffLatitude: cd.latitude,
        dropoffLongitude: cd.longitude,
        paymentMode: paymentModeMap[cm] || 'cash',
      });
      const order = response.data;

      await socketService.connect();
      socketService.joinOrderRoom(order.id);

      const unsubscribe = socketService.on('order:status', async (data) => {
        if (data.status === 'DriverAccepted') {
          try {
            const orderDetails = await orderApi.getOrderDetails(order.id);
            const fullOrder = orderDetails.data;
            const driverData = fullOrder.driver || data.driver;
            setActiveOrder({
              id: fullOrder.id?.toString() || order.id.toString(),
              status: 'DriverAccepted',
              pickup: cp,
              dropoff: cd,
              service: cs,
              fare: data.fare || parseFloat(order.serviceCost) || 15,
              driver: buildDriverObject(driverData, cp.latitude, cp.longitude),
              createdAt: order.createdAt || new Date().toISOString(),
            });
            cleanupRef.current?.();
            cleanupRef.current = null;
            router.replace('/(main)/ride-active');
          } catch {
            setActiveOrder({
              id: data.orderId?.toString() || order.id.toString(),
              status: 'DriverAccepted',
              pickup: cp,
              dropoff: cd,
              service: cs,
              fare: data.fare || parseFloat(order.serviceCost) || 15,
              driver: buildDriverObject(data.driver, cp.latitude, cp.longitude),
              createdAt: order.createdAt || new Date().toISOString(),
            });
            cleanupRef.current?.();
            cleanupRef.current = null;
            router.replace('/(main)/ride-active');
          }
        } else if (data.status === 'no_drivers' || data.status === 'NotFound') {
          setStatus('not_found');
        } else if (data.status === 'Finished' || data.status === 'finished') {
          cleanupRef.current?.();
          cleanupRef.current = null;
          router.replace('/(main)/ride-complete');
        }
      });

      setActiveOrder({
        id: order.id.toString(),
        status: 'searching',
        pickup: cp,
        dropoff: cd,
        service: cs,
        fare: parseFloat(order.fare) || 15,
        driver: null,
        createdAt: order.createdAt || new Date().toISOString(),
      });

      const timeout = setTimeout(() => setStatus('not_found'), 60000);
      cleanupRef.current = () => {
        unsubscribe?.();
        clearTimeout(timeout);
      };
    } catch {
      setStatus('not_found');
    }
  };

  const performCancel = async () => {
    if (isCancellingRef.current) return;
    isCancellingRef.current = true;
    setIsCancelling(true);

    const { activeOrder } = useBookingStore.getState();

    if (
      activeOrder?.id &&
      ['Finished', 'finished', 'Completed', 'completed'].includes(activeOrder.status)
    ) {
      router.replace('/(main)/ride-complete');
      isCancellingRef.current = false;
      setIsCancelling(false);
      return;
    }

    if (activeOrder?.id) {
      try {
        await orderApi.cancelOrder(activeOrder.id);
        socketService.leaveOrderRoom(Number(activeOrder.id));
      } catch (err: any) {
        // Surface the backend error so the user understands why cancel didn't go through.
        const msg =
          err?.response?.data?.message ||
          t('ride.cancelFailed', 'Could not cancel the ride. Please try again.');
        setIsCancelling(false);
        isCancellingRef.current = false;
        setCancelErrorMsg(msg);
        return;
      }
    }

    // Defensive: sweep any other stale active orders the server still knows
    // about. The cancel endpoint already does this server-side now, but if a
    // race left one behind we don't want home to bounce us back here.
    for (let i = 0; i < 3; i++) {
      try {
        const cur = await orderApi.getCurrentOrder();
        const stale = cur?.data;
        if (stale?.id && String(stale.id) !== String(activeOrder?.id)) {
          await orderApi.cancelOrder(String(stale.id));
          continue;
        }
        break;
      } catch {
        break;
      }
    }

    cleanupRef.current?.();
    cleanupRef.current = null;
    resetBooking();
    router.replace('/(main)');
    isCancellingRef.current = false;
    setIsCancelling(false);
  };

  // Confirm prompt is shown via AlertModal first, then performCancel runs on confirm.
  const handleCancel = () => setConfirmCancelVisible(true);

  const handleRetry = () => {
    setStatus('searching');
    setSearchRadius(searchRadius + 500);
    createOrder();
  };

  if (!pickup) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#6B7380' }}>{t('errors.generic')}</Text>
      </SafeAreaView>
    );
  }

  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.4] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.45, 0] });

  return (
    <View style={{ flex: 1, backgroundColor: '#EBF0F7' }}>
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
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        <Marker
          coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={status === 'searching'}
        >
          {/* Concentric pulse rings + center dot — anchored to GPS coordinate */}
          <View
            style={{
              width: 220 * s,
              height: 220 * s,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Animated outer pulse — expands and fades */}
            {status === 'searching' && (
              <Animated.View
                style={{
                  position: 'absolute',
                  width: 90 * s,
                  height: 90 * s,
                  borderRadius: 45 * s,
                  backgroundColor: 'rgba(3, 102, 251, 0.4)',
                  opacity: pulseOpacity,
                  transform: [{ scale: pulseScale }],
                }}
              />
            )}

            {/* Static halo rings (Figma look) */}
            {[
              { size: 200, opacity: 0.08 },
              { size: 150, opacity: 0.12 },
              { size: 100, opacity: 0.18 },
              { size: 60, opacity: 0.28 },
            ].map((c) => (
              <View
                key={c.size}
                style={{
                  position: 'absolute',
                  width: c.size * s,
                  height: c.size * s,
                  borderRadius: (c.size * s) / 2,
                  backgroundColor: `rgba(3, 102, 251, ${c.opacity})`,
                }}
              />
            ))}

            {/* Center dot */}
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
        </Marker>
      </MapView>

      {/* Top status pill */}
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none">
        <View style={{ alignItems: 'center', marginTop: 8 * s }}>
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 8 * s,
              paddingHorizontal: 16 * s,
              paddingVertical: 10 * s,
              borderRadius: 999,
              backgroundColor: '#FFFFFF',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 14,
              elevation: 6,
            }}
          >
            <DotsIndicator size={6 * s} gap={4 * s} />
            <Text
              style={{
                color: '#111111',
                fontSize: 14 * s,
                fontWeight: '600',
              }}
            >
              {status === 'searching'
                ? t('ride.findingDriver', 'Finding nearby drivers')
                : t('ride.noDrivers', 'No drivers nearby')}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Bottom sheet */}
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
            paddingTop: 18 * s,
            paddingHorizontal: 20 * s,
            paddingBottom: 20 * s,
            gap: 16 * s,
          }}
        >
          {status === 'searching' ? (
            <>
              {/* Title */}
              <View style={{ alignItems: 'center', gap: 4 * s }}>
                <Text
                  style={{
                    color: '#111111',
                    fontSize: 22 * s,
                    fontWeight: '700',
                    letterSpacing: -0.6,
                    textAlign: 'center',
                  }}
                >
                  {t('ride.lookingForDriver', 'Looking for your driver…')}
                </Text>
                <Text
                  style={{
                    color: '#6B7380',
                    fontSize: 14 * s,
                    textAlign: 'center',
                  }}
                >
                  {t('ride.lookingSubtitle', "We'll notify you once a driver accepts")}
                </Text>
              </View>

              {/* Trip card */}
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
                        fontSize: 14 * s,
                        fontWeight: '600',
                        textAlign,
                        writingDirection,
                      }}
                    >
                      {pickup.address || t('home.currentLocation')}
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
                        fontSize: 14 * s,
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

              {/* Cancel button (white with border) */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleCancel}
                disabled={isCancelling}
                style={{
                  height: 56 * s,
                  borderRadius: 14 * s,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: '#E5EBF2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isCancelling ? 0.6 : 1,
                }}
              >
                <Text style={{ color: '#111111', fontSize: 17 * s, fontWeight: '600' }}>
                  {isCancelling
                    ? t('common.loading', 'Loading…')
                    : t('ride.cancelSearch', 'Cancel ride')}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* No drivers */}
              <View style={{ alignItems: 'center', gap: 8 * s }}>
                <Text
                  style={{
                    color: '#111111',
                    fontSize: 22 * s,
                    fontWeight: '700',
                    letterSpacing: -0.6,
                    textAlign: 'center',
                  }}
                >
                  {t('ride.noDrivers', 'No drivers nearby')}
                </Text>
                <Text
                  style={{
                    color: '#6B7380',
                    fontSize: 14 * s,
                    textAlign: 'center',
                  }}
                >
                  {t('errors.noDrivers', 'Please try again in a moment.')}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleRetry}
                style={{
                  height: 56 * s,
                  borderRadius: 14 * s,
                  backgroundColor: '#101969',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 17 * s, fontWeight: '600' }}>
                  {t('ride.tryAgain', 'Try again')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleCancel}
                style={{
                  height: 56 * s,
                  borderRadius: 14 * s,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: '#E5EBF2',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#111111', fontSize: 17 * s, fontWeight: '600' }}>
                  {t('common.cancel', 'Cancel')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>

      {/* Confirm cancel */}
      <AlertModal
        visible={confirmCancelVisible}
        variant="warning"
        title={t('ride.confirmCancelTitle', 'Cancel this ride?')}
        message={t(
          'ride.confirmCancelMsg',
          'You can request a new ride at any time.'
        )}
        primaryLabel={t('ride.cancelSearch', 'Cancel ride')}
        onPrimaryPress={() => {
          setConfirmCancelVisible(false);
          performCancel();
        }}
        secondaryLabel={t('common.back', 'Back')}
        onSecondaryPress={() => setConfirmCancelVisible(false)}
        onRequestClose={() => setConfirmCancelVisible(false)}
      />

      {/* Cancel error */}
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
