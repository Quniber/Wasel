import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
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

  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!phone || phone.length < 8) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Format phone number (add country code if needed)
      const formattedPhone = phone.startsWith('+') ? phone : `+974${phone}`;

      // Try login first (for existing users)
      const response = await authApi.loginWithPhone(formattedPhone);

      // If dev mode, show OTP in alert
      if (response.data.devOtp) {
        Alert.alert('Dev OTP', `Your OTP is: ${response.data.devOtp}`);
      }

      router.push({
        pathname: '/(auth)/otp',
        params: { phone: formattedPhone, mode: 'login' },
      });
    } catch (err: any) {
      // If user not found, try registration
      if (err.response?.status === 404) {
        try {
          const formattedPhone = phone.startsWith('+') ? phone : `+974${phone}`;
          const regResponse = await authApi.registerWithPhone(formattedPhone);

          if (regResponse.data.devOtp) {
            Alert.alert('Dev OTP', `Your OTP is: ${regResponse.data.devOtp}`);
          }

          router.push({
            pathname: '/(auth)/otp',
            params: { phone: formattedPhone, mode: 'register' },
          });
        } catch (regErr: any) {
          setError(regErr.response?.data?.message || t('errors.generic'));
        }
      } else {
        setError(err.response?.data?.message || t('errors.generic'));
      }
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
        <View className="flex-1 px-6">
          {/* Header */}
          <View className="flex-row items-center mt-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.secondary }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="flex-1 justify-center">
            <Text
              style={{ color: colors.foreground }}
              className="text-2xl font-bold mb-2"
            >
              {t('auth.phone.title')}
            </Text>
            <Text
              style={{ color: colors.mutedForeground }}
              className="text-base mb-8"
            >
              {t('auth.phone.subtitle')}
            </Text>

            {/* Phone Input */}
            <View
              style={{
                backgroundColor: colors.secondary,
                borderColor: error ? colors.destructive : colors.border,
                borderWidth: 1,
              }}
              className="flex-row items-center rounded-xl px-4 py-3"
            >
              <Text style={{ color: colors.foreground }} className="text-lg mr-2">
                +974
              </Text>
              <TextInput
                style={{ color: colors.foreground }}
                className="flex-1 text-lg"
                placeholder={t('auth.phone.placeholder')}
                placeholderTextColor={colors.mutedForeground}
                value={phone}
                onChangeText={(text) => {
                  setPhone(text.replace(/[^0-9]/g, ''));
                  setError('');
                }}
                keyboardType="phone-pad"
                maxLength={8}
                autoFocus
              />
            </View>

            {error ? (
              <Text className="text-destructive text-sm mt-2">{error}</Text>
            ) : null}
          </View>

          {/* Bottom Button */}
          <View className="pb-8">
            <TouchableOpacity
              onPress={handleContinue}
              disabled={isLoading || phone.length < 8}
              style={{
                backgroundColor: phone.length >= 8 ? colors.primary : colors.muted,
              }}
              className="py-4 rounded-xl items-center"
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text
                  style={{
                    color: phone.length >= 8 ? colors.primaryForeground : colors.mutedForeground,
                  }}
                  className="text-base font-semibold"
                >
                  {t('common.continue')}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/email-login')}
              className="py-4 items-center"
            >
              <Text style={{ color: colors.primary }} className="text-base">
                {t('auth.phone.useEmail')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
