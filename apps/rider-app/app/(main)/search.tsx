import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Keyboard,
  ScrollView,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import AlertModal from '@/components/AlertModal';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBookingStore } from '@/stores/booking-store';
import { addressApi } from '@/lib/api';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 5;

const BASE_W = 393;

interface PlaceResult {
  placeId: string;
  mainText: string;
  secondaryText: string;
  latitude?: number;
  longitude?: number;
}

interface SavedPlace {
  id: string;
  name: string;
  type: 'home' | 'work' | 'other';
  address: string;
  latitude: number;
  longitude: number;
}

export default function SearchScreen() {
  const { t, i18n } = useTranslation();
  const { pickup, setPickup, setDropoff } = useBookingStore();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;

  const isRTL = i18n.language === 'ar';
  const writingDirection: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const [activeInput, setActiveInput] = useState<'pickup' | 'destination'>('destination');
  const [pickupText, setPickupText] = useState(pickup?.address || '');
  const [destinationText, setDestinationText] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<PlaceResult[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [samePlaceModalVisible, setSamePlaceModalVisible] = useState(false);

  const pickupRef = useRef<TextInput>(null);
  const destinationRef = useRef<TextInput>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const language = i18n.language === 'ar' ? 'ar' : 'en';

  useEffect(() => {
    loadRecentSearches();
    loadSavedPlaces();
  }, []);

  useEffect(() => {
    setTimeout(() => destinationRef.current?.focus(), 300);
  }, []);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {}
  };

  const loadSavedPlaces = async () => {
    try {
      const response = await addressApi.getAddresses();
      const addresses = response.data || [];
      const transformed: SavedPlace[] = addresses.map((addr: any) => ({
        id: addr.id?.toString() || String(Math.random()),
        name: addr.title || addr.type || t('places.addPlace'),
        type: (addr.type?.toLowerCase() || 'other') as 'home' | 'work' | 'other',
        address: addr.address || '',
        latitude: parseFloat(addr.latitude) || 0,
        longitude: parseFloat(addr.longitude) || 0,
      }));
      setSavedPlaces(transformed);
    } catch {}
  };

  const saveRecentSearch = async (place: PlaceResult) => {
    try {
      const updated = [place, ...recentSearches.filter((p) => p.placeId !== place.placeId)].slice(
        0,
        MAX_RECENT_SEARCHES
      );
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {}
  };

  const searchPlaces = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const locationBias = '25.2854,51.5310';
        const radius = '50000';
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            query
          )}&key=${GOOGLE_MAPS_API_KEY}&language=${language}&location=${locationBias}&radius=${radius}&components=country:qa`
        );
        const data = await response.json();
        if (data.status === 'OK') {
          setSearchResults(
            data.predictions.map((p: any) => ({
              placeId: p.place_id,
              mainText: p.structured_formatting?.main_text || p.description,
              secondaryText: p.structured_formatting?.secondary_text || '',
            }))
          );
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [language]
  );

  const handleTextChange = (text: string, type: 'pickup' | 'destination') => {
    if (type === 'pickup') setPickupText(text);
    else setDestinationText(text);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchPlaces(text), 300);
  };

  const getPlaceDetails = async (placeId: string) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}&fields=geometry`
      );
      const data = await response.json();
      if (data.status === 'OK' && data.result?.geometry?.location) {
        return data.result.geometry.location;
      }
    } catch {}
    return null;
  };

  const handleSelectPlace = async (place: PlaceResult, type: 'pickup' | 'destination') => {
    Keyboard.dismiss();
    let { latitude, longitude } = place;
    if (!latitude || !longitude) {
      const coords = await getPlaceDetails(place.placeId);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      }
    }
    if (latitude && longitude) {
      const location = { latitude, longitude, address: place.mainText };
      saveRecentSearch({ ...place, latitude, longitude });
      if (type === 'pickup') {
        setPickup(location);
        setPickupText(place.mainText);
        setActiveInput('destination');
        setSearchResults([]);
        setTimeout(() => destinationRef.current?.focus(), 100);
      } else {
        setDropoff(location);
        router.push('/(main)/route-preview');
      }
    }
  };

  // Distance in meters between two coords (haversine).
  const distanceMeters = (
    a: { latitude: number; longitude: number },
    b: { latitude: number; longitude: number }
  ) => {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.asin(Math.sqrt(x));
  };

  // "Use current location" — just resolve GPS and apply it immediately,
  // no confirm/drag step.
  const handleUseCurrentLocation = async () => {
    Keyboard.dismiss();
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      const addressString = [address?.street, address?.city].filter(Boolean).join(', ');
      const currentLocation = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: addressString || t('home.currentLocation'),
      };

      // Setting destination too close to pickup makes no ride sense.
      if (activeInput === 'destination' && pickup) {
        const d = distanceMeters(pickup, currentLocation);
        if (d < 50) {
          setSamePlaceModalVisible(true);
          return;
        }
      }

      if (activeInput === 'pickup') {
        setPickup(currentLocation);
        setPickupText(currentLocation.address);
        setActiveInput('destination');
        setTimeout(() => destinationRef.current?.focus(), 100);
      } else {
        setDropoff(currentLocation);
        router.push('/(main)/route-preview');
      }
    } catch {
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // "Set on map" — open the draggable confirm-location screen.
  const handleChooseOnMap = () => {
    Keyboard.dismiss();
    router.push({
      pathname: '/(main)/confirm-location',
      params: {
        type: activeInput === 'destination' ? 'dropoff' : 'pickup',
        source: 'map',
      },
    });
  };

  const swapLocations = () => {
    if (pickup) {
      setDestinationText(pickup.address);
      setDropoff(pickup);
    }
    setPickupText(destinationText);
    setDestinationText(pickupText);
    setPickup(null);
  };

  const currentSearchText = activeInput === 'pickup' ? pickupText : destinationText;
  const showResults = searchResults.length > 0 && currentSearchText.length >= 2;
  const showEmptyState =
    !showResults && !isSearching && currentSearchText.length >= 2;

  const SectionHeader = ({ children }: { children: string }) => (
    <Text
      style={{
        marginTop: 16 * s,
        marginBottom: 4 * s,
        color: '#6B7380',
        fontSize: 11 * s,
        fontWeight: '600',
        letterSpacing: 1.2,
        textAlign,
        writingDirection,
      }}
    >
      {children.toUpperCase()}
    </Text>
  );

  const PlaceRow = ({
    icon,
    title,
    subtitle,
    onPress,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 14 * s,
        paddingVertical: 14 * s,
      }}
    >
      <Ionicons name={icon as any} size={20 * s} color="#6B7380" />
      <View style={{ flex: 1 }}>
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
          {title}
        </Text>
        {!!subtitle && (
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
            {subtitle}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      {/* Header */}
      <View
        style={{
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: 12 * s,
          paddingHorizontal: 12 * s,
          height: 56 * s,
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
        <Text
          style={{
            flex: 1,
            color: '#111111',
            fontSize: 18 * s,
            fontWeight: '600',
            textAlign,
            writingDirection,
          }}
        >
          {t('booking.planYourTrip')}
        </Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24 * s, paddingBottom: 24 * s }}
      >
        {/* Trip card */}
        <View
          style={{
            marginTop: 8 * s,
            backgroundColor: '#F5F7FC',
            borderRadius: 18 * s,
            borderWidth: 1,
            borderColor: '#E5EBF2',
            padding: 16 * s,
          }}
        >
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'stretch',
              gap: 12 * s,
            }}
          >
            {/* Timeline */}
            <View style={{ alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 * s }}>
              <View
                style={{
                  width: 12 * s,
                  height: 12 * s,
                  borderRadius: 6 * s,
                  backgroundColor: '#0366FB',
                  borderWidth: 3,
                  borderColor: '#FFFFFF',
                }}
              />
              <View style={{ flex: 1, width: 2, backgroundColor: '#E5EBF2', marginVertical: 4 * s }} />
              <View
                style={{
                  width: 12 * s,
                  height: 12 * s,
                  borderRadius: 2 * s,
                  backgroundColor: '#ED4557',
                }}
              />
            </View>

            {/* Inputs */}
            <View style={{ flex: 1 }}>
              <TextInput
                ref={pickupRef}
                value={pickupText}
                onChangeText={(text) => handleTextChange(text, 'pickup')}
                onFocus={() => setActiveInput('pickup')}
                placeholder={t('booking.pickupLocation')}
                placeholderTextColor="#6B7380"
                style={{
                  height: 30 * s,
                  fontSize: 16 * s,
                  fontWeight: '600',
                  color: '#111111',
                  padding: 0,
                  textAlign,
                }}
              />
              <View style={{ height: 1, backgroundColor: '#E5EBF2', marginVertical: 12 * s }} />
              <TextInput
                ref={destinationRef}
                value={destinationText}
                onChangeText={(text) => handleTextChange(text, 'destination')}
                onFocus={() => setActiveInput('destination')}
                placeholder={t('home.whereTo')}
                placeholderTextColor="#6B7380"
                style={{
                  height: 30 * s,
                  fontSize: 16 * s,
                  color: '#111111',
                  padding: 0,
                  textAlign,
                }}
              />
            </View>

            {/* Swap button */}
            <View style={{ justifyContent: 'center' }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={swapLocations}
                style={{
                  width: 40 * s,
                  height: 40 * s,
                  borderRadius: 20 * s,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E5EBF2',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="swap-horizontal" size={18 * s} color="#101969" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quick action chips */}
        <View
          style={{
            marginTop: 14 * s,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            gap: 10 * s,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleUseCurrentLocation}
            disabled={isLoadingLocation}
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 8 * s,
              paddingHorizontal: 14 * s,
              paddingVertical: 10 * s,
              borderRadius: 999,
              backgroundColor: '#F5F7FC',
              borderWidth: 1,
              borderColor: '#E5EBF2',
            }}
          >
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color="#101969" />
            ) : (
              <Ionicons name="locate" size={16 * s} color="#101969" />
            )}
            <Text style={{ color: '#111111', fontSize: 13 * s, fontWeight: '600' }}>
              {t('booking.useCurrentLocation')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleChooseOnMap}
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 8 * s,
              paddingHorizontal: 14 * s,
              paddingVertical: 10 * s,
              borderRadius: 999,
              backgroundColor: '#F5F7FC',
              borderWidth: 1,
              borderColor: '#E5EBF2',
            }}
          >
            <Ionicons name="navigate" size={16 * s} color="#101969" />
            <Text style={{ color: '#111111', fontSize: 13 * s, fontWeight: '600' }}>
              {t('booking.chooseOnMap')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search loading */}
        {isSearching && (
          <View style={{ paddingVertical: 24 * s, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#101969" />
          </View>
        )}

        {/* Search results */}
        {showResults && !isSearching && (
          <View style={{ marginTop: 8 * s }}>
            {searchResults.map((place) => (
              <PlaceRow
                key={place.placeId}
                icon="location-outline"
                title={place.mainText}
                subtitle={place.secondaryText}
                onPress={() => handleSelectPlace(place, activeInput)}
              />
            ))}
          </View>
        )}

        {/* Empty state for search */}
        {showEmptyState && (
          <View style={{ paddingVertical: 32 * s, alignItems: 'center' }}>
            <Ionicons name="search-outline" size={40 * s} color="#6B7380" />
            <Text style={{ color: '#6B7380', fontSize: 14 * s, marginTop: 12 * s }}>
              {t('booking.noResultsFound')}
            </Text>
          </View>
        )}

        {/* Recent + Suggested when not searching */}
        {!showResults && !isSearching && (
          <>
            {recentSearches.length > 0 && (
              <>
                <SectionHeader>{t('booking.recentSearches')}</SectionHeader>
                {recentSearches.map((place) => (
                  <PlaceRow
                    key={place.placeId}
                    icon="time-outline"
                    title={place.mainText}
                    subtitle={place.secondaryText}
                    onPress={() => handleSelectPlace(place, activeInput)}
                  />
                ))}
              </>
            )}

            {savedPlaces.length > 0 && (
              <>
                <SectionHeader>{t('booking.suggested')}</SectionHeader>
                {savedPlaces.map((place) => (
                  <PlaceRow
                    key={place.id}
                    icon="location-outline"
                    title={place.name}
                    subtitle={place.address}
                    onPress={() =>
                      handleSelectPlace(
                        {
                          placeId: place.id,
                          mainText: place.name,
                          secondaryText: place.address,
                          latitude: place.latitude,
                          longitude: place.longitude,
                        },
                        activeInput
                      )
                    }
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <AlertModal
        visible={samePlaceModalVisible}
        variant="warning"
        title={t('booking.samePlaceTitle', 'Same as pickup')}
        message={t(
          'booking.samePlaceMsg',
          "Your dropoff is the same as your pickup. Please choose a different destination."
        )}
        primaryLabel={t('common.ok', 'OK')}
        onPrimaryPress={() => setSamePlaceModalVisible(false)}
        onRequestClose={() => setSamePlaceModalVisible(false)}
      />
    </SafeAreaView>
  );
}
