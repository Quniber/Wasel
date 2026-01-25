import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Platform, Modal, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MapView, MapMarker as Marker, MapPolyline as Polyline, MAP_PROVIDER_GOOGLE as PROVIDER_GOOGLE } from '@/components/maps/MapView';
import { useThemeStore } from '@/stores/theme-store';
import { useBookingStore, Service, FareEstimate, PaymentMethod } from '@/stores/booking-store';
import { api, orderApi } from '@/lib/api';

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Decode Google polyline
function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

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

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

export default function RoutePreviewScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
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
  } = useBookingStore();
  const isDark = resolvedTheme === 'dark';

  const mapRef = useRef<MapView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string; distanceValue: number; durationValue: number } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const getPaymentLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'cash': return t('booking.payment.cash', { defaultValue: 'Cash' });
      case 'wallet': return t('booking.payment.wallet', { defaultValue: 'Wallet' });
      case 'card': return t('booking.payment.card', { defaultValue: 'Card / Apple Pay' });
    }
  };

  const getPaymentIcon = (method: PaymentMethod): keyof typeof Ionicons.glyphMap => {
    switch (method) {
      case 'cash': return 'cash-outline';
      case 'wallet': return 'wallet-outline';
      case 'card': return 'logo-apple';
    }
  };

  // Set initial route line immediately
  useEffect(() => {
    if (pickup && dropoff) {
      // Set straight line immediately so something shows
      setRouteCoordinates([
        { latitude: pickup.latitude, longitude: pickup.longitude },
        { latitude: dropoff.latitude, longitude: dropoff.longitude },
      ]);

      // Then load the actual route and services
      loadRouteAndServices();
    }
  }, [pickup, dropoff]);

  useEffect(() => {
    if (pickup && dropoff && mapRef.current) {
      // Fit map to show pickup and dropoff
      const coords = routeCoordinates.length > 0
        ? routeCoordinates
        : [
            { latitude: pickup.latitude, longitude: pickup.longitude },
            { latitude: dropoff.latitude, longitude: dropoff.longitude },
          ];

      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 150, right: 50, bottom: 400, left: 50 },
          animated: true,
        });
      }, 500);
    }
  }, [pickup, dropoff, routeCoordinates]);

  const loadRouteAndServices = async () => {
    setIsLoading(true);
    try {
      // Get route from Google Directions API
      await fetchRoute();

      // Load services from API
      const servicesResponse = await orderApi.getServices();
      const loadedServices: Service[] = (servicesResponse.data || []).map((s: any) => ({
        id: s.id.toString(),
        name: s.name,
        description: s.description || '',
        baseFare: parseFloat(s.baseFare) || 0,
        perKilometer: parseFloat(s.perKilometer) || 0,
        perMinute: parseFloat(s.perMinute) || 0,
        minimumFare: parseFloat(s.minimumFare) || 0,
        personCapacity: s.personCapacity || 4,
      }));
      setServices(loadedServices);

      // Calculate fares for each service from backend
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
            // Backend returns: estimatedFare, breakdown.baseFare, breakdown.distanceCost, breakdown.timeCost
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
            };
          } catch (err) {
            console.error('Error calculating fare for service:', service.id, err);
            return null;
          }
        });

        const fares = (await Promise.all(farePromises)).filter(Boolean) as FareEstimate[];
        setFareEstimates(fares);
      }

      // Auto-select first service
      if (!selectedService && loadedServices.length > 0) {
        setSelectedService(loadedServices[0]);
      }
    } catch (error) {
      console.error('Error loading route and services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoute = async () => {
    if (!pickup || !dropoff) return;

    // Always set a straight line first as fallback
    const straightLine = [
      { latitude: pickup.latitude, longitude: pickup.longitude },
      { latitude: dropoff.latitude, longitude: dropoff.longitude },
    ];
    setRouteCoordinates(straightLine);

    // Calculate straight-line distance and estimated time as fallback
    const distanceKm = calculateDistance(
      pickup.latitude, pickup.longitude,
      dropoff.latitude, dropoff.longitude
    );
    const estimatedMinutes = Math.round(distanceKm * 2); // Rough estimate: 2 min per km

    setRouteInfo({
      distance: `${distanceKm.toFixed(1)} km`,
      duration: `${estimatedMinutes} min`,
      distanceValue: distanceKm * 1000,
      durationValue: estimatedMinutes * 60,
    });

    try {
      // Use backend proxy for directions API
      console.log('Fetching route via backend proxy...');
      const response = await orderApi.getDirections({
        originLat: pickup.latitude,
        originLng: pickup.longitude,
        destLat: dropoff.latitude,
        destLng: dropoff.longitude,
      });
      const data = response.data;

      console.log('Directions API response:', data.status);

      if (data.status === 'OK' && data.polyline) {
        // Decode polyline for actual route
        const points = decodePolyline(data.polyline);
        if (points.length > 0) {
          setRouteCoordinates(points);
          console.log('Route decoded with', points.length, 'points');
        }

        // Set actual route info from backend response
        setRouteInfo({
          distance: data.distance.text,
          duration: data.duration.text,
          distanceValue: data.distance.value,
          durationValue: data.duration.value,
        });
      } else {
        console.log('Directions API error:', data.status, data.error);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      // Keep the straight line fallback that was already set
    }
  };

  const getFareForService = (serviceId: string) => {
    return fareEstimates.find((f) => f.serviceId === serviceId);
  };

  const [isRequestingRide, setIsRequestingRide] = useState(false);

  const handleRequestRide = async () => {
    console.log('[RoutePreview] handleRequestRide called:', {
      hasPickup: !!pickup,
      hasDropoff: !!dropoff,
      hasSelectedService: !!selectedService,
      paymentMethod,
    });

    if (!pickup || !dropoff || !selectedService) {
      console.log('[RoutePreview] Cannot request ride - missing data');
      return;
    }

    const fare = getFareForService(selectedService.id);
    const amount = fare?.totalFare || selectedService.minimumFare || 15;

    // For card payments, show payment screen first
    if (paymentMethod === 'card') {
      setIsRequestingRide(true);
      try {
        // Create pre-payment session
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
          // Navigate to payment screen with WebView
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
          Alert.alert(
            t('payment.error.title', { defaultValue: 'Payment Error' }),
            response.data.error || t('payment.error.message', { defaultValue: 'Failed to create payment. Please try again.' })
          );
        }
      } catch (error: any) {
        console.error('[RoutePreview] Error creating pre-payment:', error);
        Alert.alert(
          t('payment.error.title', { defaultValue: 'Payment Error' }),
          error.response?.data?.message || t('payment.error.message', { defaultValue: 'Failed to create payment. Please try again.' })
        );
      } finally {
        setIsRequestingRide(false);
      }
    } else {
      // For cash/wallet, proceed directly to finding driver
      console.log('[RoutePreview] Navigating to finding-driver');
      router.push('/(main)/finding-driver');
    }
  };

  if (!pickup || !dropoff) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
        <Text className="text-muted-foreground">{t('errors.generic')}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-primary">{t('common.back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const selectedFare = selectedService ? getFareForService(selectedService.id) : null;

  return (
    <View className="flex-1">
      {/* Map with Route */}
      <View className="flex-1">
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: (pickup.latitude + dropoff.latitude) / 2,
            longitude: (pickup.longitude + dropoff.longitude) / 2,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {/* Pickup Marker */}
          <Marker coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}>
            <View className="items-center">
              <View className="w-8 h-8 rounded-full bg-primary items-center justify-center border-2 border-white shadow-lg">
                <Ionicons name="location" size={18} color="white" />
              </View>
            </View>
          </Marker>

          {/* Dropoff Marker */}
          <Marker coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }}>
            <View className="items-center">
              <View className="w-8 h-8 rounded-full bg-destructive items-center justify-center border-2 border-white shadow-lg">
                <Ionicons name="flag" size={18} color="white" />
              </View>
            </View>
          </Marker>

          {/* Route Line */}
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#4CAF50"
              strokeWidth={4}
            />
          )}
        </MapView>

        {/* Back button */}
        <SafeAreaView className="absolute top-0 left-0" edges={['top']}>
          <TouchableOpacity
            onPress={() => router.back()}
            className={`m-4 w-12 h-12 rounded-full items-center justify-center shadow-lg ${
              isDark ? 'bg-background-dark' : 'bg-white'
            }`}
          >
            <Ionicons name="arrow-back" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Route Info Card */}
        {routeInfo && (
          <View className="absolute top-20 left-4 right-4">
            <View className={`flex-row rounded-xl shadow-lg p-4 ${isDark ? 'bg-background-dark' : 'bg-white'}`}>
              <View className="flex-1 items-center border-r border-border dark:border-border-dark">
                <Ionicons name="navigate" size={24} color="#4CAF50" />
                <Text className={`text-lg font-bold mt-1 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                  {routeInfo.distance}
                </Text>
                <Text className="text-xs text-muted-foreground">{t('booking.distance')}</Text>
              </View>
              <View className="flex-1 items-center">
                <Ionicons name="time" size={24} color="#2196F3" />
                <Text className={`text-lg font-bold mt-1 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                  {routeInfo.duration}
                </Text>
                <Text className="text-xs text-muted-foreground">{t('booking.time')}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Bottom Sheet - Services & Price */}
      <SafeAreaView
        edges={['bottom']}
        className={`rounded-t-3xl shadow-lg ${isDark ? 'bg-background-dark' : 'bg-white'}`}
      >
        <View className="px-4 pt-4 pb-2">
          {/* Drag Handle */}
          <View className="w-12 h-1 bg-muted dark:bg-muted-dark rounded-full self-center mb-4" />

          {/* Route Summary */}
          <View className="flex-row items-center mb-4">
            <View className="w-3 h-3 rounded-full bg-primary" />
            <Text className={`ml-2 text-sm flex-1 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`} numberOfLines={1}>
              {pickup.address}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#757575" className="mx-2" />
            <View className="w-3 h-3 rounded-full bg-destructive" />
            <Text className={`ml-2 text-sm flex-1 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`} numberOfLines={1}>
              {dropoff.address}
            </Text>
          </View>

          {/* Services */}
          {isLoading ? (
            <View className="py-8 items-center">
              <ActivityIndicator size="large" color="#0366FB" />
              <Text className="text-muted-foreground mt-2">{t('common.loading')}</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {services.map((service) => {
                const fare = getFareForService(service.id);
                const isSelected = selectedService?.id === service.id;

                return (
                  <TouchableOpacity
                    key={service.id}
                    onPress={() => setSelectedService(service)}
                    className={`mr-3 p-4 rounded-xl border-2 min-w-[140px] ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : isDark
                        ? 'border-border-dark bg-card-dark'
                        : 'border-border bg-card'
                    }`}
                  >
                    <View className="items-center">
                      <Ionicons
                        name="car"
                        size={32}
                        color={isSelected ? '#4CAF50' : (isDark ? '#FAFAFA' : '#212121')}
                      />
                      <Text className={`text-base font-semibold mt-2 ${isSelected ? 'text-primary' : (isDark ? 'text-foreground-dark' : 'text-foreground')}`}>
                        {service.name}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {service.personCapacity} {t('booking.seats', { count: service.personCapacity })}
                      </Text>
                      <Text className={`text-xl font-bold mt-2 ${isSelected ? 'text-primary' : (isDark ? 'text-foreground-dark' : 'text-foreground')}`}>
                        {fare ? `${fare.currency} ${fare.totalFare.toFixed(2)}` : '...'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Selected Service Details */}
          {selectedFare && (
            <View className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}>
              <View className="flex-row justify-between mb-2">
                <Text className="text-muted-foreground">{t('booking.baseFare')}</Text>
                <Text className={isDark ? 'text-foreground-dark' : 'text-foreground'}>
                  {selectedFare.currency} {selectedFare.baseFare.toFixed(2)}
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-muted-foreground">{t('booking.distanceFare')}</Text>
                <Text className={isDark ? 'text-foreground-dark' : 'text-foreground'}>
                  {selectedFare.currency} {selectedFare.distanceFare.toFixed(2)}
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-muted-foreground">{t('booking.timeFare')}</Text>
                <Text className={isDark ? 'text-foreground-dark' : 'text-foreground'}>
                  {selectedFare.currency} {selectedFare.timeFare.toFixed(2)}
                </Text>
              </View>
              <View className="border-t border-border dark:border-border-dark pt-2 mt-2 flex-row justify-between">
                <Text className={`font-bold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                  {t('booking.total')}
                </Text>
                <Text className={`font-bold text-lg ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                  {selectedFare.currency} {selectedFare.totalFare.toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          {/* Payment Method Selector */}
          <TouchableOpacity
            onPress={() => setShowPaymentModal(true)}
            className={`flex-row items-center justify-between p-4 rounded-xl mb-4 ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}
          >
            <View className="flex-row items-center">
              <Ionicons name={getPaymentIcon(paymentMethod)} size={24} color="#4CAF50" />
              <Text className={`ml-3 font-medium ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {getPaymentLabel(paymentMethod)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#757575" />
          </TouchableOpacity>

          {/* Request Ride Button */}
          <TouchableOpacity
            onPress={handleRequestRide}
            disabled={!selectedService || isLoading || isRequestingRide}
            className={`py-4 rounded-xl items-center flex-row justify-center ${selectedService && !isLoading && !isRequestingRide ? 'bg-primary' : 'bg-muted dark:bg-muted-dark'}`}
          >
            {isRequestingRide ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text className="text-white text-lg font-semibold ml-2">
                  {t('payment.processing', { defaultValue: 'Processing...' })}
                </Text>
              </>
            ) : (
              <Text className={`text-lg font-semibold ${selectedService && !isLoading ? 'text-white' : 'text-muted-foreground'}`}>
                {paymentMethod === 'card'
                  ? t('booking.payAndRequest', { defaultValue: 'Pay & Request Ride' })
                  : t('booking.requestRide')}
              </Text>
            )}
          </TouchableOpacity>

          {/* Schedule Later */}
          <TouchableOpacity
            onPress={() => router.push('/(main)/schedule')}
            className="mt-3 py-3 items-center"
          >
            <Text className="text-primary font-medium">
              {t('booking.scheduleLater')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Payment Method Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={() => setShowPaymentModal(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className={`rounded-t-3xl ${isDark ? 'bg-background-dark' : 'bg-white'}`}
          >
            <SafeAreaView edges={['bottom']}>
              <View className="p-6">
                <View className="w-12 h-1 bg-muted dark:bg-muted-dark rounded-full self-center mb-4" />
                <Text className={`text-xl font-bold mb-6 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                  {t('booking.payment.selectMethod', { defaultValue: 'Select Payment Method' })}
                </Text>

                {(['cash', 'wallet', 'card'] as PaymentMethod[]).map((method) => (
                  <TouchableOpacity
                    key={method}
                    onPress={() => {
                      setPaymentMethod(method);
                      setShowPaymentModal(false);
                    }}
                    className={`flex-row items-center p-4 rounded-xl mb-3 ${
                      paymentMethod === method
                        ? 'bg-primary/10 border-2 border-primary'
                        : isDark
                        ? 'bg-muted-dark'
                        : 'bg-muted'
                    }`}
                  >
                    <View className={`w-12 h-12 rounded-full items-center justify-center ${
                      paymentMethod === method ? 'bg-primary' : isDark ? 'bg-background-dark' : 'bg-white'
                    }`}>
                      <Ionicons
                        name={getPaymentIcon(method)}
                        size={24}
                        color={paymentMethod === method ? '#FFFFFF' : '#4CAF50'}
                      />
                    </View>
                    <View className="ml-4 flex-1">
                      <Text className={`font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                        {getPaymentLabel(method)}
                      </Text>
                      <Text className="text-muted-foreground text-sm">
                        {method === 'cash' && t('booking.payment.cashDesc', { defaultValue: 'Pay with cash to driver' })}
                        {method === 'wallet' && t('booking.payment.walletDesc', { defaultValue: 'Pay from your wallet balance' })}
                        {method === 'card' && t('booking.payment.cardDesc', { defaultValue: 'Apple Pay or credit/debit card' })}
                      </Text>
                    </View>
                    {paymentMethod === method && (
                      <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    )}
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  onPress={() => setShowPaymentModal(false)}
                  className="mt-4 py-4 items-center"
                >
                  <Text className="text-muted-foreground font-medium">
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
