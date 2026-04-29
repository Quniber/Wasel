import { useState } from 'react';
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
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '@/lib/api';

const BASE_W = 393;

export default function ForgotPasswordEmailScreen() {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;
  const isRTL = i18n.language === 'ar';
  const writingDirection: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = /\S+@\S+\.\S+/.test(email);

  const handleSend = async () => {
    if (!isValid) return;
    setIsLoading(true);
    setError('');
    try {
      await authApi.forgotPasswordSend(email);
      router.push({
        pathname: '/(auth)/forgot-password-otp',
        params: { email },
      });
    } catch (err: any) {
      setError(err.response?.data?.message || t('errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

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

          {/* Key icon badge */}
          <View
            style={{
              marginTop: 24 * s,
              width: 72 * s,
              height: 72 * s,
              borderRadius: 36 * s,
              backgroundColor: '#E0F0FF',
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: isRTL ? 'flex-end' : 'flex-start',
            }}
          >
            <Ionicons name="key" size={32 * s} color="#0366FB" />
          </View>

          <View style={{ marginTop: 16 * s, gap: 8 * s }}>
            <Text
              style={{
                color: '#111111',
                fontSize: 28 * s,
                fontWeight: '700',
                letterSpacing: -0.6,
                lineHeight: 34 * s,
                textAlign,
                writingDirection,
              }}
            >
              {t('auth.forgot.title', 'Forgot password?')}
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
              {t(
                'auth.forgot.subtitle',
                "Enter your email and we'll send you a 6-digit code to reset your password."
              )}
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

          {/* Email field */}
          <View
            style={{
              marginTop: 24 * s,
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 12 * s,
              height: 60 * s,
              paddingHorizontal: 16 * s,
              borderRadius: 14 * s,
              borderWidth: 1,
              borderColor: '#E5EBF2',
              backgroundColor: '#F5F7FC',
            }}
          >
            <Ionicons name="mail-outline" size={20 * s} color="#6B7380" />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.email.emailPlaceholder', 'Email address')}
              placeholderTextColor="#6B7380"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              style={{
                flex: 1,
                fontSize: 16 * s,
                fontWeight: '600',
                color: '#111111',
                padding: 0,
                textAlign,
              }}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            disabled={!isValid || isLoading}
            onPress={handleSend}
            style={{
              marginTop: 24 * s,
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
                {t('auth.forgot.sendCode', 'Send code')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
