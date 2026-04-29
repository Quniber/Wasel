import { useState, useMemo } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '@/lib/api';
import AlertModal from '@/components/AlertModal';

const BASE_W = 393;

export default function ForgotPasswordResetScreen() {
  const { t, i18n } = useTranslation();
  const { email, resetToken } = useLocalSearchParams<{ email: string; resetToken: string }>();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;
  const isRTL = i18n.language === 'ar';
  const writingDirection: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);

  const rules = useMemo(
    () => ({
      length: password.length >= 8,
      number: /\d/.test(password),
      mixedCase: /[a-z]/.test(password) && /[A-Z]/.test(password),
    }),
    [password]
  );

  const allRulesPassed = rules.length && rules.number && rules.mixedCase;
  const passwordsMatch = password.length > 0 && password === confirm;
  const isValid = allRulesPassed && passwordsMatch;

  const handleReset = async () => {
    if (!isValid || !email || !resetToken) return;
    setIsLoading(true);
    setError('');
    try {
      await authApi.forgotPasswordReset(email, resetToken, password);
      setSuccessVisible(true);
    } catch (err: any) {
      setError(err.response?.data?.message || t('errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  const goToLogin = () => {
    setSuccessVisible(false);
    router.replace('/(auth)/email-login');
  };

  // Reusable rule row — green dot when satisfied, gray when not
  const Rule = ({ ok, label }: { ok: boolean; label: string }) => (
    <View
      style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 8 * s,
      }}
    >
      <View
        style={{
          width: 6 * s,
          height: 6 * s,
          borderRadius: 3 * s,
          backgroundColor: ok ? '#33BF73' : '#C7CDD8',
        }}
      />
      <Text
        style={{
          color: ok ? '#33BF73' : '#6B7380',
          fontSize: 12 * s,
          fontWeight: '500',
          textAlign,
          writingDirection,
        }}
      >
        {label}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24 * s, paddingBottom: 24 * s }}
          keyboardShouldPersistTaps="handled"
        >
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

          {/* Green badge */}
          <View
            style={{
              marginTop: 24 * s,
              width: 72 * s,
              height: 72 * s,
              borderRadius: 36 * s,
              backgroundColor: '#33BF73',
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: isRTL ? 'flex-end' : 'flex-start',
            }}
          >
            <Ionicons name="lock-closed" size={32 * s} color="#FFFFFF" />
          </View>

          <View style={{ marginTop: 16 * s, gap: 12 * s }}>
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
              {t('auth.forgot.resetTitle', 'Set a new password')}
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
                'auth.forgot.resetSubtitle',
                "Choose a strong password you haven't used before. At least 8 characters."
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

          {/* New password */}
          <View
            style={{
              marginTop: 16 * s,
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
              placeholder={t('auth.forgot.newPassword', 'New password')}
              placeholderTextColor="#6B7380"
              secureTextEntry={!showPwd}
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
            <TouchableOpacity activeOpacity={0.7} onPress={() => setShowPwd(!showPwd)} hitSlop={8}>
              <Ionicons
                name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                size={20 * s}
                color="#6B7380"
              />
            </TouchableOpacity>
          </View>

          {/* Confirm password */}
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
              borderColor: !confirm || passwordsMatch ? '#E5EBF2' : '#DC2626',
              backgroundColor: '#F5F7FC',
            }}
          >
            <Ionicons name="lock-closed-outline" size={20 * s} color="#6B7380" />
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder={t('auth.email.confirmPassword', 'Confirm password')}
              placeholderTextColor="#6B7380"
              secureTextEntry={!showPwd}
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
            <TouchableOpacity activeOpacity={0.7} onPress={() => setShowPwd(!showPwd)} hitSlop={8}>
              <Ionicons
                name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                size={20 * s}
                color="#6B7380"
              />
            </TouchableOpacity>
          </View>

          {/* Rules */}
          <View style={{ marginTop: 14 * s, gap: 6 * s }}>
            <Rule ok={rules.length} label={t('auth.forgot.rule1', 'At least 8 characters')} />
            <Rule ok={rules.number} label={t('auth.forgot.rule2', 'Includes a number')} />
            <Rule
              ok={rules.mixedCase}
              label={t('auth.forgot.rule3', 'Includes upper and lower case')}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            disabled={!isValid || isLoading}
            onPress={handleReset}
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
                {t('auth.forgot.resetBtn', 'Reset password')}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success modal — Modal_Reseted from Figma */}
      <AlertModal
        visible={successVisible}
        variant="success"
        title={t('auth.forgot.successTitle', 'Password reset!')}
        message={t(
          'auth.forgot.successMsg',
          'Your password has been changed successfully. Sign in with your new password to continue.'
        )}
        primaryLabel={t('auth.email.signIn', 'Sign in')}
        onPrimaryPress={goToLogin}
        onRequestClose={goToLogin}
      />
    </SafeAreaView>
  );
}
