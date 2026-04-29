import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '@/lib/api';

const BASE_W = 393;

const formatCountdown = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
};

export default function ForgotPasswordOtpScreen() {
  const { t, i18n } = useTranslation();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;
  const isRTL = i18n.language === 'ar';
  const writingDirection: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    const code = otp.join('');
    if (code.length === 6) handleVerify(code);
  }, [otp]);

  const handleChange = (value: string, index: number) => {
    const digits = value.replace(/[^0-9]/g, '');
    if (digits.length > 1) {
      const next = [...otp];
      const chars = digits.slice(0, 6).split('');
      chars.forEach((c, i) => {
        if (index + i < 6) next[index + i] = c;
      });
      setOtp(next);
      const focusIdx = Math.min(index + chars.length, 5);
      inputRefs.current[focusIdx]?.focus();
      setActiveIndex(focusIdx);
      return;
    }
    const next = [...otp];
    next[index] = digits;
    setOtp(next);
    if (digits && index < 5) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setActiveIndex(index - 1);
    }
  };

  const handleVerify = async (code: string) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await authApi.forgotPasswordVerify(email || '', code);
      router.push({
        pathname: '/(auth)/forgot-password-reset',
        params: { email, resetToken: res.data.resetToken },
      });
    } catch (err: any) {
      setError(err.response?.data?.message || t('errors.invalidOtp', 'Invalid code'));
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setActiveIndex(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError('');
    setCountdown(60);
    try {
      await authApi.forgotPasswordSend(email || '');
    } catch {}
  };

  const handleChangeEmail = () => router.back();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, paddingHorizontal: 24 * s }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.back()}
            style={{
              width: 40 * s,
              height: 40 * s,
              borderRadius: 12 * s,
              backgroundColor: '#F5F7FC',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 10 * s,
              alignSelf: isRTL ? 'flex-end' : 'flex-start',
            }}
          >
            <Ionicons
              name={isRTL ? 'chevron-forward' : 'chevron-back'}
              size={20 * s}
              color="#111111"
            />
          </TouchableOpacity>

          <View style={{ marginTop: 24 * s, gap: 12 * s }}>
            <Text
              style={{
                color: '#111111',
                fontSize: 26 * s,
                fontWeight: '700',
                letterSpacing: -0.6,
                lineHeight: 32 * s,
                textAlign,
                writingDirection,
              }}
            >
              {t('auth.forgot.checkTitle', 'Check your email')}
            </Text>
            <Text
              style={{
                color: '#6B7380',
                fontSize: 15 * s,
                lineHeight: 22 * s,
                textAlign,
                writingDirection,
              }}
            >
              {t('auth.forgot.checkSubtitle', 'We sent a 6-digit code to')} {email}
            </Text>
          </View>

          {!!error && (
            <View
              style={{
                marginTop: 16 * s,
                padding: 12 * s,
                borderRadius: 12 * s,
                backgroundColor: '#FEE2E2',
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
              }}
            >
              <Ionicons name="alert-circle" size={18 * s} color="#DC2626" />
              <Text
                style={{
                  color: '#DC2626',
                  fontSize: 13 * s,
                  marginLeft: isRTL ? 0 : 8 * s,
                  marginRight: isRTL ? 8 * s : 0,
                  flex: 1,
                  textAlign,
                  writingDirection,
                }}
              >
                {error}
              </Text>
            </View>
          )}

          {/* OTP boxes */}
          <View
            style={{
              marginTop: 24 * s,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: 60 * s,
            }}
          >
            {otp.map((digit, i) => {
              const filled = digit !== '';
              const isActive = activeIndex === i && !filled;
              return (
                <View
                  key={i}
                  style={{
                    width: 48 * s,
                    height: 60 * s,
                    borderRadius: 14 * s,
                    backgroundColor: filled || isActive ? '#FFFFFF' : '#F5F7FC',
                    borderWidth: filled || isActive ? 1.8 : 1,
                    borderColor: filled || isActive ? '#101969' : '#E5EBF2',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <TextInput
                    ref={(ref) => {
                      inputRefs.current[i] = ref;
                    }}
                    value={digit}
                    onChangeText={(v) => handleChange(v, i)}
                    onKeyPress={(e) => handleKeyPress(e, i)}
                    onFocus={() => setActiveIndex(i)}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoFocus={i === 0}
                    maxLength={6}
                    selectionColor="#101969"
                    style={{
                      width: '100%',
                      height: '100%',
                      textAlign: 'center',
                      fontSize: 28 * s,
                      fontWeight: '700',
                      color: '#111111',
                      padding: 0,
                    }}
                  />
                </View>
              );
            })}
          </View>

          {/* Resend */}
          <View style={{ marginTop: 24 * s, alignItems: 'center' }}>
            {countdown > 0 ? (
              <Text style={{ color: '#6B7380', fontSize: 14 * s }}>
                {t('auth.otp.resendIn', 'Resend code in {{time}}', {
                  time: formatCountdown(countdown),
                })}
              </Text>
            ) : (
              <TouchableOpacity activeOpacity={0.7} onPress={handleResend}>
                <Text style={{ color: '#101969', fontSize: 15 * s, fontWeight: '600' }}>
                  {t('auth.otp.resend', 'Resend code')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Change email */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleChangeEmail}
            style={{ marginTop: 12 * s, alignItems: 'center', paddingVertical: 6 * s }}
          >
            <Text style={{ color: '#101969', fontSize: 15 * s, fontWeight: '600' }}>
              {t('auth.forgot.useDifferentEmail', 'Use a different email')}
            </Text>
          </TouchableOpacity>

          {isLoading && (
            <View style={{ marginTop: 16 * s, alignItems: 'center' }}>
              <ActivityIndicator color="#101969" />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
