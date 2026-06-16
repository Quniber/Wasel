import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  MapView,
  MapMarker as Marker,
  MapPolyline as Polyline,
  MAP_PROVIDER_GOOGLE as PROVIDER_GOOGLE,
} from '@/components/maps/MapView';
import { useBookingStore, Service, FareEstimate, PaymentMethod } from '@/stores/booking-store';
import { api, orderApi } from '@/lib/api';
import AlertModal from '@/components/AlertModal';
import CouponModal from '@/components/CouponModal';
import BottomSheet from '@/components/BottomSheet';

const BASE_W = 393;

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

export default function RoutePreviewScreen() {
  const { t, i18n } = useTranslation();
  const {
    pickup,
    dropoff,
    services,
    setServices,
    selectedService,
    setSelectedService,
    fareEstimates,
    setFareEstimates,
    paymentMethod,
    setPaymentMethod,
    couponCode,
    couponDiscount,
    setCoupon,
  } = useBookingStore();
  const { width, height } = useWindowDimensions();
  const s = width / BASE_W;

  const isRTL = i18n.language === 'ar';
  const writingDirection: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const mapRef = useRef<MapView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestingRide, setIsRequestingRide] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
    distanceValue: number;
    durationValue: number;
  } | null>(null);
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [errorModal, setErrorModal] = useState<{ title: string; msg: string } | null>(null);

  // Bottom sheet sizing — measured from actual content layout so there's no extra empty space.
  const [sheetHeight, setSheetHeight] = useState(0);
  const SHEET_COLLAPSED_HEIGHT = 110 * s; // shows handle + title strip + a peek
  const sheetTranslateY = useSharedValue(0);
  const COLLAPSE_DELTA = Math.max(0, sheetHeight - SHEET_COLLAPSED_HEIGHT);

  const onSheetLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h && Math.abs(h - sheetHeight) > 1) setSheetHeight(h);
  };

  const collapseSheet = () =>
    (sheetTranslateY.value = withSpring(COLLAPSE_DELTA, { damping: 18, stiffness: 160 }));
  const expandSheet = () =>
    (sheetTranslateY.value = withSpring(0, { damping: 18, stiffness: 160 }));

  const panGesture = Gesture.Pan()
    .onChange((e) => {
      const next = sheetTranslateY.value + e.changeY;
      sheetTranslateY.value = Math.max(0, Math.min(COLLAPSE_DELTA, next));
    })
    .onEnd((e) => {
      const halfway = COLLAPSE_DELTA / 2;
      // If user flicked down or moved past halfway, collapse; otherwise expand
      if (e.velocityY > 600 || sheetTranslateY.value > halfway) {
        sheetTranslateY.value = withSpring(COLLAPSE_DELTA, { damping: 18, stiffness: 160 });
      } else {
        sheetTranslateY.value = withSpring(0, { damping: 18, stiffness: 160 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  // Initial route line + load services
  useEffect(() => {
    if (pickup && dropoff) {
      setRouteCoordinates([
        { latitude: pickup.latitude, longitude: pickup.longitude },
        { latitude: dropoff.latitude, longitude: dropoff.longitude },
      ]);
      loadRouteAndServices();
    }
  }, [pickup, dropoff]);

  const fitMap = () => {
    if (!pickup || !dropoff || !mapRef.current) return;
    const coords =
      routeCoordinates.length > 0
        ? routeCoordinates
        : [
            { latitude: pickup.latitude, longitude: pickup.longitude },
            { latitude: dropoff.latitude, longitude: dropoff.longitude },
          ];
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: {
        top: 120,
        right: 60,
        bottom: (sheetHeight || 460 * s) + 40,
        left: 60,
      },
      animated: true,
    });
  };

  useEffect(() => {
    if (pickup && dropoff && mapRef.current && routeCoordinates.length > 0) {
      setTimeout(fitMap, 500);
    }
  }, [routeCoordinates]);

  const loadRouteAndServices = async () => {
    setIsLoading(true);
    try {
      await fetchRoute();
      const servicesResponse = await orderApi.getServices();
      const loadedServices: Service[] = (servicesResponse.data || []).map((sr: any) => ({
        id: sr.id.toString(),
        name: sr.name,
        description: sr.description || '',
        baseFare: parseFloat(sr.baseFare) || 0,
        perKilometer: parseFloat(sr.perKilometer) || 0,
        perMinute: parseFloat(sr.perMinute) || 0,
        minimumFare: parseFloat(sr.minimumFare) || 0,
        personCapacity: sr.personCapacity || 4,
      }));
      setServices(loadedServices);

      if (pickup && dropoff && loadedServices.length > 0) {
        const farePromises = loadedServices.map(async (service) => {
          try {
            const fareResponse = await orderApi.calculateFare({
              serviceId: parseInt(service.id, 10),
              pickupLatitude: pickup.latitude,
              pickupLongitude: pickup.longitude,
              dropoffLatitude: dropoff.latitude,
              dropoffLongitude: dropoff.longitude,
            });
            const data = fareResponse.data;
            return {
              serviceId: service.id,
              baseFare: parseFloat(data.breakdown?.baseFare) || 0,
              distanceFare: parseFloat(data.breakdown?.distanceCost) || 0,
              timeFare: parseFloat(data.breakdown?.timeCost) || 0,
              totalFare: parseFloat(data.estimatedFare) || 0,
              currency: data.currency || 'QAR',
              distance: parseFloat(data.distance) || 0,
              duration: parseFloat(data.estimatedDuration) || 0,
              eta: parseInt(data.estimatedDuration) || 5,
            } as FareEstimate;
          } catch {
            return null;
          }
        });
        const fares = (await Promise.all(farePromises)).filter(Boolean) as FareEstimate[];
        setFareEstimates(fares);
      }

      if (!selectedService && loadedServices.length > 0) {
        setSelectedService(loadedServices[0]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoute = async () => {
    if (!pickup || !dropoff) return;
    const straightLine = [
      { latitude: pickup.latitude, longitude: pickup.longitude },
      { latitude: dropoff.latitude, longitude: dropoff.longitude },
    ];
    setRouteCoordinates(straightLine);
    const distanceKm = calculateDistance(
      pickup.latitude,
      pickup.longitude,
      dropoff.latitude,
      dropoff.longitude
    );
    const estimatedMinutes = Math.round(distanceKm * 2);
    setRouteInfo({
      distance: `${distanceKm.toFixed(1)} km`,
      duration: `${estimatedMinutes} min`,
      distanceValue: distanceKm * 1000,
      durationValue: estimatedMinutes * 60,
    });
    try {
      const response = await orderApi.getDirections({
        originLat: pickup.latitude,
        originLng: pickup.longitude,
        destLat: dropoff.latitude,
        destLng: dropoff.longitude,
      });
      const data = response.data;
      if (data.status === 'OK' && data.polyline) {
        const points = decodePolyline(data.polyline);
        if (points.length > 0) setRouteCoordinates(points);
        setRouteInfo({
          distance: data.distance.text,
          duration: data.duration.text,
          distanceValue: data.distance.value,
          durationValue: data.duration.value,
        });
      }
    } catch {}
  };

  const getFareForService = (serviceId: string) =>
    fareEstimates.find((f) => f.serviceId === serviceId);

  const getPaymentLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'cash':
        return t('booking.payment.cash', { defaultValue: 'Cash' });
      case 'wallet':
        return t('booking.payment.wallet', { defaultValue: 'Wallet' });
      case 'card':
        return t('booking.payment.card', { defaultValue: 'Card / Apple Pay' });
    }
  };
  const getPaymentIcon = (method: PaymentMethod): keyof typeof Ionicons.glyphMap => {
    switch (method) {
      case 'cash':
        return 'cash-outline';
      case 'wallet':
        return 'wallet-outline';
      case 'card':
        return 'card-outline';
    }
  };

  const handleRequestRide = async () => {
    if (!pickup || !dropoff || !selectedService) return;
    const fare = getFareForService(selectedService.id);
    const amount = fare?.totalFare || selectedService.minimumFare || 15;

    if (paymentMethod === 'card') {
      setIsRequestingRide(true);
      try {
        const response = await api.post('/skipcash/prepay', {
          amount,
          serviceId: parseInt(selectedService.id, 10),
          pickupAddress: pickup.address,
          pickupLatitude: pickup.latitude,
          pickupLongitude: pickup.longitude,
          dropoffAddress: dropoff.address,
          dropoffLatitude: dropoff.latitude,
          dropoffLongitude: dropoff.longitude,
        });
        if (response.data.success && response.data.payUrl) {
          router.push({
            pathname: '/(main)/payment',
            params: {
              payUrl: response.data.payUrl,
              amount: String(amount),
              isPrePay: 'true',
              serviceId: selectedService.id,
            },
          });
        } else {
          setErrorModal({
            title: t('payment.error.title', { defaultValue: 'Payment Error' }),
            msg:
              response.data.error ||
              t('payment.error.message', {
                defaultValue: 'Failed to create payment. Please try again.',
              }),
          });
        }
      } catch (error: any) {
        setErrorModal({
          title: t('payment.error.title', { defaultValue: 'Payment Error' }),
          msg:
            error.response?.data?.message ||
            t('payment.error.message', {
              defaultValue: 'Failed to create payment. Please try again.',
            }),
        });
      } finally {
        setIsRequestingRide(false);
      }
    } else {
      router.push('/(main)/finding-driver');
    }
  };

  if (!pickup || !dropoff) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFFFFF',
        }}
      >
        <Text style={{ color: '#6B7380' }}>{t('errors.generic')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#101969' }}>{t('common.back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const selectedFare = selectedService ? getFareForService(selectedService.id) : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#EBF0F7' }}>
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: (pickup.latitude + dropoff.latitude) / 2,
          longitude: (pickup.longitude + dropoff.longitude) / 2,
          latitudeDelta: Math.abs(pickup.latitude - dropoff.latitude) * 1.5 + 0.01,
          longitudeDelta: Math.abs(pickup.longitude - dropoff.longitude) * 1.5 + 0.01,
        }}
        onMapReady={fitMap}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {/* Pickup marker (blue circle pulse, matches home) */}
        <Marker coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}>
          <View
            style={{
              width: 32 * s,
              height: 32 * s,
              borderRadius: 16 * s,
              backgroundColor: 'rgba(3, 102, 251, 0.20)',
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

        {/* Dropoff marker (red pin) */}
        <Marker coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }}>
          <Ionicons name="location" size={32 * s} color="#ED4557" />
        </Marker>

        {routeCoordinates.length > 0 && (
          <Polyline coordinates={routeCoordinates} strokeColor="#0366FB" strokeWidth={4} />
        )}
      </MapView>

      {/* Floating back button */}
      <SafeAreaView
        edges={['top']}
        style={{ position: 'absolute', top: 0, left: 0 }}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.back()}
          style={{
            marginLeft: 20 * s,
            marginTop: 8 * s,
            width: 48 * s,
            height: 48 * s,
            borderRadius: 24 * s,
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
          <Ionicons
            name={isRTL ? 'chevron-forward' : 'chevron-back'}
            size={22 * s}
            color="#111111"
          />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Bottom sheet — auto-sizes to content via onLayout */}
      <Animated.View
        onLayout={onSheetLayout}
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 28 * s,
            borderTopRightRadius: 28 * s,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 24,
            elevation: 12,
          },
          sheetStyle,
        ]}
      >
        {/* Drag handle area (gesture detector) */}
        <GestureDetector gesture={panGesture}>
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

        <View style={{ paddingHorizontal: 20 * s, paddingBottom: 28 * s, gap: 14 * s }}>
          {/* Title row */}
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 8 * s,
            }}
          >
            <Text
              style={{
                flex: 1,
                color: '#111111',
                fontSize: 22 * s,
                fontWeight: '700',
                letterSpacing: -0.6,
                textAlign,
                writingDirection,
              }}
            >
              {t('booking.chooseRide')}
            </Text>
            {routeInfo && (
              <Text
                style={{
                  color: '#6B7380',
                  fontSize: 13 * s,
                  fontWeight: '500',
                }}
              >
                {routeInfo.distance} · {routeInfo.duration}
              </Text>
            )}
          </View>

          {/* Service rows */}
          <View style={{ gap: 8 * s }}>
            {isLoading ? (
              <View style={{ paddingVertical: 24 * s, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#101969" />
              </View>
            ) : (
              <ScrollView
                style={{ maxHeight: 250 * s }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 * s }}
              >
                {services.map((service) => {
                  const fare = getFareForService(service.id);
                  const isSelected = selectedService?.id === service.id;
                  return (
                    <TouchableOpacity
                      key={service.id}
                      activeOpacity={0.85}
                      onPress={() => setSelectedService(service)}
                      style={{
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                        alignItems: 'center',
                        gap: 14 * s,
                        height: 76 * s,
                        paddingLeft: 14 * s,
                        paddingRight: 16 * s,
                        paddingVertical: 10 * s,
                        borderRadius: 16 * s,
                        backgroundColor: isSelected ? '#F5F7FC' : '#FFFFFF',
                        borderWidth: isSelected ? 1.6 : 1,
                        borderColor: isSelected ? '#101969' : '#E5EBF2',
                      }}
                    >
                      {/* Car illustration */}
                      <View
                        style={{
                          width: 64 * s,
                          height: 44 * s,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="car-sport" size={42 * s} color="#101969" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          numberOfLines={1}
                          style={{
                            color: '#111111',
                            fontSize: 16 * s,
                            fontWeight: '700',
                            textAlign,
                            writingDirection,
                          }}
                        >
                          {service.name}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={{
                            marginTop: 2 * s,
                            color: '#6B7380',
                            fontSize: 12 * s,
                            textAlign,
                            writingDirection,
                          }}
                        >
                          {fare?.eta || 5} {t('booking.minutes', { count: fare?.eta || 5 })} ·{' '}
                          {service.personCapacity}{' '}
                          {t('booking.seats', { count: service.personCapacity })}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: '#111111',
                          fontSize: 16 * s,
                          fontWeight: '700',
                        }}
                      >
                        {fare ? `${fare.currency} ${fare.totalFare.toFixed(2)}` : '...'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Payment + Coupon row */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10 * s }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setPaymentSheetVisible(true)}
              style={{
                flex: 1,
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                gap: 8 * s,
                height: 56 * s,
                paddingLeft: 12 * s,
                paddingRight: 8 * s,
                paddingVertical: 10 * s,
                borderRadius: 14 * s,
                backgroundColor: '#F5F7FC',
                borderWidth: 1,
                borderColor: '#E5EBF2',
              }}
            >
              <Ionicons name={getPaymentIcon(paymentMethod)} size={20 * s} color="#101969" />
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
                  {t('booking.payment.title', { defaultValue: 'Payment' })}
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
                  {getPaymentLabel(paymentMethod)}
                </Text>
              </View>
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={16 * s}
                color="#6B7380"
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setCouponModalVisible(true)}
              style={{
                flex: 1,
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                gap: 8 * s,
                height: 56 * s,
                paddingLeft: 12 * s,
                paddingRight: 8 * s,
                paddingVertical: 10 * s,
                borderRadius: 14 * s,
                backgroundColor: couponCode ? '#E0F0FF' : '#F5F7FC',
                borderWidth: couponCode ? 1.6 : 1,
                borderColor: couponCode ? '#101969' : '#E5EBF2',
              }}
            >
              <Ionicons name="pricetag-outline" size={20 * s} color="#101969" />
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
                  {t('booking.coupon.label', 'Coupon')}
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
                  {couponCode
                    ? `${couponCode}${couponDiscount ? ` · −QAR ${couponDiscount.toFixed(2)}` : ''}`
                    : t('booking.coupon.addCode', 'Add code')}
                </Text>
              </View>
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={16 * s}
                color="#6B7380"
              />
            </TouchableOpacity>
          </View>

          {/* Confirm button */}
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={!selectedService || isLoading || isRequestingRide}
            onPress={handleRequestRide}
            style={{
              height: 56 * s,
              borderRadius: 14 * s,
              backgroundColor: selectedService && !isLoading ? '#101969' : '#C7CDD8',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8 * s,
            }}
          >
            {isRequestingRide ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={{ color: '#FFFFFF', fontSize: 16 * s, fontWeight: '600' }}>
                  {t('payment.processingShort', { defaultValue: 'Processing...' })}
                </Text>
              </>
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 16 * s, fontWeight: '600' }}>
                {selectedService && selectedFare
                  ? `${t('common.confirm')} ${selectedService.name} · ${selectedFare.currency} ${selectedFare.totalFare.toFixed(2)}`
                  : t('booking.requestRide')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Payment method bottom sheet */}
      <BottomSheet
        visible={paymentSheetVisible}
        onClose={() => setPaymentSheetVisible(false)}
      >
        <View style={{ gap: 12 * s }}>
          <Text
            style={{
              color: '#111111',
              fontSize: 18 * s,
              fontWeight: '700',
              textAlign,
              writingDirection,
            }}
          >
            {t('booking.payment.selectMethod', { defaultValue: 'Select Payment Method' })}
          </Text>
          {(['cash', 'wallet', 'card'] as PaymentMethod[]).map((method) => {
            const isSelected = paymentMethod === method;
            return (
              <TouchableOpacity
                key={method}
                activeOpacity={0.85}
                onPress={() => {
                  setPaymentMethod(method);
                  setPaymentSheetVisible(false);
                }}
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  gap: 14 * s,
                  padding: 14 * s,
                  borderRadius: 14 * s,
                  backgroundColor: isSelected ? '#F5F7FC' : '#FFFFFF',
                  borderWidth: isSelected ? 1.6 : 1,
                  borderColor: isSelected ? '#101969' : '#E5EBF2',
                }}
              >
                <Ionicons name={getPaymentIcon(method)} size={22 * s} color="#101969" />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: '#111111',
                      fontSize: 15 * s,
                      fontWeight: '600',
                      textAlign,
                      writingDirection,
                    }}
                  >
                    {getPaymentLabel(method)}
                  </Text>
                  <Text
                    style={{
                      color: '#6B7380',
                      fontSize: 12 * s,
                      marginTop: 2 * s,
                      textAlign,
                      writingDirection,
                    }}
                  >
                    {method === 'cash' &&
                      t('booking.payment.cashDesc', { defaultValue: 'Pay with cash to driver' })}
                    {method === 'wallet' &&
                      t('booking.payment.walletDesc', {
                        defaultValue: 'Pay from your wallet balance',
                      })}
                    {method === 'card' &&
                      t('booking.payment.cardDesc', {
                        defaultValue: 'Apple Pay or credit/debit card',
                      })}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22 * s} color="#101969" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheet>

      {/* Coupon modal */}
      <CouponModal
        visible={couponModalVisible}
        onClose={() => setCouponModalVisible(false)}
        onApply={({ code, discount }) => setCoupon(code, discount)}
        serviceId={selectedService?.id}
        appliedCode={couponCode}
      />

      {/* Error modal */}
      <AlertModal
        visible={!!errorModal}
        variant="error"
        title={errorModal?.title || ''}
        message={errorModal?.msg}
        primaryLabel={t('common.ok', 'OK')}
        onPrimaryPress={() => setErrorModal(null)}
        onRequestClose={() => setErrorModal(null)}
      />
    </View>
  );
}
