import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useThemeStore } from '@/stores/theme-store';
import { addressApi } from '@/lib/api';

interface SavedPlace {
  id: string;
  name: string;
  address: string;
  type: 'home' | 'work' | 'other';
  latitude: number;
  longitude: number;
}

export default function PlacesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const [isLoading, setIsLoading] = useState(true);
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPlace, setEditingPlace] = useState<SavedPlace | null>(null);
  const [placeName, setPlaceName] = useState('');
  const [placeAddress, setPlaceAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPlaces();
  }, []);

  const loadPlaces = async () => {
    try {
      const response = await addressApi.getAddresses();
      const addresses = response.data || [];

      // Transform API data to display format
      const transformedPlaces = addresses.map((addr: any) => ({
        id: addr.id.toString(),
        name: addr.title || addr.type || 'Place',
        address: addr.address || '',
        type: addr.type || 'other',
        latitude: parseFloat(addr.latitude) || 0,
        longitude: parseFloat(addr.longitude) || 0,
      }));

      setPlaces(transformedPlaces);
    } catch (error) {
      console.error('Error loading places:', error);
      setPlaces([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getPlaceIcon = (type: string) => {
    switch (type) {
      case 'home':
        return 'home';
      case 'work':
        return 'briefcase';
      default:
        return 'star';
    }
  };

  const handleEdit = (place: SavedPlace) => {
    setEditingPlace(place);
    setPlaceName(place.name);
    setPlaceAddress(place.address);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    const place = places.find((p) => p.id === id);

    Alert.alert(
      t('places.deleteTitle'),
      t('places.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await addressApi.deleteAddress(id);
              setPlaces(places.filter((p) => p.id !== id));
            } catch (error) {
              console.error('Error deleting place:', error);
              Alert.alert(t('common.error'), t('errors.generic'));
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!placeName.trim() || !placeAddress.trim()) {
      Alert.alert(t('common.error'), t('places.fillFields'));
      return;
    }

    setIsSaving(true);

    try {
      if (editingPlace) {
        // Update existing place
        await addressApi.updateAddress(editingPlace.id, {
          title: placeName,
          address: placeAddress,
        });
        setPlaces(
          places.map((p) =>
            p.id === editingPlace.id ? { ...p, name: placeName, address: placeAddress } : p
          )
        );
      } else {
        // Create new place
        const response = await addressApi.createAddress({
          title: placeName,
          address: placeAddress,
          latitude: 0,
          longitude: 0,
          type: 'other',
        });

        const newPlace: SavedPlace = {
          id: response.data.id.toString(),
          name: placeName,
          address: placeAddress,
          type: 'other',
          latitude: 0,
          longitude: 0,
        };
        setPlaces([...places, newPlace]);
      }

      setShowModal(false);
      setEditingPlace(null);
      setPlaceName('');
      setPlaceAddress('');
    } catch (error) {
      console.error('Error saving place:', error);
      Alert.alert(t('common.error'), t('errors.generic'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNew = () => {
    setEditingPlace(null);
    setPlaceName('');
    setPlaceAddress('');
    setShowModal(true);
  };

  const renderPlaceItem = ({ item }: { item: SavedPlace }) => (
    <View
      className={`mx-4 mb-3 p-4 rounded-xl ${isDark ? 'bg-card-dark' : 'bg-card'} shadow-sm`}
    >
      <View className="flex-row items-start">
        <View className={`w-10 h-10 rounded-full items-center justify-center ${item.type === 'home' ? 'bg-primary/10' : item.type === 'work' ? 'bg-blue-500/10' : 'bg-amber-500/10'}`}>
          <Ionicons
            name={getPlaceIcon(item.type)}
            size={20}
            color={item.type === 'home' ? '#4CAF50' : item.type === 'work' ? '#2196F3' : '#FFB300'}
          />
        </View>
        <View className="flex-1 ml-3">
          <Text className={`font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
            {item.name}
          </Text>
          {item.address ? (
            <Text className="text-muted-foreground text-sm mt-1" numberOfLines={2}>
              {item.address}
            </Text>
          ) : (
            <Text className="text-muted-foreground text-sm mt-1 italic">
              {t('places.notSet')}
            </Text>
          )}
        </View>
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => handleEdit(item)}
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="pencil" size={18} color={isDark ? '#FAFAFA' : '#757575'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="trash" size={18} color="#EF5350" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4">
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} className="w-10 h-10 items-center justify-center">
          <Ionicons name="menu" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
        </TouchableOpacity>
        <Text className={`flex-1 text-xl font-semibold text-center mr-10 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
          {t('places.title')}
        </Text>
      </View>

      {/* Places List */}
      <FlatList
        data={places}
        renderItem={renderPlaceItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 8 }}
        ListEmptyComponent={() => (
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="location-outline" size={64} color={isDark ? '#333' : '#E0E0E0'} />
            <Text className={`text-lg font-semibold mt-4 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {t('places.empty')}
            </Text>
            <Text className="text-muted-foreground mt-2 text-center px-8">
              {t('places.emptySubtitle')}
            </Text>
          </View>
        )}
        ListFooterComponent={() => (
          <TouchableOpacity
            onPress={handleAddNew}
            className={`mx-4 mb-3 p-4 rounded-xl border-2 border-dashed ${isDark ? 'border-border-dark' : 'border-border'}`}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="add-circle" size={24} color="#4CAF50" />
              <Text className="text-primary font-semibold ml-2">{t('places.addNew')}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Edit/Add Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className={`rounded-t-3xl p-6 ${isDark ? 'bg-background-dark' : 'bg-white'}`}>
              <View className="flex-row items-center justify-between mb-6">
                <Text className={`text-xl font-bold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                  {editingPlace ? t('places.editPlace') : t('places.addPlace')}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
                </TouchableOpacity>
              </View>

              <Text className="text-muted-foreground text-sm mb-2">{t('places.nameLabel')}</Text>
              <TextInput
                className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-muted-dark text-foreground-dark' : 'bg-muted text-foreground'}`}
                placeholder={t('places.namePlaceholder')}
                placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
                value={placeName}
                onChangeText={setPlaceName}
              />

              <Text className="text-muted-foreground text-sm mb-2">{t('places.addressLabel')}</Text>
              <TextInput
                className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-muted-dark text-foreground-dark' : 'bg-muted text-foreground'}`}
                placeholder={t('places.addressPlaceholder')}
                placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
                value={placeAddress}
                onChangeText={setPlaceAddress}
                multiline
              />

              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                className="bg-primary py-4 rounded-xl items-center mb-4"
              >
                <Text className="text-white text-lg font-semibold">
                  {isSaving ? t('common.loading') : t('common.save')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowModal(false)}
                className="py-3 items-center"
              >
                <Text className="text-muted-foreground">{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
