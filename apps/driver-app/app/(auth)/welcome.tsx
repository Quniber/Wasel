import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { changeLanguage } from '@/i18n';
import { getColors } from '@/constants/Colors';

export default function WelcomeScreen() {
  const { t, i18n } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    await changeLanguage(newLang);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View className="flex-1 px-6">
        {/* Header with Language Toggle */}
        <View className="flex-row justify-between items-center mt-4">
          <View className="w-10" />
          <TouchableOpacity
            onPress={toggleLanguage}
            style={{
              backgroundColor: colors.secondary,
              borderColor: colors.border,
              borderWidth: 1,
            }}
            className="px-4 py-2 rounded-lg flex-row items-center"
          >
            <Ionicons name="globe-outline" size={18} color={colors.mutedForeground} />
            <Text style={{ color: colors.foreground }} className="font-medium ml-2">
              {i18n.language === 'en' ? 'العربية' : 'English'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Logo and Title */}
        <View className="flex-1 items-center justify-center">
          {/* Logo Container */}
          <View
            style={{ backgroundColor: colors.primary }}
            className="w-24 h-24 rounded-2xl items-center justify-center mb-8 shadow-lg"
          >
            <Ionicons name="car-sport" size={48} color={colors.primaryForeground} />
          </View>

          {/* App Name */}
          <Text
            style={{ color: colors.foreground }}
            className="text-4xl font-bold tracking-tight"
          >
            WASEL
          </Text>

          {/* Subtitle */}
          <Text
            style={{ color: colors.mutedForeground }}
            className="text-base mt-1"
          >
            DRIVER
          </Text>

          {/* Tagline */}
          <Text
            style={{ color: colors.mutedForeground }}
            className="text-lg mt-3 text-center px-8"
          >
            {t('auth.welcome.subtitle')}
          </Text>

          {/* Features */}
          <View className="mt-10 w-full px-4">
            {[
              { icon: 'time-outline', text: t('auth.welcome.feature1') },
              { icon: 'wallet-outline', text: t('auth.welcome.feature2') },
              { icon: 'headset-outline', text: t('auth.welcome.feature3') },
            ].map((feature, index) => (
              <View
                key={index}
                className="flex-row items-center mb-4"
              >
                <View
                  style={{ backgroundColor: colors.secondary }}
                  className="w-10 h-10 rounded-full items-center justify-center"
                >
                  <Ionicons name={feature.icon as any} size={20} color={colors.primary} />
                </View>
                <Text
                  style={{ color: colors.foreground }}
                  className="ml-4 text-base"
                >
                  {feature.text}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Buttons */}
        <View className="pb-8">
          {/* Primary Button */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/phone')}
            style={{ backgroundColor: colors.primary }}
            className="py-4 rounded-xl items-center shadow-sm"
          >
            <Text
              style={{ color: colors.primaryForeground }}
              className="text-base font-semibold"
            >
              {t('auth.welcome.getStarted')}
            </Text>
          </TouchableOpacity>

          {/* Secondary Button */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/email-login')}
            style={{
              backgroundColor: colors.background,
              borderColor: colors.border,
              borderWidth: 1,
            }}
            className="py-4 rounded-xl items-center mt-3"
          >
            <Text
              style={{ color: colors.foreground }}
              className="text-base font-semibold"
            >
              {t('auth.welcome.loginWithEmail')}
            </Text>
          </TouchableOpacity>

          {/* Terms */}
          <Text
            style={{ color: colors.mutedForeground }}
            className="text-xs text-center mt-6 px-4"
          >
            {t('auth.welcome.terms')}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
