import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MapView, MAP_PROVIDER_GOOGLE as PROVIDER_GOOGLE } from '@/components/maps/MapView';
import * as Location from 'expo-location';
import { useBookingStore } from '@/stores/booking-store';

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const BASE_W = 393;

export default function ConfirmLocationScreen() {
  const { t, i18n } = useTranslation();
  const { type, source } = useLocalSearchParams<{
    type?: 'pickup' | 'dropoff' | 'destination';
    source?: 'current' | 'map';
  }>();
  const { pickup, dropoff, setPickup, setDropoff } = useBookingStore();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;

  const isRTL = i18n.language === 'ar';
  const writingDirection: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const locationType: 'pickup' | 'dropoff' = type === 'pickup' ? 'pickup' : 'dropoff';
  const isPickup = locationType === 'pickup';

  const mapRef = useRef<MapView>(null);
  const [address, setAddress] = useState('');
  const [addressSubtitle, setAddressSubtitle] = useState('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);
  const [showDragHint, setShowDragHint] = useState(true);

  useEffect(() => {
    const init = async () => {
      // If user came via "Use current location", always start from GPS
      if (source === 'current') {
        await loadFromGPS();
        return;
      }

      // Otherwise prefer the existing booking-store location for this slot
      const current = isPickup ? pickup : dropoff;
      if (current) {
        const r = {
          latitude: current.latitude,
          longitude: current.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setRegion(r);
        setAddress(current.address);
        reverseGeocode(r.latitude, r.longitude);
        return;
      }

      // For destination without a current value, fall back to pickup if set
      if (!isPickup && pickup) {
        const r = {
          latitude: pickup.latitude,
          longitude: pickup.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setRegion(r);
        reverseGeocode(r.latitude, r.longitude);
        return;
      }

      // Last resort: GPS
      await loadFromGPS();
    };
    init();
  }, []);

  const loadFromGPS = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const r = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setRegion(r);
      reverseGeocode(r.latitude, r.longitude);
    } catch {}
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    try {
      const [result] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (result) {
        const street = result.street || result.name || '';
        const cityRegion = [result.city, result.region].filter(Boolean).join(', ');
        setAddress(street || cityRegion || t('home.currentLocation'));
        setAddressSubtitle(street ? cityRegion : '');
      }
    } catch {
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const handleRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
    setShowDragHint(false);
    reverseGeocode(newRegion.latitude, newRegion.longitude);
  };

  const recenterToGPS = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const r = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      mapRef.current?.animateToRegion(r, 400);
    } catch {}
  };

  const handleConfirm = () => {
    if (!region) return;
    const location = {
      latitude: region.latitude,
      longitude: region.longitude,
      address,
    };
    if (isPickup) {
      setPickup(location);
      // After confirming pickup, go back to search to pick destination
      router.replace('/(main)/search');
    } else {
      setDropoff(location);
      router.push('/(main)/route-preview');
    }
  };

  if (!region) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#EBF0F7',
        }}
      >
        <ActivityIndicator size="large" color="#101969" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#EBF0F7' }}>
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={region}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation={false}
        showsMyLocationButton={false}
      />

      {/* Center pin (anchored to map center, doesn't move with drag) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 220 * s,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Drag hint */}
        {showDragHint && (
          <View
            style={{
              position: 'absolute',
              top: '38%',
              backgroundColor: 'rgba(17,17,17,0.85)',
              paddingHorizontal: 14 * s,
              paddingVertical: 8 * s,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 12 * s, fontWeight: '600' }}>
              {t('booking.dragMapToAdjust', 'Drag map to adjust')}
            </Text>
          </View>
        )}

        {/* Soft halo */}
        <View
          style={{
            width: 80 * s,
            height: 80 * s,
            borderRadius: 40 * s,
            backgroundColor: 'rgba(16, 25, 105, 0.12)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: -36 * s,
          }}
        />
        {/* Pin */}
        <Ionicons
          name="location"
          size={50 * s}
          color={isPickup ? '#0366FB' : '#101969'}
        />
        {/* Ground shadow */}
        <View
          style={{
            marginTop: -6 * s,
            width: 36 * s,
            height: 10 * s,
            borderRadius: 18 * s,
            backgroundColor: 'rgba(0,0,0,0.18)',
          }}
        />
      </View>

      {/* Header card */}
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 12 * s,
            marginHorizontal: 16 * s,
            marginTop: 8 * s,
            paddingLeft: 8 * s,
            paddingRight: 16 * s,
            height: 60 * s,
            backgroundColor: '#FFFFFF',
            borderRadius: 14 * s,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 14,
            elevation: 6,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.back()}
            style={{
              width: 40 * s,
              height: 40 * s,
              borderRadius: 12 * s,
              backgroundColor: '#F5F7FC',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={isRTL ? 'chevron-forward' : 'chevron-back'}
              size={20 * s}
              color="#111111"
            />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: '#6B7380',
                fontSize: 11 * s,
                fontWeight: '500',
                letterSpacing: 0.8,
                textAlign,
                writingDirection,
              }}
            >
              {t('booking.confirm', 'Confirm')}
            </Text>
            <Text
              style={{
                color: '#111111',
                fontSize: 16 * s,
                fontWeight: '700',
                textAlign,
                writingDirection,
              }}
            >
              {isPickup
                ? t('booking.pickupLocation', 'Pickup location')
                : t('booking.dropoffLocation', 'Dropoff location')}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* My-location FAB (sits above the bottom card) */}
      <View style={{ position: 'absolute', right: 20 * s, bottom: 236 * s }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={recenterToGPS}
          style={{
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
          <Ionicons name="locate" size={22 * s} color="#0366FB" />
        </TouchableOpacity>
      </View>

      {/* Bottom card */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 28 * s,
          borderTopRightRadius: 28 * s,
          paddingTop: 14 * s,
          paddingHorizontal: 20 * s,
          paddingBottom: 28 * s,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 24,
          elevation: 12,
          gap: 14 * s,
        }}
      >
        {/* Drag handle */}
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

        {/* Address card */}
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 12 * s,
            backgroundColor: '#F5F7FC',
            borderWidth: 1,
            borderColor: '#E5EBF2',
            borderRadius: 14 * s,
            padding: 14 * s,
            minHeight: 80 * s,
          }}
        >
          <Ionicons
            name="location"
            size={22 * s}
            color={isPickup ? '#0366FB' : '#101969'}
          />
          <View style={{ flex: 1 }}>
            {isLoadingAddress && !address ? (
              <ActivityIndicator size="small" color="#101969" />
            ) : (
              <>
                <Text
                  numberOfLines={1}
                  style={{
                    color: '#111111',
                    fontSize: 15 * s,
                    fontWeight: '600',
                    textAlign,
                    writingDirection,
                  }}
                >
                  {address || t('common.loading')}
                </Text>
                {!!addressSubtitle && (
                  <Text
                    numberOfLines={1}
                    style={{
                      marginTop: 2 * s,
                      color: '#6B7380',
                      fontSize: 13 * s,
                      textAlign,
                      writingDirection,
                    }}
                  >
                    {addressSubtitle}
                  </Text>
                )}
              </>
            )}
          </View>
        </View>

        {/* Confirm button */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleConfirm}
          disabled={!address || isLoadingAddress}
          style={{
            height: 56 * s,
            borderRadius: 14 * s,
            backgroundColor: address && !isLoadingAddress ? '#101969' : '#C7CDD8',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 17 * s, fontWeight: '600' }}>
            {isPickup
              ? t('booking.confirmPickup', 'Confirm pickup')
              : t('booking.confirmDropoff', 'Confirm dropoff')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
