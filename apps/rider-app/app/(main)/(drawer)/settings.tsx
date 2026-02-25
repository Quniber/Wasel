import { View, Text, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useThemeStore, ThemeMode } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import { changeLanguage } from '@/i18n';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { resolvedTheme, mode, setMode } = useThemeStore();
  const { logout } = useAuthStore();
  const isDark = resolvedTheme === 'dark';

  const handleLogout = () => {
    Alert.alert(
      t('settings.logout'),
      t('settings.logoutConfirm'),
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

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'light', label: t('settings.light') },
    { value: 'dark', label: t('settings.dark') },
    { value: 'system', label: t('settings.system') },
  ];

  const languages = [
    { code: 'en', label: t('settings.english') },
    { code: 'ar', label: t('settings.arabic') },
  ];

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4">
        <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} className="w-10 h-10 items-center justify-center">
          <Ionicons name="menu" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
        </TouchableOpacity>
        <Text className={`flex-1 text-xl font-semibold text-center mr-10 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
          {t('settings.title')}
        </Text>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Appearance Section */}
        <Text className="text-muted-foreground text-sm font-semibold mb-2 mt-4">
          {t('settings.appearance')}
        </Text>
        <View className={`rounded-xl overflow-hidden ${isDark ? 'bg-card-dark' : 'bg-card'}`}>
          <View className={`px-4 py-3 border-b ${isDark ? 'border-border-dark' : 'border-border'}`}>
            <Text className={`font-medium mb-2 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {t('settings.theme')}
            </Text>
            <View className="flex-row gap-2">
              {themeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setMode(option.value)}
                  className={`flex-1 py-2 rounded-lg items-center ${
                    mode === option.value ? 'bg-primary' : isDark ? 'bg-muted-dark' : 'bg-muted'
                  }`}
                >
                  <Text className={mode === option.value ? 'text-white font-medium' : 'text-muted-foreground'}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Language Section */}
        <Text className="text-muted-foreground text-sm font-semibold mb-2 mt-6">
          {t('settings.language')}
        </Text>
        <View className={`rounded-xl overflow-hidden ${isDark ? 'bg-card-dark' : 'bg-card'}`}>
          {languages.map((lang, index) => (
            <TouchableOpacity
              key={lang.code}
              onPress={() => changeLanguage(lang.code as 'en' | 'ar')}
              className={`flex-row items-center justify-between px-4 py-4 ${
                index > 0 ? `border-t ${isDark ? 'border-border-dark' : 'border-border'}` : ''
              }`}
            >
              <Text className={`${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {lang.label}
              </Text>
              {i18n.language === lang.code && (
                <Ionicons name="checkmark" size={24} color="#4CAF50" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Account Section */}
        <Text className="text-muted-foreground text-sm font-semibold mb-2 mt-6">
          {t('settings.account')}
        </Text>
        <View className={`rounded-xl overflow-hidden ${isDark ? 'bg-card-dark' : 'bg-card'}`}>
          <TouchableOpacity className={`flex-row items-center justify-between px-4 py-4 border-b ${isDark ? 'border-border-dark' : 'border-border'}`}>
            <Text className={`${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {t('settings.changePassword')}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={isDark ? '#757575' : '#9E9E9E'} />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center justify-between px-4 py-4">
            <Text className="text-destructive">{t('settings.deleteAccount')}</Text>
            <Ionicons name="chevron-forward" size={20} color={isDark ? '#757575' : '#9E9E9E'} />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <Text className="text-muted-foreground text-sm font-semibold mb-2 mt-6">
          {t('settings.about')}
        </Text>
        <View className={`rounded-xl overflow-hidden mb-6 ${isDark ? 'bg-card-dark' : 'bg-card'}`}>
          <View className={`flex-row items-center justify-between px-4 py-4 border-b ${isDark ? 'border-border-dark' : 'border-border'}`}>
            <Text className={`${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {t('settings.version')}
            </Text>
            <Text className="text-muted-foreground">1.0.0</Text>
          </View>
          <TouchableOpacity className={`flex-row items-center justify-between px-4 py-4 border-b ${isDark ? 'border-border-dark' : 'border-border'}`}>
            <Text className={`${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {t('settings.terms')}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={isDark ? '#757575' : '#9E9E9E'} />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center justify-between px-4 py-4">
            <Text className={`${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {t('settings.privacy')}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={isDark ? '#757575' : '#9E9E9E'} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-destructive/10 py-4 rounded-xl items-center mb-8"
        >
          <Text className="text-destructive font-semibold">{t('settings.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
