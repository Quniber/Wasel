import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeStore } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { user, setUser } = useAuthStore();
  const isDark = resolvedTheme === 'dark';

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(user?.avatar || null);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert(t('common.error'), t('profile.nameRequired'));
      return;
    }

    setIsSaving(true);
    try {
      await authApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
      });

      setUser({
        ...user!,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      });

      setIsEditing(false);
      Alert.alert(t('common.success'), t('profile.updateSuccess'));
    } catch (error: any) {
      console.error('Profile update error:', error?.response?.data || error?.message || error);
      Alert.alert(t('common.error'), error?.response?.data?.message || t('profile.updateError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setEmail(user?.email || '');
    setIsEditing(false);
  };

  const handleChangePhoto = () => {
    Alert.alert(
      t('profile.changePhoto'),
      t('profile.chooseOption'),
      [
        {
          text: t('profile.takePhoto'),
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert(t('common.error'), 'Please allow camera access in Settings.');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                const uri = result.assets[0].uri;
                setProfileImage(uri);
                setUser({ ...user!, avatar: uri });
              }
            } catch (err) {
              console.error('Camera error:', err);
            }
          },
        },
        {
          text: t('profile.chooseLibrary'),
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert(t('common.error'), 'Please allow photo access in Settings.');
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                const uri = result.assets[0].uri;
                setProfileImage(uri);
                setUser({ ...user!, avatar: uri });
              }
            } catch (err) {
              console.error('Image picker error:', err);
            }
          },
        },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
        </TouchableOpacity>
        <Text className={`flex-1 text-xl font-semibold text-center ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
          {t('profile.title')}
        </Text>
        {!isEditing ? (
          <TouchableOpacity onPress={() => setIsEditing(true)} className="w-10 h-10 items-center justify-center">
            <Ionicons name="pencil" size={20} color="#4CAF50" />
          </TouchableOpacity>
        ) : (
          <View className="w-10" />
        )}
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-6">
        {/* Avatar */}
        <View className="items-center my-6">
          <TouchableOpacity onPress={handleChangePhoto} disabled={!isEditing}>
            <View className="w-28 h-28 rounded-full bg-primary items-center justify-center overflow-hidden">
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  className="w-28 h-28"
                />
              ) : user?.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  className="w-28 h-28 rounded-full"
                />
              ) : (
                <Text className="text-white text-4xl font-bold">
                  {firstName?.[0]?.toUpperCase()}{lastName?.[0]?.toUpperCase()}
                </Text>
              )}
            </View>
            {isEditing && (
              <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary items-center justify-center border-2 border-white">
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View className={`rounded-xl overflow-hidden ${isDark ? 'bg-card-dark' : 'bg-card'}`}>
          {/* First Name */}
          <View className={`px-4 py-4 border-b ${isDark ? 'border-border-dark' : 'border-border'}`}>
            <Text className="text-muted-foreground text-sm mb-1">{t('profile.firstName')}</Text>
            {isEditing ? (
              <TextInput
                className={`text-base ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}
                value={firstName}
                onChangeText={setFirstName}
                placeholder={t('profile.firstNamePlaceholder')}
                placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
              />
            ) : (
              <Text className={`text-base ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {firstName || '-'}
              </Text>
            )}
          </View>

          {/* Last Name */}
          <View className={`px-4 py-4 border-b ${isDark ? 'border-border-dark' : 'border-border'}`}>
            <Text className="text-muted-foreground text-sm mb-1">{t('profile.lastName')}</Text>
            {isEditing ? (
              <TextInput
                className={`text-base ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}
                value={lastName}
                onChangeText={setLastName}
                placeholder={t('profile.lastNamePlaceholder')}
                placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
              />
            ) : (
              <Text className={`text-base ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {lastName || '-'}
              </Text>
            )}
          </View>

          {/* Phone (Read-only) */}
          <View className={`px-4 py-4 border-b ${isDark ? 'border-border-dark' : 'border-border'}`}>
            <Text className="text-muted-foreground text-sm mb-1">{t('profile.phone')}</Text>
            <View className="flex-row items-center">
              <Text className={`text-base ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {user?.mobileNumber || '-'}
              </Text>
              <Ionicons name="lock-closed" size={14} color={isDark ? '#757575' : '#9E9E9E'} className="ml-2" />
            </View>
            <Text className="text-muted-foreground text-xs mt-1">
              {t('profile.phoneChangeNote')}
            </Text>
          </View>

          {/* Email */}
          <View className={`px-4 py-4 border-b ${isDark ? 'border-border-dark' : 'border-border'}`}>
            <Text className="text-muted-foreground text-sm mb-1">{t('profile.email')}</Text>
            {isEditing ? (
              <TextInput
                className={`text-base ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}
                value={email}
                onChangeText={setEmail}
                placeholder={t('profile.emailPlaceholder')}
                placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <Text className={`text-base ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {email || '-'}
              </Text>
            )}
          </View>

        </View>

        {/* Save/Cancel Buttons */}
        {isEditing && (
          <View className="mt-6">
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              className="bg-primary py-4 rounded-xl items-center mb-3"
            >
              <Text className="text-white text-lg font-semibold">
                {isSaving ? t('common.loading') : t('common.save')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCancel} className="py-3 items-center">
              <Text className="text-muted-foreground">{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
