import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Keyboard, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useThemeStore } from '@/stores/theme-store';
import { useBookingStore } from '@/stores/booking-store';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Log for debugging
console.log('Google Maps API Key loaded:', GOOGLE_MAPS_API_KEY ? 'Yes' : 'No');

export default function SearchScreen() {
  const { t, i18n } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { pickup, setPickup, setDropoff } = useBookingStore();
  const isDark = resolvedTheme === 'dark';

  const [activeInput, setActiveInput] = useState<'pickup' | 'destination'>('destination');
  const pickupRef = useRef<any>(null);
  const destinationRef = useRef<any>(null);

  const language = i18n.language === 'ar' ? 'ar' : 'en';

  const handleSelectPlace = (data: any, details: any, type: 'pickup' | 'destination') => {
    Keyboard.dismiss();

    if (details?.geometry?.location) {
      const location = {
        latitude: details.geometry.location.lat,
        longitude: details.geometry.location.lng,
        address: data.structured_formatting?.main_text || data.description,
      };

      if (type === 'pickup') {
        setPickup(location);
        setActiveInput('destination');
        setTimeout(() => destinationRef.current?.focus(), 100);
      } else {
        setDropoff(location);
        router.push('/(main)/route-preview');
      }
    }
  };

  const inputStyles = {
    container: {
      flex: 0,
      zIndex: 10,
    },
    textInputContainer: {
      backgroundColor: 'transparent',
    },
    textInput: {
      height: 48,
      fontSize: 16,
      backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5',
      color: isDark ? '#FAFAFA' : '#212121',
      borderRadius: 12,
      paddingHorizontal: 16,
      borderWidth: activeInput === 'pickup' ? 2 : 0,
      borderColor: '#4CAF50',
    },
    listView: {
      backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
      borderRadius: 12,
      marginTop: 4,
      position: 'absolute' as const,
      top: 52,
      left: 0,
      right: 0,
      zIndex: 1000,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    row: {
      backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    separator: {
      height: 1,
      backgroundColor: isDark ? '#333333' : '#EEEEEE',
    },
    description: {
      color: isDark ? '#FAFAFA' : '#212121',
      fontSize: 15,
    },
    predefinedPlacesDescription: {
      color: '#4CAF50',
    },
  };

  // Update pickup styles based on active input
  const pickupStyles = {
    ...inputStyles,
    container: {
      flex: 0,
      zIndex: activeInput === 'pickup' ? 20 : 5,
    },
    textInput: {
      ...inputStyles.textInput,
      borderWidth: activeInput === 'pickup' ? 2 : 0,
    },
  };

  const destinationInputStyles = {
    ...inputStyles,
    container: {
      flex: 0,
      zIndex: activeInput === 'destination' ? 20 : 5,
    },
    textInput: {
      ...inputStyles.textInput,
      borderWidth: activeInput === 'destination' ? 2 : 0,
    },
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      {/* Header */}
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
          <View className="w-8 items-center py-6">
            <View className="w-3 h-3 rounded-full bg-primary" />
            <View className={`w-0.5 flex-1 my-1 ${isDark ? 'bg-border-dark' : 'bg-border'}`} />
            <View className="w-3 h-3 rounded-full bg-destructive" />
          </View>

          {/* Inputs */}
          <View className="flex-1 gap-3">
            {/* Pickup Input */}
            <GooglePlacesAutocomplete
              ref={pickupRef}
              placeholder={t('booking.pickup')}
              onPress={(data, details) => handleSelectPlace(data, details, 'pickup')}
              query={{
                key: GOOGLE_MAPS_API_KEY,
                language: language,
              }}
              fetchDetails={true}
              enablePoweredByContainer={false}
              debounce={200}
              minLength={2}
              keyboardShouldPersistTaps="handled"
              listViewDisplayed="auto"
              keepResultsAfterBlur={true}
              styles={pickupStyles}
              textInputProps={{
                placeholderTextColor: isDark ? '#757575' : '#9E9E9E',
                onFocus: () => setActiveInput('pickup'),
                defaultValue: pickup?.address || '',
              }}
              onFail={(error) => console.error('Pickup search error:', error)}
              onNotFound={() => console.log('No pickup results found')}
            />

            {/* Destination Input */}
            <GooglePlacesAutocomplete
              ref={destinationRef}
              placeholder={t('home.whereTo')}
              onPress={(data, details) => handleSelectPlace(data, details, 'destination')}
              query={{
                key: GOOGLE_MAPS_API_KEY,
                language: language,
              }}
              fetchDetails={true}
              enablePoweredByContainer={false}
              debounce={200}
              minLength={2}
              keyboardShouldPersistTaps="handled"
              listViewDisplayed="auto"
              keepResultsAfterBlur={true}
              styles={destinationInputStyles}
              textInputProps={{
                placeholderTextColor: isDark ? '#757575' : '#9E9E9E',
                onFocus: () => setActiveInput('destination'),
                autoFocus: true,
              }}
              onFail={(error) => console.error('Destination search error:', error)}
              onNotFound={() => console.log('No destination results found')}
            />
          </View>
        </View>
      </View>

      {/* Empty space for results to render into */}
      <ScrollView
        className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}
