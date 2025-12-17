import { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, TextInput, Modal } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';

interface SavedPlace {
  id: string;
  name: string;
  address: string;
  type: 'home' | 'work' | 'custom';
  latitude: number;
  longitude: number;
}

export default function PlacesScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const [places, setPlaces] = useState<SavedPlace[]>([
    {
      id: '1',
      name: t('places.home'),
      address: '123 Main Street, Downtown',
      type: 'home',
      latitude: 30.0444,
      longitude: 31.2357,
    },
    {
      id: '2',
      name: t('places.work'),
      address: '456 Business Avenue, Financial District',
      type: 'work',
      latitude: 30.0500,
      longitude: 31.2400,
    },
    {
      id: '3',
      name: 'Mom\'s House',
      address: '789 Family Road, Suburbs',
      type: 'custom',
      latitude: 30.0600,
      longitude: 31.2500,
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [editingPlace, setEditingPlace] = useState<SavedPlace | null>(null);
  const [placeName, setPlaceName] = useState('');
  const [placeAddress, setPlaceAddress] = useState('');

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
    if (place?.type === 'home' || place?.type === 'work') {
      // Just clear the address for home/work
      setPlaces(places.map((p) => (p.id === id ? { ...p, address: '' } : p)));
    } else {
      Alert.alert(
        t('places.deleteTitle'),
        t('places.deleteConfirm'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => setPlaces(places.filter((p) => p.id !== id)),
          },
        ]
      );
    }
  };

  const handleSave = () => {
    if (!placeName.trim() || !placeAddress.trim()) {
      Alert.alert(t('common.error'), t('places.fillFields'));
      return;
    }

    if (editingPlace) {
      setPlaces(
        places.map((p) =>
          p.id === editingPlace.id ? { ...p, name: placeName, address: placeAddress } : p
        )
      );
    } else {
      const newPlace: SavedPlace = {
        id: Date.now().toString(),
        name: placeName,
        address: placeAddress,
        type: 'custom',
        latitude: 0,
        longitude: 0,
      };
      setPlaces([...places, newPlace]);
    }

    setShowModal(false);
    setEditingPlace(null);
    setPlaceName('');
    setPlaceAddress('');
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
          {item.type === 'custom' && (
            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              className="w-10 h-10 items-center justify-center"
            >
              <Ionicons name="trash" size={18} color="#EF5350" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
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
              editable={editingPlace?.type === 'custom' || !editingPlace}
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
              className="bg-primary py-4 rounded-xl items-center mb-4"
            >
              <Text className="text-white text-lg font-semibold">{t('common.save')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowModal(false)}
              className="py-3 items-center"
            >
              <Text className="text-muted-foreground">{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
