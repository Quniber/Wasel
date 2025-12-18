import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api';

export default function EmailRegisterScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { setSession } = useAuthStore();
  const isDark = resolvedTheme === 'dark';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+974');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const genderOptions = [
    { value: 'male', label: t('auth.profile.male') },
    { value: 'female', label: t('auth.profile.female') },
    { value: 'other', label: t('auth.profile.other') },
  ];

  const isValid = firstName && lastName && email && phone && password && password === confirmPassword;

  const handleRegister = async () => {
    if (!isValid) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await authApi.registerWithEmail({
        firstName,
        lastName,
        email,
        mobileNumber: countryCode + phone,
        password,
        gender: gender || undefined,
      });

      // Save session with tokens (for persistence)
      await setSession(
        {
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          expiresIn: response.data.expiresIn || 3600,
        },
        {
          id: response.data.customer.id.toString(),
          firstName: response.data.customer.firstName || '',
          lastName: response.data.customer.lastName || '',
          email: response.data.customer.email || '',
          mobileNumber: response.data.customer.mobileNumber,
          gender: response.data.customer.gender,
          walletBalance: parseFloat(response.data.customer.walletBalance) || 0,
        }
      );

      router.replace('/(main)');
    } catch (err: any) {
      setError(err.response?.data?.message || t('errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = `px-4 py-4 rounded-xl text-base ${
    isDark ? 'bg-muted-dark text-foreground-dark' : 'bg-muted text-foreground'
  }`;

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" contentContainerClassName="px-6 pb-8">
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
          <View className="mt-6">
            <Text className={`text-2xl font-bold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {t('auth.email.registerTitle')}
            </Text>
            <Text className={`text-base mt-2 ${isDark ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
              {t('auth.email.registerSubtitle')}
            </Text>
          </View>

          {/* Avatar */}
          <TouchableOpacity className="self-center mt-6">
            <View className={`w-24 h-24 rounded-full items-center justify-center ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}>
              <Ionicons
                name="camera"
                size={32}
                color={isDark ? '#757575' : '#9E9E9E'}
              />
            </View>
            <Text className="text-primary text-center mt-2 font-medium">
              {t('auth.profile.addPhoto')}
            </Text>
          </TouchableOpacity>

          {/* Error Message */}
          {error && (
            <View className="mt-4 p-3 bg-destructive/10 rounded-xl">
              <Text className="text-destructive text-sm">{error}</Text>
            </View>
          )}

          {/* Form */}
          <View className="mt-6 gap-4">
            {/* Name Row */}
            <View className="flex-row gap-3">
              <View className="flex-1">
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
              <View className="flex-1">
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
            </View>

            <View>
              <Text className={`mb-2 font-medium ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {t('auth.email.email')}
              </Text>
              <TextInput
                className={inputStyle}
                placeholder={t('auth.email.email')}
                placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View>
              <Text className={`mb-2 font-medium ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {t('auth.email.phone')}
              </Text>
              <View className="flex-row gap-3">
                <View className={`px-4 py-4 rounded-xl items-center justify-center ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}>
                  <Text className={`text-base font-medium ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                    {countryCode}
                  </Text>
                </View>
                <TextInput
                  className={`flex-1 ${inputStyle}`}
                  placeholder={t('auth.email.phonePlaceholder') || 'Phone number'}
                  placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View>
              <Text className={`mb-2 font-medium ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {t('auth.email.password')}
              </Text>
              <View className="relative">
                <TextInput
                  className={`${inputStyle} pr-12`}
                  placeholder={t('auth.email.password')}
                  placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4"
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color={isDark ? '#757575' : '#9E9E9E'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text className={`mb-2 font-medium ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {t('auth.email.confirmPassword')}
              </Text>
              <TextInput
                className={inputStyle}
                placeholder={t('auth.email.confirmPassword')}
                placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
              {password && confirmPassword && password !== confirmPassword && (
                <Text className="text-destructive text-sm mt-1">
                  Passwords do not match
                </Text>
              )}
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

            {/* Register Button */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={!isValid || isLoading}
              className={`py-4 rounded-xl items-center mt-4 ${
                isValid ? 'bg-primary' : 'bg-muted dark:bg-muted-dark'
              }`}
            >
              <Text
                className={`text-lg font-semibold ${
                  isValid ? 'text-white' : 'text-muted-foreground'
                }`}
              >
                {isLoading ? t('common.loading') : t('auth.email.register')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View className="flex-row justify-center mt-6">
            <Text className={`text-base ${isDark ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
              {t('auth.email.hasAccount')}{' '}
            </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/email-login')}>
              <Text className="text-primary text-base font-semibold">
                {t('auth.email.signIn')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
