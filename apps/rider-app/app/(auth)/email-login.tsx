import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
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
  const { setToken, setUser } = useAuthStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await authApi.loginWithEmail({ email, password });

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
      setError(err.response?.data?.message || t('errors.invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = email && password;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}>
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
              {t('auth.email.loginTitle')}
            </Text>
            <Text
              style={{ color: colors.mutedForeground }}
              className="text-base mt-2"
            >
              {t('auth.email.loginSubtitle')}
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

          {/* Form */}
          <View className="mt-6">
            {/* Email Field */}
            <View className="mb-4">
              <Text
                style={{ color: colors.foreground }}
                className="mb-2 font-medium"
              >
                {t('auth.email.email')}
              </Text>
              <View
                style={{
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  borderWidth: 1,
                }}
                className="flex-row items-center rounded-xl px-4"
              >
                <Ionicons name="mail-outline" size={20} color={colors.mutedForeground} />
                <TextInput
                  style={{ color: colors.foreground }}
                  className="flex-1 px-3 py-4 text-base"
                  placeholder={t('auth.email.emailPlaceholder') || 'Enter your email'}
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Field */}
            <View className="mb-4">
              <Text
                style={{ color: colors.foreground }}
                className="mb-2 font-medium"
              >
                {t('auth.email.password')}
              </Text>
              <View
                style={{
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  borderWidth: 1,
                }}
                className="flex-row items-center rounded-xl px-4"
              >
                <Ionicons name="lock-closed-outline" size={20} color={colors.mutedForeground} />
                <TextInput
                  style={{ color: colors.foreground }}
                  className="flex-1 px-3 py-4 text-base"
                  placeholder={t('auth.email.passwordPlaceholder') || 'Enter your password'}
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
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

            {/* Forgot Password */}
            <TouchableOpacity className="self-end mb-6">
              <Text style={{ color: colors.primary }} className="font-medium">
                {t('auth.email.forgotPassword')}
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={!isValid || isLoading}
              style={{
                backgroundColor: isValid ? colors.primary : colors.secondary,
              }}
              className="py-4 rounded-xl items-center flex-row justify-center"
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text
                  style={{
                    color: isValid ? colors.primaryForeground : colors.mutedForeground,
                  }}
                  className="text-lg font-semibold"
                >
                  {t('auth.email.login')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View className="flex-row items-center my-8">
            <View style={{ backgroundColor: colors.border }} className="flex-1 h-px" />
            <Text style={{ color: colors.mutedForeground }} className="px-4 text-sm">
              {t('common.or') || 'OR'}
            </Text>
            <View style={{ backgroundColor: colors.border }} className="flex-1 h-px" />
          </View>

          {/* Use Phone Instead */}
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/phone')}
            style={{
              backgroundColor: colors.background,
              borderColor: colors.border,
              borderWidth: 1,
            }}
            className="py-4 rounded-xl items-center flex-row justify-center"
          >
            <Ionicons name="call-outline" size={20} color={colors.foreground} />
            <Text
              style={{ color: colors.foreground }}
              className="text-base font-medium ml-2"
            >
              {t('auth.email.usePhone')}
            </Text>
          </TouchableOpacity>

          {/* Register Link */}
          <View className="flex-row justify-center mt-8">
            <Text style={{ color: colors.mutedForeground }} className="text-base">
              {t('auth.email.noAccount')}{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/email-register')}>
              <Text style={{ color: colors.primary }} className="text-base font-semibold">
                {t('auth.email.signUp')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
