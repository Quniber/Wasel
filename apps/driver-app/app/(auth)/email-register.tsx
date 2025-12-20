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

export default function EmailRegisterScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { setSession } = useAuthStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode] = useState('+974');
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
      const response = await authApi.registerWithEmail({
        firstName,
        lastName,
        email,
        mobileNumber: countryCode + phone,
        password,
      });

      const { accessToken, refreshToken, expiresIn, driver } = response.data;

      await setSession(
        { accessToken, refreshToken, expiresIn },
        {
          id: driver.id.toString(),
          firstName: driver.firstName || '',
          lastName: driver.lastName || '',
          email: driver.email || '',
          mobileNumber: driver.mobileNumber,
          rating: driver.rating || 5.0,
          status: driver.status || 'pending',
        }
      );

      // Driver needs to complete profile with vehicle info
      router.replace('/(auth)/profile-setup');
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

          {/* Title */}
          <View className="mt-6">
            <Text style={{ color: colors.foreground }} className="text-2xl font-bold">
              {t('auth.email.registerTitle')}
            </Text>
            <Text style={{ color: colors.mutedForeground }} className="text-base mt-2">
              {t('auth.email.registerSubtitle')}
            </Text>
          </View>

          {/* Avatar */}
          <TouchableOpacity className="self-center mt-6">
            <View
              className="w-24 h-24 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.secondary }}
            >
              <Ionicons name="camera" size={32} color={colors.mutedForeground} />
            </View>
            <Text style={{ color: colors.primary }} className="text-center mt-2 font-medium">
              {t('auth.profile.addPhoto')}
            </Text>
          </TouchableOpacity>

          {/* Error Message */}
          {error ? (
            <View className="mt-4 p-3 rounded-xl" style={{ backgroundColor: colors.destructive + '20' }}>
              <Text style={{ color: colors.destructive }} className="text-sm">{error}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View className="mt-6">
            {/* Name Row */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
                  {t('auth.email.firstName')}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                    borderWidth: 1,
                    color: colors.foreground,
                  }}
                  className="px-4 py-4 rounded-xl text-base"
                  placeholder={t('auth.email.firstName')}
                  placeholderTextColor={colors.mutedForeground}
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
                  {t('auth.email.lastName')}
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                    borderWidth: 1,
                    color: colors.foreground,
                  }}
                  className="px-4 py-4 rounded-xl text-base"
                  placeholder={t('auth.email.lastName')}
                  placeholderTextColor={colors.mutedForeground}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>

            {/* Email */}
            <View className="mb-4">
              <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
                {t('auth.email.email')}
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  borderWidth: 1,
                  color: colors.foreground,
                }}
                className="px-4 py-4 rounded-xl text-base"
                placeholder={t('auth.email.email')}
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Phone */}
            <View className="mb-4">
              <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
                {t('auth.email.phone')}
              </Text>
              <View className="flex-row gap-3">
                <View
                  className="px-4 py-4 rounded-xl items-center justify-center"
                  style={{ backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 }}
                >
                  <Text style={{ color: colors.foreground }} className="text-base font-medium">
                    {countryCode}
                  </Text>
                </View>
                <TextInput
                  style={{
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                    borderWidth: 1,
                    color: colors.foreground,
                    flex: 1,
                  }}
                  className="px-4 py-4 rounded-xl text-base"
                  placeholder="Phone number"
                  placeholderTextColor={colors.mutedForeground}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Password */}
            <View className="mb-4">
              <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
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
                <TextInput
                  style={{ color: colors.foreground }}
                  className="flex-1 text-base"
                  placeholder={t('auth.email.password')}
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

            {/* Confirm Password */}
            <View className="mb-4">
              <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
                {t('auth.email.confirmPassword')}
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.secondary,
                  borderColor: password && confirmPassword && password !== confirmPassword ? colors.destructive : colors.border,
                  borderWidth: 1,
                  color: colors.foreground,
                }}
                className="px-4 py-4 rounded-xl text-base"
                placeholder={t('auth.email.confirmPassword')}
                placeholderTextColor={colors.mutedForeground}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
              {password && confirmPassword && password !== confirmPassword && (
                <Text style={{ color: colors.destructive }} className="text-sm mt-1">
                  Passwords do not match
                </Text>
              )}
            </View>

            {/* Register Button */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={!isValid || isLoading}
              style={{ backgroundColor: isValid ? colors.primary : colors.muted }}
              className="py-4 rounded-xl items-center mt-4"
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text
                  style={{ color: isValid ? colors.primaryForeground : colors.mutedForeground }}
                  className="text-lg font-semibold"
                >
                  {t('auth.email.register')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View className="flex-row justify-center mt-6">
            <Text style={{ color: colors.mutedForeground }} className="text-base">
              {t('auth.email.hasAccount')}{' '}
            </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/email-login')}>
              <Text style={{ color: colors.primary }} className="text-base font-semibold">
                {t('auth.email.signIn')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
