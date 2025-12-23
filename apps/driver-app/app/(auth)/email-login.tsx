import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import { getColors } from '@/constants/Colors';
import { authApi } from '@/lib/api';

export default function EmailLoginScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { setSession } = useAuthStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authApi.loginWithEmail({ email, password });
      const { accessToken, refreshToken, expiresIn, driver } = response.data;

      await setSession({ accessToken, refreshToken, expiresIn }, {
        id: driver.id.toString(),
        firstName: driver.firstName || '',
        lastName: driver.lastName || '',
        email: driver.email || '',
        mobileNumber: driver.mobileNumber,
        status: driver.status,
        rating: driver.rating,
      });
      router.replace('/(main)');
    } catch (err: any) {
      setError(err.response?.data?.message || t('errors.invalidCredentials'));
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
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
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
                {t('auth.email.loginTitle')}
              </Text>
              <Text
                style={{ color: colors.mutedForeground }}
                className="text-base mb-8"
              >
                {t('auth.email.loginSubtitle')}
              </Text>

              {/* Email Input */}
              <View className="mb-4">
                <Text style={{ color: colors.foreground }} className="text-sm font-medium mb-2">
                  {t('auth.email.email')}
                </Text>
                <View
                  style={{
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                    borderWidth: 1,
                  }}
                  className="flex-row items-center rounded-xl px-4 py-3"
                >
                  <Ionicons name="mail-outline" size={20} color={colors.mutedForeground} />
                  <TextInput
                    style={{ color: colors.foreground }}
                    className="flex-1 text-base ml-3"
                    placeholder={t('auth.email.email')}
                    placeholderTextColor={colors.mutedForeground}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className="mb-4">
                <Text style={{ color: colors.foreground }} className="text-sm font-medium mb-2">
                  {t('auth.email.password')}
                </Text>
                <View
                  style={{
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                    borderWidth: 1,
                  }}
                  className="flex-row items-center rounded-xl px-4 py-3"
                >
                  <Ionicons name="lock-closed-outline" size={20} color={colors.mutedForeground} />
                  <TextInput
                    style={{ color: colors.foreground }}
                    className="flex-1 text-base ml-3"
                    placeholder={t('auth.email.password')}
                    placeholderTextColor={colors.mutedForeground}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setError('');
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.mutedForeground}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {error ? (
                <Text className="text-destructive text-sm mb-4">{error}</Text>
              ) : null}

              {/* Login Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading}
                style={{ backgroundColor: colors.primary }}
                className="py-4 rounded-xl items-center mt-4"
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text
                    style={{ color: colors.primaryForeground }}
                    className="text-base font-semibold"
                  >
                    {t('auth.email.login')}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Forgot Password */}
              <TouchableOpacity className="py-4 items-center">
                <Text style={{ color: colors.primary }} className="text-base">
                  {t('auth.email.forgotPassword')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bottom */}
            <View className="pb-8">
              <View className="flex-row justify-center items-center">
                <Text style={{ color: colors.mutedForeground }} className="text-base">
                  {t('auth.email.noAccount')}{' '}
                </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/email-register')}>
                  <Text style={{ color: colors.primary }} className="text-base font-semibold">
                    {t('auth.email.signUp')}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/(auth)/phone')}
                className="py-4 items-center"
              >
                <Text style={{ color: colors.primary }} className="text-base">
                  {t('auth.email.usePhone')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
