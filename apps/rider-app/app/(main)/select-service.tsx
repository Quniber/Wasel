import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, ActivityIndicator, TextInput, Modal } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MapView, MapMarker as Marker, MapPolyline as Polyline, MAP_PROVIDER_GOOGLE as PROVIDER_GOOGLE } from '@/components/maps/MapView';
import { useThemeStore } from '@/stores/theme-store';
import { useBookingStore, Service, FareEstimate } from '@/stores/booking-store';
import { orderApi, couponApi } from '@/lib/api';

export default function SelectServiceScreen() {
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
    couponCode,
    couponDiscount,
    setCoupon,
  } = useBookingStore();
  const isDark = resolvedTheme === 'dark';

  const mapRef = useRef<MapView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    loadServicesAndFares();
  }, []);

  useEffect(() => {
    if (pickup && dropoff && mapRef.current) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: pickup.latitude, longitude: pickup.longitude },
          { latitude: dropoff.latitude, longitude: dropoff.longitude },
        ],
        {
          edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
          animated: true,
        }
      );
    }
  }, [pickup, dropoff]);

  const loadServicesAndFares = async () => {
    try {
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

      // Calculate fares for each service
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
      console.error('Error loading services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponInput || !selectedService) return;

    try {
      const response = await couponApi.validateCoupon(couponInput, selectedService.id);
      setCoupon(couponInput, response.data.discount || 0);
      setShowCouponModal(false);
      setCouponInput('');
      setCouponError('');
    } catch (error: any) {
      setCouponError(error.response?.data?.message || t('booking.coupon.invalid'));
    }
  };

  const handleRequestRide = () => {
    router.push('/(main)/finding-driver');
  };

  const getFareForService = (serviceId: string) => {
    return fareEstimates.find((f) => f.serviceId === serviceId);
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

  return (
    <View className="flex-1">
      {/* Mini Map */}
      <View className="h-48">
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
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Marker coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}>
            <View className="w-4 h-4 rounded-full bg-primary border-2 border-white" />
          </Marker>
          <Marker coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }}>
            <View className="w-4 h-4 rounded-full bg-destructive border-2 border-white" />
          </Marker>
          <Polyline
            coordinates={[
              { latitude: pickup.latitude, longitude: pickup.longitude },
              { latitude: dropoff.latitude, longitude: dropoff.longitude },
            ]}
            strokeColor="#4CAF50"
            strokeWidth={3}
          />
        </MapView>

        {/* Back button */}
        <SafeAreaView className="absolute top-0 left-0" edges={['top']}>
          <TouchableOpacity
            onPress={() => router.back()}
            className={`m-4 w-10 h-10 rounded-full items-center justify-center shadow-lg ${
              isDark ? 'bg-background-dark' : 'bg-white'
            }`}
          >
            <Ionicons name="arrow-back" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      {/* Route Summary */}
      <View className={`px-4 py-3 flex-row items-center border-b ${isDark ? 'bg-background-dark border-border-dark' : 'bg-white border-border'}`}>
        <View className="flex-1 flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-primary" />
          <Text className={`ml-2 text-sm flex-1 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`} numberOfLines={1}>
            {pickup.address}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color="#757575" />
        <View className="flex-1 flex-row items-center ml-2">
          <View className="w-3 h-3 rounded-full bg-destructive" />
          <Text className={`ml-2 text-sm flex-1 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`} numberOfLines={1}>
            {dropoff.address}
          </Text>
        </View>
      </View>

      {/* Services List */}
      <ScrollView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
        <Text className={`px-4 py-3 font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
          {t('booking.chooseRide')}
        </Text>

        {isLoading ? (
          <View className="py-8 items-center">
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
        ) : (
          services.map((service) => {
            const fare = getFareForService(service.id);
            const isSelected = selectedService?.id === service.id;

            return (
              <TouchableOpacity
                key={service.id}
                onPress={() => setSelectedService(service)}
                className={`mx-4 mb-3 p-4 rounded-xl border-2 ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : isDark
                    ? 'border-border-dark bg-card-dark'
                    : 'border-border bg-card'
                }`}
              >
                <View className="flex-row items-center">
                  <View className="w-14 h-14 rounded-full bg-muted dark:bg-muted-dark items-center justify-center">
                    <Ionicons name="car" size={28} color={isSelected ? '#4CAF50' : (isDark ? '#FAFAFA' : '#212121')} />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className={`text-lg font-semibold ${isSelected ? 'text-primary' : (isDark ? 'text-foreground-dark' : 'text-foreground')}`}>
                      {service.name}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {t('booking.seats', { count: service.personCapacity })} • {fare ? t('booking.minutes', { count: fare.eta }) : '...'}
                    </Text>
                  </View>
                  <Text className={`text-xl font-bold ${isSelected ? 'text-primary' : (isDark ? 'text-foreground-dark' : 'text-foreground')}`}>
                    QAR {fare?.totalFare.toFixed(2) || '...'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <SafeAreaView
        edges={['bottom']}
        className={`border-t ${isDark ? 'bg-background-dark border-border-dark' : 'bg-white border-border'}`}
      >
        <View className="px-4 py-4">
          {/* Payment & Coupon */}
          <View className="flex-row mb-4">
            <TouchableOpacity className={`flex-1 flex-row items-center px-4 py-3 rounded-xl mr-2 ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}>
              <Ionicons name="cash" size={20} color="#4CAF50" />
              <Text className={`ml-2 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {t('booking.payment.cash')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowCouponModal(true)}
              className={`flex-1 flex-row items-center px-4 py-3 rounded-xl ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}
            >
              <Ionicons name="pricetag" size={20} color="#4CAF50" />
              <Text className={`ml-2 flex-1 ${couponCode ? 'text-primary' : (isDark ? 'text-foreground-dark' : 'text-foreground')}`}>
                {couponCode || t('booking.coupon.apply')}
              </Text>
              {couponCode && (
                <Text className="text-primary font-semibold">-${couponDiscount}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Request Ride Button */}
          <TouchableOpacity
            onPress={handleRequestRide}
            disabled={!selectedService}
            className={`py-4 rounded-xl items-center ${selectedService ? 'bg-primary' : 'bg-muted dark:bg-muted-dark'}`}
          >
            <Text className={`text-lg font-semibold ${selectedService ? 'text-white' : 'text-muted-foreground'}`}>
              {t('booking.requestRide')}
            </Text>
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

      {/* Coupon Modal */}
      <Modal visible={showCouponModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className={`rounded-t-3xl p-6 ${isDark ? 'bg-background-dark' : 'bg-white'}`}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className={`text-xl font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {t('booking.coupon.apply')}
              </Text>
              <TouchableOpacity onPress={() => setShowCouponModal(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-2">
              <TextInput
                className={`flex-1 px-4 py-3 rounded-xl text-base ${isDark ? 'bg-muted-dark text-foreground-dark' : 'bg-muted text-foreground'}`}
                placeholder={t('booking.coupon.enter')}
                placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
                value={couponInput}
                onChangeText={setCouponInput}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                onPress={handleApplyCoupon}
                className="px-6 py-3 rounded-xl bg-primary"
              >
                <Text className="text-white font-semibold">{t('promotions.apply')}</Text>
              </TouchableOpacity>
            </View>

            {couponError && (
              <Text className="text-destructive text-sm mt-2">{couponError}</Text>
            )}

            <SafeAreaView edges={['bottom']} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
