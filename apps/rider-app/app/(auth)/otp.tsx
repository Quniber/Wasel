import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';

export default function OTPScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { setToken, setUser } = useAuthStore();
  const isDark = resolvedTheme === 'dark';
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    const code = otp.join('');
    if (code.length === 6) {
      handleVerify(code);
    }
  }, [otp]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code: string) => {
    setIsLoading(true);
    try {
      // TODO: Call API to verify OTP
      // const response = await authApi.verifyOtp({ mobileNumber: phone, otp: code });
      // await setToken(response.data.token);
      // setUser(response.data.user);

      // For now, simulate success
      await setToken('demo-token');
      setUser({
        id: '1',
        firstName: 'Demo',
        lastName: 'User',
        email: 'demo@example.com',
        mobileNumber: phone || '',
        walletBalance: 0,
      });

      router.replace('/(main)');
    } catch (error) {
      console.error(error);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setCountdown(60);
    // TODO: Call API to resend OTP
    // await authApi.loginWithPhone({ mobileNumber: phone });
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
              {t('auth.otp.title')}
            </Text>
            <Text className={`text-base mt-2 ${isDark ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
              {t('auth.otp.subtitle')} {phone}
            </Text>
          </View>

          {/* OTP Input */}
          <View className="flex-row justify-between mt-8 gap-2">
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                className={`w-12 h-14 text-center text-2xl font-bold rounded-xl ${
                  isDark
                    ? 'bg-muted-dark text-foreground-dark border-border-dark'
                    : 'bg-muted text-foreground border-border'
                } ${digit ? 'border-2 border-primary' : 'border border-transparent'}`}
                value={digit}
                onChangeText={(value) => handleOtpChange(value.slice(-1), index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                autoFocus={index === 0}
              />
            ))}
          </View>

          {/* Resend */}
          <View className="mt-6 items-center">
            {countdown > 0 ? (
              <Text className={`text-base ${isDark ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                {t('auth.otp.resendIn', { seconds: countdown })}
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text className="text-primary text-base font-medium">
                  {t('auth.otp.resend')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Change Number */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4 items-center"
          >
            <Text className="text-primary text-base font-medium">
              {t('auth.otp.changeNumber')}
            </Text>
          </TouchableOpacity>

          {/* Loading indicator */}
          {isLoading && (
            <View className="mt-8 items-center">
              <Text className={`text-base ${isDark ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                {t('common.loading')}
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
