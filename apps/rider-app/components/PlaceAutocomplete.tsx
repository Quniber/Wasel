import { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, TextInput, Text, TouchableOpacity, FlatList } from 'react-native';
import { Colors } from '@/constants/Colors';

const GOOGLE_MAPS_API_KEY = 'AIzaSyCcjyEPNrx4eRMYof-Z_4aEBjUdRQN8VlE';

interface PlaceAutocompleteProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onPlaceSelected: (place: { lat: number; lng: number; address: string }) => void;
  dotColor?: string;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export default function PlaceAutocomplete({
  placeholder,
  value,
  onChangeText,
  onPlaceSelected,
  dotColor = Colors.primary,
}: PlaceAutocompleteProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length < 3) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(value);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  const fetchPredictions = async (input: string) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_MAPS_API_KEY}&types=geocode|establishment`
      );
      const data = await response.json();

      if (data.predictions) {
        setPredictions(data.predictions);
        setShowPredictions(true);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  };

  const fetchPlaceDetails = async (placeId: string, description: string) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();

      if (data.result?.geometry?.location) {
        onPlaceSelected({
          lat: data.result.geometry.location.lat,
          lng: data.result.geometry.location.lng,
          address: description,
        });
        onChangeText(description);
        setShowPredictions(false);
        setPredictions([]);
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    }
  };

  const handleSelectPlace = (prediction: Prediction) => {
    fetchPlaceDetails(prediction.place_id, prediction.description);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={Colors.textLight}
          onFocus={() => value.length >= 3 && setShowPredictions(true)}
        />
      </View>

      {showPredictions && predictions.length > 0 && (
        <View style={styles.predictionsContainer}>
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.predictionItem}
                onPress={() => handleSelectPlace(item)}
              >
                <Text style={styles.predictionMain}>
                  {item.structured_formatting.main_text}
                </Text>
                <Text style={styles.predictionSecondary}>
                  {item.structured_formatting.secondary_text}
                </Text>
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundMuted,
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
  },
  predictionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderRadius: 12,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 100,
  },
  predictionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  predictionMain: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  predictionSecondary: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 2,
  },
});
