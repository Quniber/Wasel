import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Keyboard,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from '@/stores/theme-store';
import { useBookingStore } from '@/stores/booking-store';
import { getColors } from '@/constants/Colors';
import { addressApi } from '@/lib/api';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 5;

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
  icon: string;
}

export default function SearchScreen() {
  const { t, i18n } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { pickup, setPickup, setDropoff } = useBookingStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [activeInput, setActiveInput] = useState<'pickup' | 'destination'>('destination');
  const [pickupText, setPickupText] = useState(pickup?.address || '');
  const [destinationText, setDestinationText] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<PlaceResult[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const pickupRef = useRef<TextInput>(null);
  const destinationRef = useRef<TextInput>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const language = i18n.language === 'ar' ? 'ar' : 'en';

  // Load recent searches and saved places on mount
  useEffect(() => {
    loadRecentSearches();
    loadSavedPlaces();
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  // Auto-focus destination input
  useEffect(() => {
    setTimeout(() => {
      destinationRef.current?.focus();
    }, 300);
  }, []);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const loadSavedPlaces = async () => {
    try {
      const response = await addressApi.getAddresses();
      const addresses = response.data || [];
      const transformed: SavedPlace[] = addresses.map((addr: any) => {
        const type = addr.type?.toLowerCase() || 'other';
        let icon = 'location-outline';
        if (type === 'home') icon = 'home-outline';
        else if (type === 'work') icon = 'briefcase-outline';
        else if (addr.title?.toLowerCase().includes('home')) icon = 'home-outline';
        else if (addr.title?.toLowerCase().includes('work')) icon = 'briefcase-outline';

        return {
          id: addr.id?.toString() || String(Math.random()),
          name: addr.title || addr.type || t('places.addPlace'),
          type: type as 'home' | 'work' | 'other',
          address: addr.address || '',
          latitude: parseFloat(addr.latitude) || 0,
          longitude: parseFloat(addr.longitude) || 0,
          icon,
        };
      });
      setSavedPlaces(transformed);
    } catch (error) {
      console.error('Error loading saved places:', error);
    }
  };

  const saveRecentSearch = async (place: PlaceResult) => {
    try {
      const updated = [place, ...recentSearches.filter(p => p.placeId !== place.placeId)]
        .slice(0, MAX_RECENT_SEARCHES);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&language=${language}&types=establishment|geocode`
      );
      const data = await response.json();

      if (data.status === 'OK') {
        const results: PlaceResult[] = data.predictions.map((prediction: any) => ({
          placeId: prediction.place_id,
          mainText: prediction.structured_formatting?.main_text || prediction.description,
          secondaryText: prediction.structured_formatting?.secondary_text || '',
        }));
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [language]);

  const handleTextChange = (text: string, type: 'pickup' | 'destination') => {
    if (type === 'pickup') {
      setPickupText(text);
    } else {
      setDestinationText(text);
    }

    // Debounce search
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    searchTimeout.current = setTimeout(() => {
      searchPlaces(text);
    }, 300);
  };

  const getPlaceDetails = async (placeId: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}&fields=geometry`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.result?.geometry?.location) {
        return data.result.geometry.location;
      }
    } catch (error) {
      console.error('Error getting place details:', error);
    }
    return null;
  };

  const handleSelectPlace = async (place: PlaceResult, type: 'pickup' | 'destination') => {
    Keyboard.dismiss();

    // Get place coordinates if not already available
    let latitude = place.latitude;
    let longitude = place.longitude;

    if (!latitude || !longitude) {
      const coords = await getPlaceDetails(place.placeId);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      }
    }

    if (latitude && longitude) {
      const location = {
        latitude,
        longitude,
        address: place.mainText,
      };

      // Save to recent searches
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

  const handleUseCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const addressString = [address?.street, address?.city].filter(Boolean).join(', ');

      const currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: addressString || t('home.currentLocation'),
      };

      if (activeInput === 'pickup') {
        setPickup(currentLocation);
        setPickupText(currentLocation.address);
        setActiveInput('destination');
        setTimeout(() => destinationRef.current?.focus(), 100);
      } else {
        setDropoff(currentLocation);
        router.push('/(main)/route-preview');
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleChooseOnMap = () => {
    router.push({
      pathname: '/(main)/confirm-location',
      params: { type: activeInput },
    });
  };

  const clearInput = (type: 'pickup' | 'destination') => {
    if (type === 'pickup') {
      setPickupText('');
      setPickup(null);
      pickupRef.current?.focus();
    } else {
      setDestinationText('');
      destinationRef.current?.focus();
    }
    setSearchResults([]);
  };

  const swapLocations = () => {
    const tempPickup = pickup;
    const tempPickupText = pickupText;

    if (pickup) {
      setDestinationText(pickup.address);
      setDropoff(pickup);
    }

    // For now, just swap the text - in real app would swap full location objects
    setPickupText(destinationText);
    setDestinationText(tempPickupText);
  };

  const renderSearchResult = (place: PlaceResult, type: 'pickup' | 'destination') => (
    <TouchableOpacity
      key={place.placeId}
      onPress={() => handleSelectPlace(place, type)}
      className="flex-row items-center px-4 py-3"
      style={{ backgroundColor: colors.card }}
      activeOpacity={0.7}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: colors.muted }}
      >
        <Ionicons name="location-outline" size={20} color={colors.mutedForeground} />
      </View>
      <View className="flex-1">
        <Text style={{ color: colors.foreground }} className="text-base font-medium" numberOfLines={1}>
          {place.mainText}
        </Text>
        {place.secondaryText ? (
          <Text style={{ color: colors.mutedForeground }} className="text-sm mt-0.5" numberOfLines={1}>
            {place.secondaryText}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const renderRecentSearch = (place: PlaceResult) => (
    <TouchableOpacity
      key={place.placeId}
      onPress={() => handleSelectPlace(place, activeInput)}
      className="flex-row items-center px-4 py-3"
      activeOpacity={0.7}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: colors.muted }}
      >
        <Ionicons name="time-outline" size={20} color={colors.mutedForeground} />
      </View>
      <View className="flex-1">
        <Text style={{ color: colors.foreground }} className="text-base" numberOfLines={1}>
          {place.mainText}
        </Text>
        {place.secondaryText ? (
          <Text style={{ color: colors.mutedForeground }} className="text-sm mt-0.5" numberOfLines={1}>
            {place.secondaryText}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const currentSearchText = activeInput === 'pickup' ? pickupText : destinationText;
  const showResults = searchResults.length > 0 && currentSearchText.length >= 2;
  const showRecent = !showResults && recentSearches.length > 0 && currentSearchText.length < 2;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* Header */}
        <View
          style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}
          className="px-4 pb-4"
        >
          {/* Back button and title */}
          <View className="flex-row items-center py-2">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center -ml-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={{ color: colors.foreground }} className="flex-1 text-lg font-semibold ml-2">
              {t('booking.planYourTrip')}
            </Text>
          </View>

          {/* Location inputs */}
          <View className="flex-row mt-2">
            {/* Timeline dots */}
            <View className="w-8 items-center justify-center mr-2">
              <View
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors.primary }}
              />
              <View
                className="w-0.5 h-8 my-1"
                style={{ backgroundColor: colors.border }}
              />
              <View
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors.destructive }}
              />
            </View>

            {/* Input fields */}
            <View className="flex-1">
              {/* Pickup Input */}
              <View
                className="flex-row items-center rounded-xl px-3 mb-2"
                style={{
                  backgroundColor: colors.muted,
                  borderWidth: activeInput === 'pickup' ? 2 : 0,
                  borderColor: colors.primary,
                }}
              >
                <TextInput
                  ref={pickupRef}
                  value={pickupText}
                  onChangeText={(text) => handleTextChange(text, 'pickup')}
                  onFocus={() => setActiveInput('pickup')}
                  placeholder={t('booking.pickupLocation')}
                  placeholderTextColor={colors.mutedForeground}
                  style={{ color: colors.foreground, flex: 1, height: 48, fontSize: 16 }}
                />
                {pickupText.length > 0 && (
                  <TouchableOpacity onPress={() => clearInput('pickup')} className="p-2">
                    <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Destination Input */}
              <View
                className="flex-row items-center rounded-xl px-3"
                style={{
                  backgroundColor: colors.muted,
                  borderWidth: activeInput === 'destination' ? 2 : 0,
                  borderColor: colors.primary,
                }}
              >
                <TextInput
                  ref={destinationRef}
                  value={destinationText}
                  onChangeText={(text) => handleTextChange(text, 'destination')}
                  onFocus={() => setActiveInput('destination')}
                  placeholder={t('home.whereTo')}
                  placeholderTextColor={colors.mutedForeground}
                  style={{ color: colors.foreground, flex: 1, height: 48, fontSize: 16 }}
                />
                {destinationText.length > 0 && (
                  <TouchableOpacity onPress={() => clearInput('destination')} className="p-2">
                    <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Swap button */}
            <TouchableOpacity
              onPress={swapLocations}
              className="w-10 items-center justify-center ml-2"
            >
              <Ionicons name="swap-vertical" size={24} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        >
          {/* Quick Actions */}
          {!showResults && (
            <View className="py-2">
              {/* Current Location */}
              <TouchableOpacity
                onPress={handleUseCurrentLocation}
                disabled={isLoadingLocation}
                className="flex-row items-center px-4 py-3"
                activeOpacity={0.7}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: `${colors.primary}20` }}
                >
                  {isLoadingLocation ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="locate" size={20} color={colors.primary} />
                  )}
                </View>
                <Text style={{ color: colors.primary }} className="text-base font-medium">
                  {t('booking.useCurrentLocation')}
                </Text>
              </TouchableOpacity>

              {/* Choose on Map */}
              <TouchableOpacity
                onPress={handleChooseOnMap}
                className="flex-row items-center px-4 py-3"
                activeOpacity={0.7}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: colors.muted }}
                >
                  <Ionicons name="map-outline" size={20} color={colors.foreground} />
                </View>
                <Text style={{ color: colors.foreground }} className="text-base font-medium">
                  {t('booking.chooseOnMap')}
                </Text>
              </TouchableOpacity>

              {/* Divider */}
              <View className="h-2" style={{ backgroundColor: colors.muted }} />
            </View>
          )}

          {/* Search Results */}
          {isSearching && (
            <View className="py-8 items-center">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}

          {showResults && !isSearching && (
            <View>
              {searchResults.map((place) => renderSearchResult(place, activeInput))}
            </View>
          )}

          {/* Recent Searches */}
          {showRecent && (
            <View>
              <Text
                style={{ color: colors.mutedForeground }}
                className="px-4 py-2 text-sm font-medium uppercase"
              >
                {t('booking.recentSearches')}
              </Text>
              {recentSearches.map(renderRecentSearch)}
            </View>
          )}

          {/* Saved Places */}
          {savedPlaces.length > 0 && !showResults && (
            <View className="mt-4">
              <Text
                style={{ color: colors.mutedForeground }}
                className="px-4 py-2 text-sm font-medium uppercase"
              >
                {t('booking.savedPlaces')}
              </Text>
              {savedPlaces.map((place) => (
                <TouchableOpacity
                  key={place.id}
                  onPress={() => handleSelectPlace({
                    placeId: place.id,
                    mainText: place.name,
                    secondaryText: place.address,
                    latitude: place.latitude,
                    longitude: place.longitude,
                  }, activeInput)}
                  className="flex-row items-center px-4 py-3"
                  activeOpacity={0.7}
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: colors.muted }}
                  >
                    <Ionicons name={place.icon as any} size={20} color={colors.foreground} />
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: colors.foreground }} className="text-base font-medium">
                      {place.name}
                    </Text>
                    <Text style={{ color: colors.mutedForeground }} className="text-sm mt-0.5" numberOfLines={1}>
                      {place.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Empty State */}
          {!showResults && !showRecent && !isSearching && currentSearchText.length >= 2 && (
            <View className="py-8 items-center px-4">
              <Ionicons name="search-outline" size={48} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground }} className="text-base mt-4 text-center">
                {t('booking.noResultsFound')}
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}
