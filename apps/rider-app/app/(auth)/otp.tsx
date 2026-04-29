import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api';

const BASE_W = 393;

const formatPhoneDisplay = (phone: string | undefined) => {
  if (!phone) return '';
  // Qatar country code is always +974 (3 digits after +).
  // +97471327489 → +974 7132 7489
  const cc = phone.slice(0, 4);
  const rest = phone.slice(4);
  const grouped = rest.replace(/(\d{4})(\d+)/, '$1 $2');
  return `${cc} ${grouped}`;
};

const formatCountdown = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
};

export default function OTPScreen() {
  const { t, i18n } = useTranslation();
  const { setSession } = useAuthStore();
  const { phone, mode } = useLocalSearchParams<{ phone: string; mode: string }>();
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

  const handleOtpChange = (value: string, index: number) => {
    const digits = value.replace(/[^0-9]/g, '');

    if (digits.length > 1) {
      // Paste / autofill — distribute across boxes
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
      if (mode === 'register') {
        // Pre-verify OTP so wrong codes are caught here, not at profile submit.
        const checkResp = await authApi.checkOtp({
          mobileNumber: phone || '',
          otp: code,
        });
        router.push({
          pathname: '/(auth)/profile-setup',
          params: { phone, registrationToken: checkResp.data.registrationToken },
        });
        return;
      }

      const response = await authApi.verifyOtpLogin({
        mobileNumber: phone || '',
        otp: code,
      });

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
      setError(err.response?.data?.message || t('errors.invalidOtp'));
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setActiveIndex(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setCountdown(60);
    setError('');
    try {
      await authApi.resendOtp(phone || '');
    } catch (err: any) {
      setError(err.response?.data?.message || t('errors.generic'));
    }
  };

  const boxW = 48 * s;
  const boxH = 60 * s;
  const totalBoxes = 6;
  const containerW = (345 - 0) * s;
  const gap = (containerW - totalBoxes * boxW) / (totalBoxes - 1);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, paddingHorizontal: 24 * s }}>
          {/* Back button */}
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

          {/* Title */}
          <View style={{ marginTop: 32 * s }}>
            <Text
              style={{
                color: '#111111',
                fontSize: 32 * s,
                fontWeight: '700',
                letterSpacing: -0.8,
                lineHeight: 38 * s,
                textAlign,
                writingDirection,
              }}
            >
              {t('auth.otp.titleLine1')}
            </Text>
            <Text
              style={{
                color: '#111111',
                fontSize: 32 * s,
                fontWeight: '700',
                letterSpacing: -0.8,
                lineHeight: 38 * s,
                textAlign,
                writingDirection,
              }}
            >
              {t('auth.otp.titleLine2')}
            </Text>

            <Text
              style={{
                marginTop: 12 * s,
                color: '#6B7380',
                fontSize: 16 * s,
                lineHeight: 24 * s,
                textAlign,
                writingDirection,
              }}
            >
              {t('auth.otp.subtitle')}
            </Text>
            <Text
              style={{
                marginTop: 4 * s,
                color: '#111111',
                fontSize: 16 * s,
                fontWeight: '600',
                textAlign,
                writingDirection,
              }}
            >
              {formatPhoneDisplay(phone)}
            </Text>
          </View>

          {/* Error */}
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
              marginTop: 36 * s,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: boxH,
            }}
          >
            {otp.map((digit, i) => {
              const filled = digit !== '';
              const isActive = activeIndex === i && !filled;
              return (
                <View
                  key={i}
                  style={{
                    width: boxW,
                    height: boxH,
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
                    onChangeText={(v) => handleOtpChange(v, i)}
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
          <View style={{ marginTop: 32 * s, alignItems: 'center' }}>
            {countdown > 0 ? (
              <Text
                style={{
                  color: '#6B7380',
                  fontSize: 15 * s,
                  fontWeight: '600',
                }}
              >
                {t('auth.otp.resendIn', { time: formatCountdown(countdown) })}
              </Text>
            ) : (
              <TouchableOpacity activeOpacity={0.8} onPress={handleResend}>
                <Text style={{ color: '#101969', fontSize: 15 * s, fontWeight: '600' }}>
                  {t('auth.otp.resend')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Change number */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.back()}
            style={{ marginTop: 12 * s, alignItems: 'center', paddingVertical: 8 * s }}
          >
            <Text style={{ color: '#101969', fontSize: 15 * s, fontWeight: '600' }}>
              {t('auth.otp.changeNumber')}
            </Text>
          </TouchableOpacity>

          {isLoading && (
            <View style={{ marginTop: 24 * s, alignItems: 'center' }}>
              <ActivityIndicator color="#101969" />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
