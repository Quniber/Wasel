import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import { getColors } from '@/constants/Colors';
import i18n from '@/i18n';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { resolvedTheme, mode, setMode } = useThemeStore();
  const { logout } = useAuthStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  const currentLanguage = i18n.language === 'ar' ? 'Arabic' : 'English';

  const handleLanguageChange = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };

  const handleLogout = () => {
    Alert.alert(
      t('settings.logoutConfirmTitle'),
      t('settings.logoutConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logout'),
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/welcome');
          },
        },
      ]
    );
  };

  const settingsSections = [
    {
      title: t('settings.appearance'),
      items: [
        {
          icon: 'moon-outline' as const,
          label: t('settings.darkMode'),
          type: 'switch',
          value: isDark,
          onPress: () => setMode(isDark ? 'light' : 'dark'),
        },
        {
          icon: 'language-outline' as const,
          label: t('settings.language'),
          type: 'value',
          value: currentLanguage,
          onPress: handleLanguageChange,
        },
      ],
    },
    {
      title: t('settings.notifications'),
      items: [
        {
          icon: 'notifications-outline' as const,
          label: t('settings.pushNotifications'),
          type: 'switch',
          value: notifications,
          onPress: () => setNotifications(!notifications),
        },
        {
          icon: 'volume-high-outline' as const,
          label: t('settings.sound'),
          type: 'switch',
          value: soundEnabled,
          onPress: () => setSoundEnabled(!soundEnabled),
        },
        {
          icon: 'phone-portrait-outline' as const,
          label: t('settings.vibration'),
          type: 'switch',
          value: vibrationEnabled,
          onPress: () => setVibrationEnabled(!vibrationEnabled),
        },
      ],
    },
    {
      title: t('settings.account'),
      items: [
        {
          icon: 'person-outline' as const,
          label: t('settings.editProfile'),
          type: 'arrow',
          onPress: () => router.push('/(main)/profile'),
        },
        {
          icon: 'lock-closed-outline' as const,
          label: t('settings.changePassword'),
          type: 'arrow',
          onPress: () => {},
        },
        {
          icon: 'shield-checkmark-outline' as const,
          label: t('settings.privacy'),
          type: 'arrow',
          onPress: () => {},
        },
      ],
    },
    {
      title: t('settings.support'),
      items: [
        {
          icon: 'help-circle-outline' as const,
          label: t('settings.helpCenter'),
          type: 'arrow',
          onPress: () => router.push('/(main)/(drawer)/support'),
        },
        {
          icon: 'document-text-outline' as const,
          label: t('settings.termsOfService'),
          type: 'arrow',
          onPress: () => {},
        },
        {
          icon: 'information-circle-outline' as const,
          label: t('settings.about'),
          type: 'arrow',
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.secondary }}
        >
          <Ionicons name="menu" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ color: colors.foreground }} className="text-xl font-bold ml-4">
          {t('settings.title')}
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} className="mt-6">
            <Text
              style={{ color: colors.mutedForeground }}
              className="text-sm font-medium uppercase px-4 mb-2"
            >
              {section.title}
            </Text>
            <View
              className="mx-4 rounded-xl overflow-hidden"
              style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
            >
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  onPress={item.type === 'switch' ? undefined : item.onPress}
                  className="flex-row items-center justify-between px-4 py-3"
                  style={{
                    borderTopWidth: itemIndex > 0 ? 1 : 0,
                    borderTopColor: colors.border,
                  }}
                >
                  <View className="flex-row items-center">
                    <View
                      className="w-8 h-8 rounded-lg items-center justify-center mr-3"
                      style={{ backgroundColor: colors.secondary }}
                    >
                      <Ionicons name={item.icon} size={18} color={colors.foreground} />
                    </View>
                    <Text style={{ color: colors.foreground }} className="text-base">
                      {item.label}
                    </Text>
                  </View>

                  {item.type === 'switch' && 'value' in item && (
                    <Switch
                      value={item.value as boolean}
                      onValueChange={item.onPress}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={colors.background}
                    />
                  )}
                  {item.type === 'value' && 'value' in item && (
                    <View className="flex-row items-center">
                      <Text style={{ color: colors.mutedForeground }} className="mr-2">
                        {item.value as string}
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                    </View>
                  )}
                  {item.type === 'arrow' && (
                    <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <View className="mx-4 mt-8">
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center justify-center py-4 rounded-xl"
            style={{ backgroundColor: colors.destructive + '15' }}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
            <Text style={{ color: colors.destructive }} className="text-base font-semibold ml-2">
              {t('settings.logout')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={{ color: colors.mutedForeground }} className="text-center text-sm mt-6">
          {t('settings.version')} 1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
