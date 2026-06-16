import { useState } from 'react';
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
import Svg, { Path, Rect } from 'react-native-svg';
import { authApi } from '@/lib/api';

const BASE_W = 393;

function QatarFlag({ width = 24, height = 16 }: { width?: number; height?: number }) {
  // Simplified Qatar flag — maroon body with serrated white left edge
  const w = width;
  const h = height;
  const teeth = 9;
  const teethW = w * 0.18;
  const path: string[] = ['M0 0', `L${teethW} 0`];
  for (let i = 0; i < teeth; i++) {
    const y1 = (h / teeth) * i;
    const y2 = (h / teeth) * (i + 1);
    path.push(`L${teethW * 1.7} ${y1 + h / teeth / 2}`);
    path.push(`L${teethW} ${y2}`);
  }
  path.push(`L0 ${h}`, 'Z');
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Rect x={0} y={0} width={w} height={h} fill="#FFFFFF" />
      <Path d={`M${teethW} 0 L${w} 0 L${w} ${h} L${teethW} ${h} Z`} fill="#8D1B3D" />
      <Path d={path.join(' ')} fill="#8D1B3D" />
    </Svg>
  );
}

export default function PhoneScreen() {
  const { t, i18n } = useTranslation();
  const { intent } = useLocalSearchParams<{ intent?: 'signup' | 'signin' }>();
  const isSignup = intent === 'signup';
  const { width } = useWindowDimensions();
  const s = width / BASE_W;

  const isRTL = i18n.language === 'ar';
  const writingDirection: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const countryCode = '+974';

  const handleContinue = async () => {
    if (phoneNumber.length < 8) return;

    setIsLoading(true);
    setError('');
    const fullPhone = countryCode + phoneNumber.replace(/\s/g, '').replace(/^0+/, '');

    try {
      await authApi.loginWithPhone(fullPhone);
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: fullPhone, mode: 'login' },
      });
    } catch (err: any) {
      const status = err.response?.status;
      const message: string = err.response?.data?.message || '';
      const isNotRegistered =
        status === 404 || /not registered|not found|does not exist/i.test(message);

      if (isNotRegistered) {
        try {
          await authApi.registerWithPhone(fullPhone);
          router.push({
            pathname: '/(auth)/otp',
            params: { phone: fullPhone, mode: 'register' },
          });
        } catch (regErr: any) {
          setError(regErr.response?.data?.message || t('errors.generic'));
        }
      } else if (err.message === 'Network Error') {
        setError('Unable to connect to server. Please check your internet connection.');
      } else {
        setError(message || t('errors.generic'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = phoneNumber.replace(/\s/g, '').length >= 8;

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

          {/* Title + subtitle */}
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
              {t('auth.phone.titleLine1')}
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
              {t('auth.phone.titleLine2')}
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
              {t('auth.phone.subtitle')}
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

          {/* Phone field */}
          <View
            style={{
              marginTop: 24 * s,
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 12 * s,
              height: 64 * s,
              paddingHorizontal: 16 * s,
              borderRadius: 16 * s,
              borderWidth: 1.8,
              borderColor: '#101969',
              backgroundColor: '#FFFFFF',
            }}
          >
            <QatarFlag width={24 * s} height={16 * s} />
            <Text
              style={{
                color: '#111111',
                fontSize: 17 * s,
                fontWeight: '600',
              }}
            >
              {countryCode}
            </Text>
            <View style={{ width: 1, height: 28 * s, backgroundColor: '#E5EBF2' }} />
            <TextInput
              value={phoneNumber}
              onChangeText={(v) => setPhoneNumber(v.replace(/[^\d\s]/g, ''))}
              placeholder={t('auth.phone.placeholder')}
              placeholderTextColor="#6B7380"
              keyboardType="phone-pad"
              autoFocus
              style={{
                flex: 1,
                fontSize: 17 * s,
                color: '#111111',
                padding: 0,
                textAlign: 'left',
              }}
            />
          </View>

          {/* Continue button */}
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={!isValid || isLoading}
            onPress={handleContinue}
            style={{
              marginTop: 20 * s,
              height: 56 * s,
              borderRadius: 14 * s,
              backgroundColor: isValid ? '#101969' : '#C7CDD8',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 17 * s, fontWeight: '600' }}>
                {t('auth.phone.continue')}
              </Text>
            )}
          </TouchableOpacity>

          {/* OR divider */}
          <View
            style={{
              marginTop: 24 * s,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12 * s,
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: '#E5EBF2' }} />
            <Text
              style={{
                color: '#6B7380',
                fontSize: 12 * s,
                fontWeight: '500',
                letterSpacing: 1.2,
              }}
            >
              OR
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#E5EBF2' }} />
          </View>

          {/* Email link — routes to register or login based on intent */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              router.replace(isSignup ? '/(auth)/email-register' : '/(auth)/email-login')
            }
            style={{
              marginTop: 20 * s,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8 * s,
            }}
          >
            <Text
              style={{
                color: '#101969',
                fontSize: 15 * s,
                fontWeight: '600',
              }}
            >
              {t('auth.phone.useEmail')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
