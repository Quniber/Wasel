import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import {
  MapView,
  MAP_PROVIDER_GOOGLE as PROVIDER_GOOGLE,
} from '@/components/maps/MapView';
import ScreenHeader from '@/components/ScreenHeader';
import { addressApi } from '@/lib/api';

const BASE_W = 393;

type PlaceType = 'home' | 'work' | 'other';

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export default function AddPlaceScreen() {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;
  const isRTL = i18n.language === 'ar';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [address, setAddress] = useState('');
  const [type, setType] = useState<PlaceType>('home');
  const [name, setName] = useState('');
  const [showDragHint, setShowDragHint] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const r = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setRegion(r);
        reverseGeocode(r.latitude, r.longitude);
      } catch {}
    })();
  }, []);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const [r] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (r) {
        const a = [r.street || r.name, r.city, r.region].filter(Boolean).join(', ');
        setAddress(a);
      }
    } catch {}
  };

  const handleRegionChange = (r: Region) => {
    setRegion(r);
    setShowDragHint(false);
    reverseGeocode(r.latitude, r.longitude);
  };

  const useCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const r = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      mapRef.current?.animateToRegion(r, 400);
      reverseGeocode(r.latitude, r.longitude);
    } catch {}
  };

  const isValid = !!name.trim() && !!region;

  const handleSave = async () => {
    if (!isValid || !region) return;
    setSaving(true);
    try {
      await (addressApi as any).createAddress?.({
        title: name.trim(),
        type,
        address,
        latitude: region.latitude,
        longitude: region.longitude,
      });
      router.back();
    } catch {
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const Chip = ({
    label,
    icon,
    selected,
    onPress,
  }: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    selected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 8 * s,
        paddingHorizontal: 14 * s,
        paddingVertical: 10 * s,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? '#101969' : '#E5EBF2',
        backgroundColor: selected ? '#101969' : '#F5F7FC',
      }}
    >
      <Ionicons name={icon} size={16 * s} color={selected ? '#FFFFFF' : '#111111'} />
      <Text
        style={{
          color: selected ? '#FFFFFF' : '#111111',
          fontSize: 13 * s,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <ScreenHeader title={t('addPlace.title', 'Save a new place')} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 * s }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Map */}
          <View style={{ height: 380 * s, backgroundColor: '#EBF0F7' }}>
            {region ? (
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={{ flex: 1 }}
                initialRegion={region}
                onRegionChangeComplete={handleRegionChange}
                showsUserLocation={false}
                showsMyLocationButton={false}
              />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#101969" />
              </View>
            )}

            {/* Center pin overlay */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {showDragHint && (
                <View
                  style={{
                    position: 'absolute',
                    top: '24%',
                    backgroundColor: 'rgba(17,17,17,0.85)',
                    paddingHorizontal: 12 * s,
                    paddingVertical: 7 * s,
                    borderRadius: 999,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12 * s, fontWeight: '600' }}>
                    {t('addPlace.dragHint', 'Drag map to set point')}
                  </Text>
                </View>
              )}
              <View
                style={{
                  width: 72 * s,
                  height: 72 * s,
                  borderRadius: 36 * s,
                  backgroundColor: 'rgba(16, 25, 105, 0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: -32 * s,
                }}
              />
              <Ionicons name="location" size={44 * s} color="#101969" />
              <View
                style={{
                  marginTop: -4 * s,
                  width: 32 * s,
                  height: 9 * s,
                  borderRadius: 16 * s,
                  backgroundColor: 'rgba(0,0,0,0.18)',
                }}
              />
            </View>

            {/* Use current location pill */}
            <View
              style={{
                position: 'absolute',
                bottom: -18 * s,
                left: 0,
                right: 0,
                alignItems: 'center',
              }}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={useCurrentLocation}
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  gap: 8 * s,
                  paddingLeft: 12 * s,
                  paddingRight: 14 * s,
                  paddingVertical: 10 * s,
                  borderRadius: 999,
                  backgroundColor: '#FFFFFF',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <Ionicons name="locate" size={16 * s} color="#0366FB" />
                <Text style={{ color: '#101969', fontSize: 13 * s, fontWeight: '600' }}>
                  {t('booking.useCurrentLocation', 'Use current location')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={{
              marginTop: 18 * s,
              paddingHorizontal: 24 * s,
              gap: 14 * s,
            }}
          >
            {/* Type */}
            <Text
              style={{
                color: '#6B7380',
                fontSize: 11 * s,
                fontWeight: '600',
                letterSpacing: 1,
                textAlign,
              }}
            >
              {t('addPlace.typeRequired', 'TYPE  ·  REQUIRED')}
            </Text>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8 * s }}>
              <Chip
                label={t('home.home', 'Home')}
                icon="home"
                selected={type === 'home'}
                onPress={() => setType('home')}
              />
              <Chip
                label={t('home.work', 'Work')}
                icon="briefcase"
                selected={type === 'work'}
                onPress={() => setType('work')}
              />
              <Chip
                label={t('addPlace.other', 'Other')}
                icon="star"
                selected={type === 'other'}
                onPress={() => setType('other')}
              />
            </View>

            {/* Name */}
            <View style={{ gap: 6 * s }}>
              <Text
                style={{
                  color: '#6B7380',
                  fontSize: 11 * s,
                  fontWeight: '600',
                  letterSpacing: 0.6,
                  textAlign,
                }}
              >
                {t('addPlace.nameRequired', 'NAME  ·  REQUIRED')}
              </Text>
              <View
                style={{
                  height: 56 * s,
                  paddingHorizontal: 14 * s,
                  borderRadius: 14 * s,
                  borderWidth: 1.6,
                  borderColor: '#101969',
                  backgroundColor: '#F5F7FC',
                  justifyContent: 'center',
                }}
              >
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={t('addPlace.namePlaceholder', "Mom's house")}
                  placeholderTextColor="#6B7380"
                  style={{
                    fontSize: 15 * s,
                    fontWeight: '600',
                    color: '#111111',
                    padding: 0,
                    textAlign,
                  }}
                />
              </View>
            </View>

            {/* Address (read-only display) */}
            <View style={{ gap: 6 * s }}>
              <Text
                style={{
                  color: '#6B7380',
                  fontSize: 11 * s,
                  fontWeight: '600',
                  letterSpacing: 0.6,
                  textAlign,
                }}
              >
                {t('addPlace.addressOptional', 'ADDRESS  ·  OPTIONAL')}
              </Text>
              <View
                style={{
                  minHeight: 56 * s,
                  paddingHorizontal: 14 * s,
                  paddingVertical: 16 * s,
                  borderRadius: 14 * s,
                  borderWidth: 1,
                  borderColor: '#E5EBF2',
                  backgroundColor: '#F5F7FC',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#6B7380', fontSize: 14 * s, textAlign }}>
                  {address || t('addPlace.autoFilled', 'Auto-filled from map')}
                </Text>
              </View>
            </View>

            {/* Save */}
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={!isValid || saving}
              onPress={handleSave}
              style={{
                marginTop: 4 * s,
                height: 56 * s,
                borderRadius: 14 * s,
                backgroundColor: isValid && !saving ? '#101969' : '#C7CDD8',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 17 * s, fontWeight: '600' }}>
                  {t('addPlace.save', 'Save place')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
