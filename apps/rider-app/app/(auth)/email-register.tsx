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
  const { setToken, setUser } = useAuthStore();
  const isDark = resolvedTheme === 'dark';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = firstName && lastName && email && phone && password && password === confirmPassword;

  const handleRegister = async () => {
    if (!isValid) return;

    setIsLoading(true);
    setError('');

    try {
      // TODO: Uncomment when API is ready
      // const response = await authApi.register({
      //   firstName,
      //   lastName,
      //   email,
      //   mobileNumber: phone,
      //   password,
      // });
      // await setToken(response.data.token);
      // setUser(response.data.user);

      // For now, simulate success
      await setToken('demo-token');
      setUser({
        id: '1',
        firstName,
        lastName,
        email,
        mobileNumber: phone,
        walletBalance: 0,
      });

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
              <TextInput
                className={inputStyle}
                placeholder={t('auth.email.phone')}
                placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
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
