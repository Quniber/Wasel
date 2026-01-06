import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Modal } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import { getColors } from '@/constants/Colors';
import { authApi, vehicleApi } from '@/lib/api';

interface CarModel {
  id: number;
  brand: string;
  model: string;
  year?: number;
  isActive: boolean;
}

interface CarColor {
  id: number;
  name: string;
  hexCode?: string;
  isActive: boolean;
}

export default function ProfileSetupScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { updateUser } = useAuthStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  // Car models and colors
  const [carModels, setCarModels] = useState<CarModel[]>([]);
  const [carColors, setCarColors] = useState<CarColor[]>([]);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Vehicle info
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [vehicleYear, setVehicleYear] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<string>('sedan');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper to get selected model display text
  const getSelectedModelText = () => {
    if (!selectedModelId) return '';
    const model = carModels.find(m => m.id === selectedModelId);
    return model ? `${model.brand} ${model.model}` : '';
  };

  // Helper to get selected color display text
  const getSelectedColorText = () => {
    if (!selectedColorId) return '';
    const color = carColors.find(c => c.id === selectedColorId);
    return color ? color.name : '';
  };

  useEffect(() => {
    fetchCarModelsAndColors();
  }, []);

  const fetchCarModelsAndColors = async () => {
    try {
      const [modelsRes, colorsRes] = await Promise.all([
        vehicleApi.getCarModels(),
        vehicleApi.getCarColors(),
      ]);
      setCarModels(modelsRes.data || []);
      setCarColors(colorsRes.data || []);
    } catch (error) {
      console.error('Error fetching car data:', error);
    }
  };

  const vehicleTypes = [
    { value: 'sedan', label: t('vehicle.sedan'), icon: 'car-outline' as const },
    { value: 'suv', label: t('vehicle.suv'), icon: 'car-sport-outline' as const },
    { value: 'van', label: t('vehicle.van'), icon: 'bus-outline' as const },
  ];

  const isValid = selectedModelId && selectedColorId && vehicleYear && plateNumber;

  const handleComplete = async () => {
    if (!isValid) return;

    setIsLoading(true);
    setError('');

    try {
      // Update driver profile with vehicle info
      await authApi.updateProfile({
        carPlate: plateNumber,
        carProductionYear: parseInt(vehicleYear),
        carModelId: selectedModelId!,
        carColorId: selectedColorId!,
      });

      // Update user status locally
      updateUser({ status: 'waiting_documents' });

      router.replace('/(main)');
    } catch (err: any) {
      setError(err.response?.data?.message || t('errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 }}>
          {/* Title */}
          <View className="mt-8">
            <Text style={{ color: colors.foreground }} className="text-2xl font-bold">
              {t('auth.profile.vehicleTitle')}
            </Text>
            <Text style={{ color: colors.mutedForeground }} className="text-base mt-2">
              {t('auth.profile.vehicleSubtitle')}
            </Text>
          </View>

          {/* Vehicle Icon */}
          <View className="self-center mt-8">
            <View
              className="w-28 h-28 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.secondary }}
            >
              <Ionicons name="car" size={48} color={colors.primary} />
            </View>
          </View>

          {/* Error Message */}
          {error ? (
            <View className="mt-4 p-3 rounded-xl" style={{ backgroundColor: colors.destructive + '20' }}>
              <Text style={{ color: colors.destructive }} className="text-sm">{error}</Text>
            </View>
          ) : null}

          {/* Vehicle Type Selection */}
          <View className="mt-8">
            <Text style={{ color: colors.foreground }} className="mb-3 font-medium">
              {t('vehicle.type')}
            </Text>
            <View className="flex-row gap-3">
              {vehicleTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => setVehicleType(type.value)}
                  className="flex-1 py-4 rounded-xl items-center"
                  style={{
                    backgroundColor: vehicleType === type.value ? colors.primary + '15' : colors.secondary,
                    borderColor: vehicleType === type.value ? colors.primary : colors.border,
                    borderWidth: 2,
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

          {/* Form */}
          <View className="mt-6">
            {/* Car Model */}
            <View className="mb-4">
              <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
                {t('vehicle.model')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowModelPicker(true)}
                style={{
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  borderWidth: 1,
                }}
                className="px-4 py-4 rounded-xl flex-row items-center justify-between"
              >
                <Text
                  style={{ color: getSelectedModelText() ? colors.foreground : colors.mutedForeground }}
                  className="text-base"
                >
                  {getSelectedModelText() || 'Select car model'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Year & Color Row */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
                  {t('vehicle.year')}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                    borderWidth: 1,
                    color: colors.foreground,
                  }}
                  className="px-4 py-4 rounded-xl text-base"
                  placeholder="2023"
                  placeholderTextColor={colors.mutedForeground}
                  value={vehicleYear}
                  onChangeText={setVehicleYear}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
                  {t('vehicle.color')}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowColorPicker(true)}
                  style={{
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                    borderWidth: 1,
                  }}
                  className="px-4 py-4 rounded-xl flex-row items-center justify-between"
                >
                  <Text
                    style={{ color: getSelectedColorText() ? colors.foreground : colors.mutedForeground }}
                    className="text-base"
                  >
                    {getSelectedColorText() || 'Select color'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Plate Number */}
            <View className="mb-4">
              <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
                {t('vehicle.plateNumber')}
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  borderWidth: 1,
                  color: colors.foreground,
                }}
                className="px-4 py-4 rounded-xl text-base"
                placeholder="ABC 1234"
                placeholderTextColor={colors.mutedForeground}
                value={plateNumber}
                onChangeText={setPlateNumber}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* Buttons */}
          <View className="flex-1 justify-end mt-6">
            <TouchableOpacity
              onPress={handleComplete}
              disabled={!isValid || isLoading}
              style={{ backgroundColor: isValid ? colors.primary : colors.muted }}
              className="py-4 rounded-xl items-center"
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text
                  style={{ color: isValid ? colors.primaryForeground : colors.mutedForeground }}
                  className="text-lg font-semibold"
                >
                  {t('common.continue')}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace('/(main)')}
              className="mt-4 items-center py-3"
            >
              <Text style={{ color: colors.mutedForeground }} className="text-base">
                {t('common.skip')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Car Model Picker Modal */}
      <Modal
        visible={showModelPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModelPicker(false)}
      >
        <View className="flex-1 bg-black/50">
          <View className="flex-1" />
          <View
            className="rounded-t-3xl"
            style={{ backgroundColor: colors.background, maxHeight: '70%' }}
          >
            <View className="px-4 py-4 border-b" style={{ borderColor: colors.border }}>
              <View className="flex-row items-center justify-between">
                <Text style={{ color: colors.foreground }} className="text-xl font-bold">
                  Select Car Model
                </Text>
                <TouchableOpacity onPress={() => setShowModelPicker(false)}>
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView className="px-4">
              {carModels.filter(m => m.isActive).map((model) => (
                <TouchableOpacity
                  key={model.id}
                  onPress={() => {
                    setSelectedModelId(model.id);
                    setShowModelPicker(false);
                  }}
                  className="py-4 border-b flex-row items-center justify-between"
                  style={{ borderColor: colors.border }}
                >
                  <View>
                    <Text style={{ color: colors.foreground }} className="text-base font-medium">
                      {model.brand} {model.model}
                    </Text>
                    {model.year && (
                      <Text style={{ color: colors.mutedForeground }} className="text-sm">
                        {model.year}
                      </Text>
                    )}
                  </View>
                  {selectedModelId === model.id && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Car Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <View className="flex-1 bg-black/50">
          <View className="flex-1" />
          <View
            className="rounded-t-3xl"
            style={{ backgroundColor: colors.background, maxHeight: '70%' }}
          >
            <View className="px-4 py-4 border-b" style={{ borderColor: colors.border }}>
              <View className="flex-row items-center justify-between">
                <Text style={{ color: colors.foreground }} className="text-xl font-bold">
                  Select Car Color
                </Text>
                <TouchableOpacity onPress={() => setShowColorPicker(false)}>
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView className="px-4">
              {carColors.filter(c => c.isActive).map((color) => (
                <TouchableOpacity
                  key={color.id}
                  onPress={() => {
                    setSelectedColorId(color.id);
                    setShowColorPicker(false);
                  }}
                  className="py-4 border-b flex-row items-center justify-between"
                  style={{ borderColor: colors.border }}
                >
                  <View className="flex-row items-center">
                    {color.hexCode && (
                      <View
                        className="w-8 h-8 rounded-full mr-3"
                        style={{ backgroundColor: color.hexCode, borderColor: colors.border, borderWidth: 1 }}
                      />
                    )}
                    <Text style={{ color: colors.foreground }} className="text-base font-medium">
                      {color.name}
                    </Text>
                  </View>
                  {selectedColorId === color.id && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
