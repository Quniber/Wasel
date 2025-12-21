import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { getColors } from '@/constants/Colors';
import { authApi } from '@/lib/api';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  type: string;
}

export default function VehicleScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('sedan');

  const vehicleTypes = [
    { value: 'sedan', label: t('vehicle.sedan'), icon: 'car-outline' as const },
    { value: 'suv', label: t('vehicle.suv'), icon: 'car-sport-outline' as const },
    { value: 'van', label: t('vehicle.van'), icon: 'bus-outline' as const },
  ];

  useEffect(() => {
    fetchVehicle();
  }, []);

  const fetchVehicle = async () => {
    setIsLoading(true);
    try {
      const response = await authApi.getProfile();
      const profile = response.data;
      // Map profile data to vehicle format
      const vehicleData: Vehicle = {
        id: profile.id?.toString() || '',
        make: profile.carModel?.brand?.name || '',
        model: profile.carModel?.name || '',
        year: profile.carProductionYear || 0,
        color: profile.carColor?.nameEn || '',
        plateNumber: profile.carPlate || '',
        type: 'sedan', // Default type
      };
      setVehicle(vehicleData);
      // Populate form
      setMake(vehicleData.make || '');
      setModel(vehicleData.model || '');
      setYear(vehicleData.year?.toString() || '');
      setColor(vehicleData.color || '');
      setPlateNumber(vehicleData.plateNumber || '');
      setVehicleType(vehicleData.type || 'sedan');
    } catch (error) {
      console.error('Error fetching vehicle:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!plateNumber || !year) {
      Alert.alert(t('errors.validationError'), t('errors.fillAllFields'));
      return;
    }

    setIsSaving(true);
    try {
      // Update via profile API - only carPlate and carProductionYear are directly editable
      await authApi.updateProfile({
        carPlate: plateNumber,
        carProductionYear: parseInt(year),
      });
      await fetchVehicle();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating vehicle:', error);
      Alert.alert(t('errors.updateFailed'), t('errors.tryAgain'));
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    if (vehicle) {
      setMake(vehicle.make || '');
      setModel(vehicle.model || '');
      setYear(vehicle.year?.toString() || '');
      setColor(vehicle.color || '');
      setPlateNumber(vehicle.plateNumber || '');
      setVehicleType(vehicle.type || 'sedan');
    }
    setIsEditing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => (isEditing ? cancelEdit() : router.back())}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.secondary }}
          >
            <Ionicons name={isEditing ? 'close' : 'arrow-back'} size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={{ color: colors.foreground }} className="text-xl font-bold ml-4">
            {t('vehicle.title')}
          </Text>
        </View>
        {!isEditing && vehicle && (
          <TouchableOpacity
            onPress={() => setIsEditing(true)}
            className="px-4 py-2 rounded-lg"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white font-medium">{t('common.edit')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !vehicle && !isEditing ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="car-outline" size={64} color={colors.muted} />
          <Text style={{ color: colors.foreground }} className="text-xl font-semibold mt-4">
            {t('vehicle.noVehicle')}
          </Text>
          <TouchableOpacity
            onPress={() => setIsEditing(true)}
            className="mt-4 px-6 py-3 rounded-xl"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white font-semibold">{t('vehicle.addVehicle')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {/* Vehicle Icon */}
          <View className="items-center mb-6">
            <View
              className="w-24 h-24 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.primary + '15' }}
            >
              <Ionicons name="car" size={48} color={colors.primary} />
            </View>
          </View>

          {/* Vehicle Type Selection */}
          <View className="mb-6">
            <Text style={{ color: colors.foreground }} className="mb-3 font-medium">
              {t('vehicle.type')}
            </Text>
            <View className="flex-row gap-3">
              {vehicleTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => isEditing && setVehicleType(type.value)}
                  disabled={!isEditing}
                  className="flex-1 py-4 rounded-xl items-center"
                  style={{
                    backgroundColor: vehicleType === type.value ? colors.primary + '15' : colors.secondary,
                    borderColor: vehicleType === type.value ? colors.primary : colors.border,
                    borderWidth: 2,
                    opacity: isEditing ? 1 : 0.7,
                  }}
                >
                  <Ionicons
                    name={type.icon}
                    size={28}
                    color={vehicleType === type.value ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={{ color: vehicleType === type.value ? colors.primary : colors.foreground }}
                    className="font-medium mt-1"
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Form Fields */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
                {t('vehicle.make')}
              </Text>
              <TextInput
                style={{
                  backgroundColor: isEditing ? colors.secondary : colors.muted,
                  borderColor: colors.border,
                  borderWidth: 1,
                  color: colors.foreground,
                }}
                className="px-4 py-3 rounded-xl text-base"
                value={make}
                onChangeText={setMake}
                editable={isEditing}
                placeholder="Toyota"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View className="flex-1">
              <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
                {t('vehicle.model')}
              </Text>
              <TextInput
                style={{
                  backgroundColor: isEditing ? colors.secondary : colors.muted,
                  borderColor: colors.border,
                  borderWidth: 1,
                  color: colors.foreground,
                }}
                className="px-4 py-3 rounded-xl text-base"
                value={model}
                onChangeText={setModel}
                editable={isEditing}
                placeholder="Camry"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
                {t('vehicle.year')}
              </Text>
              <TextInput
                style={{
                  backgroundColor: isEditing ? colors.secondary : colors.muted,
                  borderColor: colors.border,
                  borderWidth: 1,
                  color: colors.foreground,
                }}
                className="px-4 py-3 rounded-xl text-base"
                value={year}
                onChangeText={setYear}
                editable={isEditing}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="2023"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View className="flex-1">
              <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
                {t('vehicle.color')}
              </Text>
              <TextInput
                style={{
                  backgroundColor: isEditing ? colors.secondary : colors.muted,
                  borderColor: colors.border,
                  borderWidth: 1,
                  color: colors.foreground,
                }}
                className="px-4 py-3 rounded-xl text-base"
                value={color}
                onChangeText={setColor}
                editable={isEditing}
                placeholder="White"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
              {t('vehicle.plateNumber')}
            </Text>
            <TextInput
              style={{
                backgroundColor: isEditing ? colors.secondary : colors.muted,
                borderColor: colors.border,
                borderWidth: 1,
                color: colors.foreground,
              }}
              className="px-4 py-3 rounded-xl text-base"
              value={plateNumber}
              onChangeText={setPlateNumber}
              editable={isEditing}
              autoCapitalize="characters"
              placeholder="ABC 1234"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          {/* Save Button */}
          {isEditing && (
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              className="py-4 rounded-xl items-center"
              style={{ backgroundColor: colors.primary }}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-lg font-semibold">{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
