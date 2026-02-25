import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { getColors } from '@/constants/Colors';
import { authApi } from '@/lib/api';

export default function PhoneScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [countryCode, setCountryCode] = useState('+974');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (phoneNumber.length < 8) return;

    setIsLoading(true);
    setError('');
    const fullPhone = countryCode + phoneNumber;

    try {
      // Try login first (for existing users)
      const response = await authApi.loginWithPhone(fullPhone);

      // If dev mode, show OTP in alert
      if (response.data.devOtp) {
        Alert.alert('Dev OTP', `Your OTP is: ${response.data.devOtp}`);
      }

      router.push({
        pathname: '/(auth)/otp',
        params: { phone: fullPhone, mode: 'login' },
      });
    } catch (err: any) {
      // Show error message from server (e.g., "Phone number not registered")
      setError(err.response?.data?.message || t('errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = phoneNumber.length >= 8;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6">
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ backgroundColor: colors.secondary }}
            className="w-10 h-10 items-center justify-center mt-2 rounded-full"
          >
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </TouchableOpacity>

          {/* Title */}
          <View className="mt-8">
            <Text
              style={{ color: colors.foreground }}
              className="text-2xl font-bold"
            >
              {t('auth.phone.title')}
            </Text>
            <Text
              style={{ color: colors.mutedForeground }}
              className="text-base mt-2"
            >
              {t('auth.phone.subtitle')}
            </Text>
          </View>

          {/* Error Message */}
          {error && (
            <View
              style={{ backgroundColor: `${colors.destructive}15` }}
              className="mt-4 p-4 rounded-xl flex-row items-center"
            >
              <Ionicons name="alert-circle" size={20} color={colors.destructive} />
              <Text style={{ color: colors.destructive }} className="text-sm ml-2 flex-1">
                {error}
              </Text>
            </View>
          )}

          {/* Phone Input */}
          <View className="mt-8 flex-row gap-3">
            {/* Country Code */}
            <TouchableOpacity
              style={{
                backgroundColor: colors.secondary,
                borderColor: colors.border,
                borderWidth: 1,
              }}
              className="px-4 py-4 rounded-xl items-center justify-center"
            >
              <Text
                style={{ color: colors.foreground }}
                className="text-lg font-medium"
              >
                {countryCode}
              </Text>
            </TouchableOpacity>

            {/* Phone Number */}
            <TextInput
              style={{
                backgroundColor: colors.secondary,
                borderColor: colors.border,
                borderWidth: 1,
                color: colors.foreground,
              }}
              className="flex-1 px-4 py-4 rounded-xl text-lg"
              placeholder={t('auth.phone.placeholder')}
              placeholderTextColor={colors.mutedForeground}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoFocus
            />
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            onPress={handleContinue}
            disabled={!isValid || isLoading}
            style={{
              backgroundColor: isValid ? colors.primary : colors.secondary,
            }}
            className="mt-8 py-4 rounded-xl items-center"
          >
            <Text
              style={{
                color: isValid ? colors.primaryForeground : colors.mutedForeground,
              }}
              className="text-lg font-semibold"
            >
              {isLoading ? t('common.loading') : t('common.continue')}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center my-8">
            <View style={{ backgroundColor: colors.border }} className="flex-1 h-px" />
            <Text style={{ color: colors.mutedForeground }} className="px-4 text-sm">
              {t('common.or') || 'OR'}
            </Text>
            <View style={{ backgroundColor: colors.border }} className="flex-1 h-px" />
          </View>

          {/* Use Email Instead */}
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/email-login')}
            style={{
              backgroundColor: colors.background,
              borderColor: colors.border,
              borderWidth: 1,
            }}
            className="py-4 rounded-xl items-center flex-row justify-center"
          >
            <Ionicons name="mail-outline" size={20} color={colors.foreground} />
            <Text
              style={{ color: colors.foreground }}
              className="text-base font-medium ml-2"
            >
              {t('auth.phone.useEmail')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
