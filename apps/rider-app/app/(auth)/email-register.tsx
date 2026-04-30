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
  Image,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Rect } from 'react-native-svg';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api';

const BASE_W = 393;

function QatarFlag({ width = 24, height = 16 }: { width?: number; height?: number }) {
  const teeth = 9;
  const teethW = width * 0.18;
  const path: string[] = ['M0 0', `L${teethW} 0`];
  for (let i = 0; i < teeth; i++) {
    const y1 = (height / teeth) * i;
    const y2 = (height / teeth) * (i + 1);
    path.push(`L${teethW * 1.7} ${y1 + height / teeth / 2}`);
    path.push(`L${teethW} ${y2}`);
  }
  path.push(`L0 ${height}`, 'Z');
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect x={0} y={0} width={width} height={height} fill="#FFFFFF" />
      <Path d={`M${teethW} 0 L${width} 0 L${width} ${height} L${teethW} ${height} Z`} fill="#8D1B3D" />
      <Path d={path.join(' ')} fill="#8D1B3D" />
    </Svg>
  );
}

export default function EmailRegisterScreen() {
  const { t, i18n } = useTranslation();
  const { setSession } = useAuthStore();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;
  const isRTL = i18n.language === 'ar';
  const writingDirection: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordsMatch = !password || password === confirmPassword;
  const isValid =
    !!firstName &&
    !!lastName &&
    !!email &&
    phone.replace(/\D/g, '').length >= 8 &&
    !!password &&
    passwordsMatch;

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), 'Please allow photo access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) setProfileImage(result.assets[0].uri);
    } catch {}
  };

  const handleRegister = async () => {
    if (!isValid) return;
    setIsLoading(true);
    setError('');
    try {
      const fullPhone = '+974' + phone.replace(/\D/g, '').replace(/^0+/, '');
      const response = await authApi.registerWithEmail({
        firstName,
        lastName,
        email,
        mobileNumber: fullPhone,
        password,
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
      setError(err.response?.data?.message || t('errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  const fieldStyle = {
    flexDirection: (isRTL ? 'row-reverse' : 'row') as 'row' | 'row-reverse',
    alignItems: 'center' as const,
    gap: 12 * s,
    height: 60 * s,
    paddingHorizontal: 16 * s,
    borderRadius: 14 * s,
    borderWidth: 1,
    borderColor: '#E5EBF2',
    backgroundColor: '#F5F7FC',
  };
  const inputStyle = {
    flex: 1,
    fontSize: 16 * s,
    fontWeight: '600' as const,
    color: '#111111',
    padding: 0,
    textAlign,
  };

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

          <View style={{ marginTop: 24 * s }}>
            <Text
              style={{
                color: '#111111',
                fontSize: 28 * s,
                fontWeight: '700',
                letterSpacing: -0.8,
                lineHeight: 34 * s,
                textAlign,
                writingDirection,
              }}
            >
              {t('auth.email.registerTitle', 'Create account')}
            </Text>
            <Text
              style={{
                marginTop: 8 * s,
                color: '#6B7380',
                fontSize: 16 * s,
                lineHeight: 24 * s,
                textAlign,
                writingDirection,
              }}
            >
              {t('auth.email.registerSubtitle', 'Set up your profile to start riding.')}
            </Text>
          </View>

          {/* Photo */}
          <View style={{ alignItems: 'center', marginTop: 24 * s, height: 96 * s }}>
            <TouchableOpacity activeOpacity={0.8} onPress={pickImage}>
              <View
                style={{
                  width: 96 * s,
                  height: 96 * s,
                  borderRadius: 48 * s,
                  backgroundColor: '#F5F7FC',
                  borderWidth: 1,
                  borderColor: '#E5EBF2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    style={{ width: 96 * s, height: 96 * s }}
                  />
                ) : (
                  <Ionicons name="person-outline" size={40 * s} color="#6B7380" />
                )}
              </View>
              <View
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 32 * s,
                  height: 32 * s,
                  borderRadius: 16 * s,
                  backgroundColor: '#101969',
                  borderWidth: 3,
                  borderColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="camera" size={16 * s} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
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

          {/* First / last name row */}
          <View
            style={{
              marginTop: 24 * s,
              flexDirection: isRTL ? 'row-reverse' : 'row',
              gap: 12 * s,
            }}
          >
            <View style={{ ...fieldStyle, flex: 1 }}>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder={t('auth.email.firstName', 'First name')}
                placeholderTextColor="#6B7380"
                style={inputStyle}
              />
            </View>
            <View style={{ ...fieldStyle, flex: 1 }}>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder={t('auth.email.lastName', 'Last name')}
                placeholderTextColor="#6B7380"
                style={inputStyle}
              />
            </View>
          </View>

          {/* Email */}
          <View style={{ ...fieldStyle, marginTop: 12 * s }}>
            <Ionicons name="mail-outline" size={20 * s} color="#6B7380" />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.email.emailPlaceholder', 'Email address')}
              placeholderTextColor="#6B7380"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={inputStyle}
            />
          </View>

          {/* Phone (editable here) */}
          <View style={{ ...fieldStyle, marginTop: 12 * s }}>
            <QatarFlag width={24 * s} height={16 * s} />
            <Text style={{ color: '#111111', fontSize: 16 * s, fontWeight: '600' }}>+974</Text>
            <View style={{ width: 1, height: 24 * s, backgroundColor: '#E5EBF2' }} />
            <TextInput
              value={phone}
              onChangeText={(v) => setPhone(v.replace(/[^\d\s]/g, ''))}
              placeholder={t('auth.phone.placeholder', '5xxx xxxx')}
              placeholderTextColor="#6B7380"
              keyboardType="phone-pad"
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

          {/* Password */}
          <View style={{ ...fieldStyle, marginTop: 12 * s }}>
            <Ionicons name="lock-closed-outline" size={20 * s} color="#6B7380" />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.email.password', 'Password')}
              placeholderTextColor="#6B7380"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              style={inputStyle}
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

          {/* Confirm */}
          <View style={{ ...fieldStyle, marginTop: 12 * s }}>
            <Ionicons name="lock-closed-outline" size={20 * s} color="#6B7380" />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('auth.email.confirmPassword', 'Confirm password')}
              placeholderTextColor="#6B7380"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              style={inputStyle}
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

          {!passwordsMatch && (
            <Text
              style={{
                marginTop: 8 * s,
                color: '#DC2626',
                fontSize: 13 * s,
                textAlign,
                writingDirection,
              }}
            >
              {t('auth.profile.passwordsMismatch', 'Passwords do not match')}
            </Text>
          )}

          {/* Submit */}
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={!isValid || isLoading}
            onPress={handleRegister}
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
                {t('auth.email.register', 'Sign up')}
              </Text>
            )}
          </TouchableOpacity>

          {/* Terms */}
          <Text
            style={{
              marginTop: 16 * s,
              color: '#6B7380',
              fontSize: 12 * s,
              lineHeight: 18 * s,
              textAlign: 'center',
            }}
          >
            {t(
              'auth.profile.terms',
              'By creating an account, you agree to our\nTerms of Service and Privacy Policy'
            )}
          </Text>

          {/* Sign-in link */}
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6 * s,
              marginTop: 16 * s,
            }}
          >
            <Text style={{ color: '#6B7380', fontSize: 15 * s }}>
              {t('auth.email.hasAccount', 'Already have an account?')}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.replace('/(auth)/email-login')}
            >
              <Text style={{ color: '#101969', fontSize: 15 * s, fontWeight: '600' }}>
                {t('auth.email.signIn', 'Sign in')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
