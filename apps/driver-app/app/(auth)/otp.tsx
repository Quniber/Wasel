import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import { getColors } from '@/constants/Colors';
import { authApi } from '@/lib/api';

export default function OtpScreen() {
  const { t } = useTranslation();
  const { phone, mode } = useLocalSearchParams<{ phone: string; mode: string }>();
  const { resolvedTheme } = useThemeStore();
  const { setSession } = useAuthStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit when complete
    if (newOtp.every((digit) => digit) && newOtp.join('').length === 6) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code: string) => {
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'register') {
        // For new users, prompt for name then verify OTP and register
        Alert.prompt(
          t('auth.register.enterName'),
          t('auth.register.nameRequired'),
          [
            {
              text: t('common.cancel'),
              style: 'cancel',
              onPress: () => {
                setIsLoading(false);
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
              }
            },
            {
              text: t('common.continue'),
              onPress: async (firstName) => {
                if (!firstName || firstName.trim().length === 0) {
                  setError(t('errors.nameRequired'));
                  setIsLoading(false);
                  return;
                }

                try {
                  // Verify OTP and create account with name
                  const response = await authApi.verifyOtpAndRegister({
                    mobileNumber: phone!,
                    otp: code,
                    firstName: firstName.trim(),
                    lastName: '', // Can be filled later
                  });

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

                  // Go to profile setup to add vehicle info
                  router.replace('/(auth)/profile-setup');
                } catch (err: any) {
                  setError(err.response?.data?.message || t('errors.invalidOtp'));
                  setOtp(['', '', '', '', '', '']);
                  inputRefs.current[0]?.focus();
                } finally {
                  setIsLoading(false);
                }
              }
            }
          ],
          'plain-text'
        );
        return;
      } else {
        // For existing users, verify OTP and login
        const response = await authApi.verifyOtpLogin({ mobileNumber: phone!, otp: code });
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

        // Check if vehicle info is complete (not just name)
        const hasVehicleInfo = driver.carModelId && driver.carColorId && driver.carPlate;

        if (!hasVehicleInfo) {
          // Only redirect to profile setup if vehicle info is missing
          router.replace('/(auth)/profile-setup');
        } else {
          router.replace('/(main)');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('errors.invalidOtp'));
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    try {
      const response = await authApi.resendOtp(phone!);
      setResendTimer(60);

      // Show OTP in dev mode
      if (response.data.devOtp) {
        Alert.alert('Dev OTP', `Your new OTP is: ${response.data.devOtp}`);
      }
    } catch (err) {
      setError(t('errors.generic'));
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
              {t('auth.otp.title')}
            </Text>
            <Text
              style={{ color: colors.mutedForeground }}
              className="text-base mb-8"
            >
              {t('auth.otp.subtitle')} {phone}
            </Text>

            {/* OTP Input */}
            <View className="flex-row justify-between mb-4">
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={{
                    backgroundColor: colors.secondary,
                    borderColor: error ? colors.destructive : colors.border,
                    borderWidth: 1,
                    color: colors.foreground,
                  }}
                  className="w-12 h-14 rounded-xl text-center text-2xl font-bold"
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value.slice(-1), index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  autoFocus={index === 0}
                />
              ))}
            </View>

            {error ? (
              <Text className="text-destructive text-sm text-center">{error}</Text>
            ) : null}

            {/* Resend */}
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendTimer > 0}
              className="py-4 items-center"
            >
              <Text
                style={{ color: resendTimer > 0 ? colors.mutedForeground : colors.primary }}
                className="text-base"
              >
                {resendTimer > 0
                  ? t('auth.otp.resendIn', { seconds: resendTimer })
                  : t('auth.otp.resend')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Loading Overlay */}
          {isLoading && (
            <View className="absolute inset-0 items-center justify-center bg-black/20">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}

          {/* Bottom */}
          <View className="pb-8">
            <TouchableOpacity
              onPress={() => router.back()}
              className="py-4 items-center"
            >
              <Text style={{ color: colors.primary }} className="text-base">
                {t('auth.otp.changeNumber')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
