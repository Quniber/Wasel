import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import { getColors } from '@/constants/Colors';
import { driverApi, vehicleApi } from '@/lib/api';

export default function ProfileSetupScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { user, updateUser } = useAuthStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  // Vehicle info
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<string>('sedan');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const vehicleTypes = [
    { value: 'sedan', label: t('vehicle.sedan'), icon: 'car-outline' as const },
    { value: 'suv', label: t('vehicle.suv'), icon: 'car-sport-outline' as const },
    { value: 'van', label: t('vehicle.van'), icon: 'bus-outline' as const },
  ];

  const isValid = vehicleMake && vehicleModel && vehicleYear && vehicleColor && plateNumber;

  const handleComplete = async () => {
    if (!isValid) return;

    setIsLoading(true);
    setError('');

    try {
      await vehicleApi.create({
        make: vehicleMake,
        model: vehicleModel,
        year: parseInt(vehicleYear),
        color: vehicleColor,
        plateNumber,
        type: vehicleType,
      });

      // Update user status
      if (user) {
        updateUser({ ...user, status: 'pending_documents' });
      }

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
            {/* Make & Model Row */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
                  {t('vehicle.make')}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                    borderWidth: 1,
                    color: colors.foreground,
                  }}
                  className="px-4 py-4 rounded-xl text-base"
                  placeholder="Toyota"
                  placeholderTextColor={colors.mutedForeground}
                  value={vehicleMake}
                  onChangeText={setVehicleMake}
                />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
                  {t('vehicle.model')}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                    borderWidth: 1,
                    color: colors.foreground,
                  }}
                  className="px-4 py-4 rounded-xl text-base"
                  placeholder="Camry"
                  placeholderTextColor={colors.mutedForeground}
                  value={vehicleModel}
                  onChangeText={setVehicleModel}
                />
              </View>
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
                <TextInput
                  style={{
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                    borderWidth: 1,
                    color: colors.foreground,
                  }}
                  className="px-4 py-4 rounded-xl text-base"
                  placeholder="White"
                  placeholderTextColor={colors.mutedForeground}
                  value={vehicleColor}
                  onChangeText={setVehicleColor}
                />
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
    </SafeAreaView>
  );
}
