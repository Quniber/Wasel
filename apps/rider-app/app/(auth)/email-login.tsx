import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api';

const BASE_W = 393;

export default function EmailLoginScreen() {
  const { t, i18n } = useTranslation();
  const { setSession } = useAuthStore();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;

  const isRTL = i18n.language === 'ar';
  const writingDirection: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

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
      setError(err.response?.data?.message || t('errors.invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = !!email && !!password;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 24 * s,
            paddingBottom: 24 * s,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
        >
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
              {t('auth.email.loginTitle')}
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
              {t('auth.email.loginSubtitle')}
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

          {/* Email field */}
          <View
            style={{
              marginTop: 28 * s,
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
              placeholder={t('auth.email.emailPlaceholder')}
              placeholderTextColor="#6B7380"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
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

          {/* Password field */}
          <View
            style={{
              marginTop: 12 * s,
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
            <Ionicons name="lock-closed-outline" size={20 * s} color="#6B7380" />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.email.passwordPlaceholder')}
              placeholderTextColor="#6B7380"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                flex: 1,
                fontSize: 16 * s,
                fontWeight: '600',
                color: '#111111',
                padding: 0,
                textAlign,
              }}
            />
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={8}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20 * s}
                color="#6B7380"
              />
            </TouchableOpacity>
          </View>

          {/* Forgot password (right-aligned in LTR, left in RTL) */}
          <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', marginTop: 12 * s }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text
                style={{
                  color: '#101969',
                  fontSize: 14 * s,
                  fontWeight: '600',
                }}
              >
                {t('auth.email.forgotPassword')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign in button */}
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={!isValid || isLoading}
            onPress={handleLogin}
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
                {t('auth.email.login')}
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

          {/* Use phone instead */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.replace('/(auth)/phone')}
            style={{
              marginTop: 20 * s,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8 * s,
            }}
          >
            <Text style={{ color: '#101969', fontSize: 15 * s, fontWeight: '600' }}>
              {t('auth.email.usePhone')}
            </Text>
          </TouchableOpacity>

          {/* Spacer pushes register link to bottom */}
          <View style={{ flex: 1 }} />

          {/* Register link */}
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6 * s,
              marginTop: 24 * s,
            }}
          >
            <Text style={{ color: '#6B7380', fontSize: 15 * s }}>
              {t('auth.email.noAccount')}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(auth)/email-register')}
            >
              <Text style={{ color: '#101969', fontSize: 15 * s, fontWeight: '600' }}>
                {t('auth.email.signUp')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
