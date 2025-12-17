import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import { getColors } from '@/constants/Colors';
import { authApi } from '@/lib/api';

export default function ProfileSetupScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { setToken, setUser } = useAuthStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);
  const { phone, otp } = useLocalSearchParams<{ phone: string; otp: string }>();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleComplete = async () => {
    if (!firstName || !lastName) return;

    setIsLoading(true);
    setError('');

    try {
      // Complete registration with OTP and profile info
      const response = await authApi.verifyOtpAndRegister({
        mobileNumber: phone || '',
        otp: otp || '',
        firstName,
        lastName,
        email: email || undefined,
      });

      // Save token and user data
      await setToken(response.data.accessToken);
      setUser({
        id: response.data.customer.id.toString(),
        firstName: response.data.customer.firstName || '',
        lastName: response.data.customer.lastName || '',
        email: response.data.customer.email || '',
        mobileNumber: response.data.customer.mobileNumber,
        gender: response.data.customer.gender,
        walletBalance: parseFloat(response.data.customer.walletBalance) || 0,
      });

      router.replace('/(main)');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || t('errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = `px-4 py-4 rounded-xl text-base ${
    isDark ? 'bg-muted-dark text-foreground-dark' : 'bg-muted text-foreground'
  }`;

  const genderOptions = [
    { value: 'male', label: t('auth.profile.male') },
    { value: 'female', label: t('auth.profile.female') },
    { value: 'other', label: t('auth.profile.other') },
  ];

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      <View className="flex-1 px-6">
        {/* Title */}
        <View className="mt-8">
          <Text className={`text-2xl font-bold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
            {t('auth.profile.setupTitle')}
          </Text>
          <Text className={`text-base mt-2 ${isDark ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
            {t('auth.profile.setupSubtitle')}
          </Text>
        </View>

        {/* Avatar */}
        <TouchableOpacity className="self-center mt-8">
          <View className="w-28 h-28 rounded-full bg-muted dark:bg-muted-dark items-center justify-center">
            <Ionicons
              name="camera"
              size={40}
              color={isDark ? '#757575' : '#9E9E9E'}
            />
          </View>
          <Text className="text-primary text-center mt-2 font-medium">
            {t('auth.profile.addPhoto')}
          </Text>
        </TouchableOpacity>

        {/* Form */}
        <View className="mt-8 gap-4">
          <View>
            <Text className={`mb-2 font-medium ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {t('auth.email.firstName')}
            </Text>
            <TextInput
              className={inputStyle}
              placeholder={t('auth.email.firstName')}
              placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>

          <View>
            <Text className={`mb-2 font-medium ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {t('auth.email.lastName')}
            </Text>
            <TextInput
              className={inputStyle}
              placeholder={t('auth.email.lastName')}
              placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
              value={lastName}
              onChangeText={setLastName}
            />
          </View>

          {/* Gender Selection */}
          <View>
            <Text className={`mb-2 font-medium ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {t('profile.gender')}
            </Text>
            <View className="flex-row gap-2">
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setGender(option.value)}
                  className={`flex-1 py-3 rounded-xl items-center border-2 ${
                    gender === option.value
                      ? 'border-primary bg-primary/10'
                      : isDark
                      ? 'border-border-dark bg-muted-dark'
                      : 'border-border bg-muted'
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      gender === option.value
                        ? 'text-primary'
                        : isDark
                        ? 'text-foreground-dark'
                        : 'text-foreground'
                    }`}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Buttons */}
        <View className="flex-1 justify-end pb-8">
          <TouchableOpacity
            onPress={handleComplete}
            disabled={!firstName || !lastName || isLoading}
            className={`py-4 rounded-xl items-center ${
              firstName && lastName ? 'bg-primary' : 'bg-muted dark:bg-muted-dark'
            }`}
          >
            <Text
              className={`text-lg font-semibold ${
                firstName && lastName ? 'text-white' : 'text-muted-foreground'
              }`}
            >
              {isLoading ? t('common.loading') : t('common.done')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(main)')}
            className="mt-4 items-center"
          >
            <Text className="text-muted-foreground text-base">
              {t('common.skip')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
