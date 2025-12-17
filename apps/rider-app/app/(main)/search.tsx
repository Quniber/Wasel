import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Keyboard } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { useBookingStore } from '@/stores/booking-store';
import { getColors } from '@/constants/Colors';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY';

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export default function SearchScreen() {
  const { t, i18n } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { pickup, setPickup, setDropoff } = useBookingStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [pickupText, setPickupText] = useState(pickup?.address || '');
  const [destinationText, setDestinationText] = useState('');
  const [activeInput, setActiveInput] = useState<'pickup' | 'destination'>('destination');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [recentPlaces, setRecentPlaces] = useState<any[]>([]);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Load recent places from storage
    // TODO: Load from AsyncStorage
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const searchText = activeInput === 'pickup' ? pickupText : destinationText;
    if (searchText.length < 2) {
      setPredictions([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(searchText);
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [pickupText, destinationText, activeInput]);

  const fetchPredictions = async (input: string) => {
    try {
      // Get current language for localized results
      const language = i18n.language === 'ar' ? 'ar' : 'en';

      // Focus on Qatar region but allow worldwide results
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_MAPS_API_KEY}&types=geocode|establishment&language=${language}&components=country:qa&location=25.2854,51.5310&radius=50000`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.predictions) {
        setPredictions(data.predictions);
      } else if (data.status === 'ZERO_RESULTS') {
        // Try without country restriction for broader results
        const fallbackResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_MAPS_API_KEY}&types=geocode|establishment&language=${language}`
        );
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.predictions) {
          setPredictions(fallbackData.predictions);
        }
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  };

  const handleSelectPlace = async (prediction: Prediction) => {
    Keyboard.dismiss();

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.result?.geometry?.location) {
        const location = {
          latitude: data.result.geometry.location.lat,
          longitude: data.result.geometry.location.lng,
          address: prediction.description,
        };

        if (activeInput === 'pickup') {
          setPickup(location);
          setPickupText(prediction.description);
          setActiveInput('destination');
        } else {
          setDropoff(location);
          // Navigate to confirm location or service selection
          router.push('/(main)/confirm-location');
        }

        setPredictions([]);
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    }
  };


  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      {/* Header with inputs */}
      <View className={`px-4 pb-4 border-b ${isDark ? 'border-border-dark' : 'border-border'}`}>
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
          </TouchableOpacity>
          <Text className={`flex-1 text-lg font-semibold text-center mr-10 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
            {t('booking.enterDestination')}
          </Text>
        </View>

        {/* Location inputs */}
        <View className="flex-row">
          {/* Dots connector */}
          <View className="w-8 items-center py-4">
            <View className="w-3 h-3 rounded-full bg-primary" />
            <View className={`w-0.5 flex-1 my-1 ${isDark ? 'bg-border-dark' : 'bg-border'}`} />
            <View className="w-3 h-3 rounded-full bg-destructive" />
          </View>

          {/* Inputs */}
          <View className="flex-1 gap-3">
            <TouchableOpacity
              onPress={() => setActiveInput('pickup')}
              className={`px-4 py-3 rounded-xl ${
                activeInput === 'pickup'
                  ? 'border-2 border-primary'
                  : isDark
                  ? 'bg-muted-dark'
                  : 'bg-muted'
              }`}
            >
              <TextInput
                className={`text-base ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}
                placeholder={t('booking.pickup')}
                placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
                value={pickupText}
                onChangeText={setPickupText}
                onFocus={() => setActiveInput('pickup')}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveInput('destination')}
              className={`px-4 py-3 rounded-xl ${
                activeInput === 'destination'
                  ? 'border-2 border-primary'
                  : isDark
                  ? 'bg-muted-dark'
                  : 'bg-muted'
              }`}
            >
              <TextInput
                className={`text-base ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}
                placeholder={t('home.whereTo')}
                placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
                value={destinationText}
                onChangeText={setDestinationText}
                onFocus={() => setActiveInput('destination')}
                autoFocus
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Results */}
      <FlatList
        data={predictions.length > 0 ? predictions : []}
        keyExtractor={(item) => item.place_id}
        className="flex-1"
        ListHeaderComponent={() => (
          <View>
            {/* Recent Places */}
            {predictions.length === 0 && recentPlaces.length > 0 && (
              <View className="px-4 py-4">
                <Text className={`text-sm font-semibold mb-3 ${isDark ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                  {t('home.recentPlaces')}
                </Text>
                {recentPlaces.map((place, index) => (
                  <TouchableOpacity
                    key={index}
                    className={`flex-row items-center py-3 border-b ${isDark ? 'border-border-dark' : 'border-border'}`}
                  >
                    <View className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}>
                      <Ionicons name="time" size={20} color={isDark ? '#757575' : '#9E9E9E'} />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className={`text-base ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                        {place.name}
                      </Text>
                      <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                        {place.address}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleSelectPlace(item)}
            className={`flex-row items-center px-4 py-4 border-b ${isDark ? 'border-border-dark' : 'border-border'}`}
          >
            <View className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}>
              <Ionicons name="location" size={20} color={isDark ? '#FAFAFA' : '#212121'} />
            </View>
            <View className="ml-3 flex-1">
              <Text className={`text-base font-medium ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {item.structured_formatting.main_text}
              </Text>
              <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                {item.structured_formatting.secondary_text}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}
