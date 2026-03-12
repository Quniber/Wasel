import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeStore } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import { getColors } from '@/constants/Colors';
import { authApi } from '@/lib/api';

export default function ProfileSetupScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { setSession } = useAuthStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);
  const { phone, otp } = useLocalSearchParams<{ phone: string; otp: string }>();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status === 'denied') {
        Alert.alert(
          t('common.error'),
          'Please allow photo access in Settings to add a profile photo.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Image picker error:', err);
      Alert.alert(t('common.error'), 'Unable to open photo library. Please try again.');
    }
  };

  const handleComplete = async () => {
    if (!firstName || !lastName) return;

    setIsLoading(true);
    setError('');

    try {
      // Complete registration with OTP and profile info
      const response = await authApi.verifyOtpAndRegister({
        mobileNumber: phone || '',
        otp: otp || '',
        firstName,
        lastName,
        email: email || undefined,
      });

      // Save session with tokens (for persistence)
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
      console.error(err);
      setError(err.response?.data?.message || t('errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = `px-4 py-4 rounded-xl text-base ${
    isDark ? 'bg-muted-dark text-foreground-dark' : 'bg-muted text-foreground'
  }`;

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      <View className="flex-1 px-6">
        {/* Title */}
        <View className="mt-8">
          <Text className={`text-2xl font-bold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
            {t('auth.profile.setupTitle')}
          </Text>
          <Text className={`text-base mt-2 ${isDark ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
            {t('auth.profile.setupSubtitle')}
          </Text>
        </View>

        {/* Avatar */}
        <TouchableOpacity className="self-center mt-8" onPress={pickImage}>
          <View className="w-28 h-28 rounded-full bg-muted dark:bg-muted-dark items-center justify-center overflow-hidden">
            {profileImage ? (
              <Image source={{ uri: profileImage }} className="w-28 h-28" />
            ) : (
              <Ionicons
                name="camera"
                size={40}
                color={isDark ? '#757575' : '#9E9E9E'}
              />
            )}
          </View>
          <Text className="text-primary text-center mt-2 font-medium">
            {t('auth.profile.addPhoto')}
          </Text>
        </TouchableOpacity>

        {/* Form */}
        <View className="mt-8 gap-4">
          <View>
            <Text className={`mb-2 font-medium ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {t('auth.email.firstName')}
            </Text>
            <TextInput
              className={inputStyle}
              placeholder={t('auth.email.firstName')}
              placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>

          <View>
            <Text className={`mb-2 font-medium ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {t('auth.email.lastName')}
            </Text>
            <TextInput
              className={inputStyle}
              placeholder={t('auth.email.lastName')}
              placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
              value={lastName}
              onChangeText={setLastName}
            />
          </View>

        </View>

        {/* Buttons */}
        <View className="flex-1 justify-end pb-8">
          <TouchableOpacity
            onPress={handleComplete}
            disabled={!firstName || !lastName || isLoading}
            className={`py-4 rounded-xl items-center ${
              firstName && lastName ? 'bg-primary' : 'bg-muted dark:bg-muted-dark'
            }`}
          >
            <Text
              className={`text-lg font-semibold ${
                firstName && lastName ? 'text-white' : 'text-muted-foreground'
              }`}
            >
              {isLoading ? t('common.loading') : t('common.done')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(main)')}
            className="mt-4 items-center"
          >
            <Text className="text-muted-foreground text-base">
              {t('common.skip')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
