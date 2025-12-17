import { View, Text, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { changeLanguage } from '@/i18n';

export default function WelcomeScreen() {
  const { t, i18n } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    await changeLanguage(newLang);
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      <View className="flex-1 px-6">
        {/* Language Toggle */}
        <TouchableOpacity
          onPress={toggleLanguage}
          className="self-end mt-4 px-4 py-2 rounded-full bg-muted dark:bg-muted-dark"
        >
          <Text className={`font-medium ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
            {i18n.language === 'en' ? 'العربية' : 'English'}
          </Text>
        </TouchableOpacity>

        {/* Logo and Title */}
        <View className="flex-1 items-center justify-center">
          <View className="w-32 h-32 rounded-full bg-primary items-center justify-center mb-6">
            <Ionicons name="car" size={64} color="#FFFFFF" />
          </View>
          <Text className={`text-4xl font-bold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
            {t('auth.welcome.title')}
          </Text>
          <Text className={`text-lg mt-2 ${isDark ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
            {t('auth.welcome.subtitle')}
          </Text>
        </View>

        {/* Buttons */}
        <View className="pb-8">
          <TouchableOpacity
            onPress={() => router.push('/(auth)/phone')}
            className="bg-primary py-4 rounded-xl items-center mb-4"
          >
            <Text className="text-white text-lg font-semibold">
              {t('auth.welcome.getStarted')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/email-login')}
            className={`py-4 rounded-xl items-center border-2 border-primary`}
          >
            <Text className="text-primary text-lg font-semibold">
              {t('auth.welcome.loginWithEmail')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
