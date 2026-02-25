import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeStore } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import { getColors } from '@/constants/Colors';
import { driverApi } from '@/lib/api';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { user, updateUser } = useAuthStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');

  const handleSave = async () => {
    if (!firstName || !lastName) {
      Alert.alert(t('errors.validationError'), t('errors.fillAllFields'));
      return;
    }

    setIsSaving(true);
    try {
      const response = await driverApi.updateProfile({
        firstName,
        lastName,
        email: email || undefined,
      });
      updateUser({
        ...user!,
        firstName,
        lastName,
        email,
      });
      setIsEditing(false);
      Alert.alert(t('profile.updated'), t('profile.updatedMessage'));
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert(t('errors.updateFailed'), t('errors.tryAgain'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('errors.permissionRequired'), t('errors.photoPermission'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // Upload photo
      // await driverApi.uploadPhoto(result.assets[0]);
    }
  };

  const cancelEdit = () => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setEmail(user?.email || '');
    setIsEditing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => (isEditing ? cancelEdit() : router.back())}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.secondary }}
          >
            <Ionicons name={isEditing ? 'close' : 'arrow-back'} size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={{ color: colors.foreground }} className="text-xl font-bold ml-4">
            {t('profile.title')}
          </Text>
        </View>
        {!isEditing && (
          <TouchableOpacity
            onPress={() => setIsEditing(true)}
            className="px-4 py-2 rounded-lg"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white font-medium">{t('common.edit')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Avatar */}
        <View className="items-center mb-8">
          <TouchableOpacity onPress={isEditing ? handlePickImage : undefined}>
            <View
              className="w-28 h-28 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.secondary }}
            >
              {user?.avatar ? (
                <View className="w-28 h-28 rounded-full overflow-hidden">
                  {/* Image would go here */}
                  <Ionicons name="person" size={48} color={colors.mutedForeground} />
                </View>
              ) : (
                <Ionicons name="person" size={48} color={colors.mutedForeground} />
              )}
              {isEditing && (
                <View
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              )}
            </View>
          </TouchableOpacity>

          {!isEditing && (
            <>
              <Text style={{ color: colors.foreground }} className="text-xl font-bold mt-4">
                {user?.firstName} {user?.lastName}
              </Text>
              <View className="flex-row items-center mt-2">
                <Ionicons name="star" size={16} color="#f59e0b" />
                <Text style={{ color: colors.mutedForeground }} className="ml-1">
                  {Number(user?.rating || 5).toFixed(1)} {t('profile.rating')}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Stats */}
        {!isEditing && (
          <View
            className="flex-row justify-around p-4 rounded-xl mb-6"
            style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
          >
            <View className="items-center">
              <Text style={{ color: colors.foreground }} className="text-2xl font-bold">
                {user?.totalTrips || 0}
              </Text>
              <Text style={{ color: colors.mutedForeground }} className="text-sm">
                {t('profile.totalTrips')}
              </Text>
            </View>
            <View className="items-center">
              <Text style={{ color: colors.foreground }} className="text-2xl font-bold">
                {((user?.acceptanceRate || 95)).toFixed(0)}%
              </Text>
              <Text style={{ color: colors.mutedForeground }} className="text-sm">
                {t('profile.acceptanceRate')}
              </Text>
            </View>
            <View className="items-center">
              <Text style={{ color: colors.foreground }} className="text-2xl font-bold">
                {user?.yearsActive || 0}
              </Text>
              <Text style={{ color: colors.mutedForeground }} className="text-sm">
                {t('profile.years')}
              </Text>
            </View>
          </View>
        )}

        {/* Form Fields */}
        <View className="mb-4">
          <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
            {t('profile.firstName')}
          </Text>
          <TextInput
            style={{
              backgroundColor: isEditing ? colors.secondary : colors.muted,
              borderColor: colors.border,
              borderWidth: 1,
              color: colors.foreground,
            }}
            className="px-4 py-3 rounded-xl text-base"
            value={firstName}
            onChangeText={setFirstName}
            editable={isEditing}
          />
        </View>

        <View className="mb-4">
          <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
            {t('profile.lastName')}
          </Text>
          <TextInput
            style={{
              backgroundColor: isEditing ? colors.secondary : colors.muted,
              borderColor: colors.border,
              borderWidth: 1,
              color: colors.foreground,
            }}
            className="px-4 py-3 rounded-xl text-base"
            value={lastName}
            onChangeText={setLastName}
            editable={isEditing}
          />
        </View>

        <View className="mb-4">
          <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
            {t('profile.email')}
          </Text>
          <TextInput
            style={{
              backgroundColor: isEditing ? colors.secondary : colors.muted,
              borderColor: colors.border,
              borderWidth: 1,
              color: colors.foreground,
            }}
            className="px-4 py-3 rounded-xl text-base"
            value={email}
            onChangeText={setEmail}
            editable={isEditing}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View className="mb-4">
          <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
            {t('profile.phone')}
          </Text>
          <TextInput
            style={{
              backgroundColor: colors.muted,
              borderColor: colors.border,
              borderWidth: 1,
              color: colors.mutedForeground,
            }}
            className="px-4 py-3 rounded-xl text-base"
            value={user?.mobileNumber || ''}
            editable={false}
          />
          <Text style={{ color: colors.mutedForeground }} className="text-xs mt-1">
            {t('profile.phoneNote')}
          </Text>
        </View>

        {/* Save Button */}
        {isEditing && (
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            className="py-4 rounded-xl items-center mt-4"
            style={{ backgroundColor: colors.primary }}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-lg font-semibold">{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
