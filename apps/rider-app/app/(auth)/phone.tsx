import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';

export default function PhoneScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (phoneNumber.length < 8) return;

    setIsLoading(true);
    try {
      // TODO: Call API to send OTP
      // await authApi.loginWithPhone({ mobileNumber: countryCode + phoneNumber });
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: countryCode + phoneNumber },
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6">
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center mt-2"
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={isDark ? '#FAFAFA' : '#212121'}
            />
          </TouchableOpacity>

          {/* Title */}
          <View className="mt-8">
            <Text className={`text-2xl font-bold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {t('auth.phone.title')}
            </Text>
            <Text className={`text-base mt-2 ${isDark ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
              {t('auth.phone.subtitle')}
            </Text>
          </View>

          {/* Phone Input */}
          <View className="mt-8 flex-row gap-3">
            {/* Country Code */}
            <TouchableOpacity
              className={`px-4 py-4 rounded-xl items-center justify-center ${
                isDark ? 'bg-muted-dark' : 'bg-muted'
              }`}
            >
              <Text className={`text-lg font-medium ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {countryCode}
              </Text>
            </TouchableOpacity>

            {/* Phone Number */}
            <TextInput
              className={`flex-1 px-4 py-4 rounded-xl text-lg ${
                isDark ? 'bg-muted-dark text-foreground-dark' : 'bg-muted text-foreground'
              }`}
              placeholder={t('auth.phone.placeholder')}
              placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoFocus
            />
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            onPress={handleContinue}
            disabled={phoneNumber.length < 8 || isLoading}
            className={`mt-8 py-4 rounded-xl items-center ${
              phoneNumber.length >= 8 ? 'bg-primary' : 'bg-muted dark:bg-muted-dark'
            }`}
          >
            <Text
              className={`text-lg font-semibold ${
                phoneNumber.length >= 8 ? 'text-white' : 'text-muted-foreground'
              }`}
            >
              {isLoading ? t('common.loading') : t('common.continue')}
            </Text>
          </TouchableOpacity>

          {/* Use Email Instead */}
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/email-login')}
            className="mt-6 items-center"
          >
            <Text className="text-primary text-base font-medium">
              {t('auth.phone.useEmail')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
