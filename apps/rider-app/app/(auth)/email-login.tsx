import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api';

export default function EmailLoginScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { setToken, setUser } = useAuthStore();
  const isDark = resolvedTheme === 'dark';

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
      // TODO: Uncomment when API is ready
      // const response = await authApi.login({ email, password });
      // await setToken(response.data.token);
      // setUser(response.data.user);

      // For now, simulate success
      await setToken('demo-token');
      setUser({
        id: '1',
        firstName: 'Demo',
        lastName: 'User',
        email: email,
        mobileNumber: '+1234567890',
        walletBalance: 0,
      });

      router.replace('/(main)');
    } catch (err: any) {
      setError(err.response?.data?.message || t('errors.invalidCredentials'));
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
          <View className="mt-8">
            <Text className={`text-2xl font-bold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {t('auth.email.loginTitle')}
            </Text>
            <Text className={`text-base mt-2 ${isDark ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
              {t('auth.email.loginSubtitle')}
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

            {/* Forgot Password */}
            <TouchableOpacity className="self-end">
              <Text className="text-primary font-medium">
                {t('auth.email.forgotPassword')}
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={!email || !password || isLoading}
              className={`py-4 rounded-xl items-center mt-4 ${
                email && password ? 'bg-primary' : 'bg-muted dark:bg-muted-dark'
              }`}
            >
              <Text
                className={`text-lg font-semibold ${
                  email && password ? 'text-white' : 'text-muted-foreground'
                }`}
              >
                {isLoading ? t('common.loading') : t('auth.email.login')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Use Phone Instead */}
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/phone')}
            className="mt-6 items-center"
          >
            <Text className="text-primary text-base font-medium">
              {t('auth.email.usePhone')}
            </Text>
          </TouchableOpacity>

          {/* Register Link */}
          <View className="flex-row justify-center mt-8">
            <Text className={`text-base ${isDark ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
              {t('auth.email.noAccount')}{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/email-register')}>
              <Text className="text-primary text-base font-semibold">
                {t('auth.email.signUp')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
