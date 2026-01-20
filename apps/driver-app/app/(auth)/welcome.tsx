import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { changeLanguage } from '@/i18n';
import { getColors } from '@/constants/Colors';
import Svg, { Path, Polygon } from 'react-native-svg';

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
          <View className="w-32 h-32 items-center justify-center mb-8">
            <Svg width="128" height="96" viewBox="0 0 569.4 426.4">
              <Polygon
                fill="#0366FB"
                points="246.8,162.8 231.4,147.3 187.9,190.9 231.2,234.2 246.7,218.8 218.8,190.9"
              />
              <Path
                fill="#101969"
                d="M359.4,211c-2.2,1.3-5.3,2.5-9.7,3.3c-1.5-6-3.8-12.5-6.9-19.4c-9-20.1-18.7-33.5-29.5-41
                c-10.3-7.1-21.9-8.8-32.8-4.8c-9.4,3.5-16.7,10.7-19.9,19.9c-3.3,9.4-2.1,19.8,3.3,28.6c9.3,14.8,28.9,37,64.3,40
                c-1.1,8.2-5.1,14.2-11.8,17.4c-16.8,8-38.9-3.4-52.3-19.6l-15,17.5c9.3,10.1,20.5,17.9,32.5,22.4c16,6,32.7,5.8,45.8-0.4
                c3.5-1.7,6.8-3.8,9.9-6.4c8.1-7,14-17.6,14.9-31.8c0.2,0,0.4-0.1,0.6-0.1c5-0.7,9.2-1.9,12.9-3.3L359.4,211z M284.1,186.5
                c-1.9-3.1-2.4-6.8-1.2-10.2c0.4-1.2,1.3-3,3.1-4.6c0.9-0.8,2-1.5,3.4-2c12.9-4.7,26.4,21.8,31.7,33.4c1.8,4,3.3,7.9,4.4,11.6
                C304.4,211.5,291.6,198.4,284.1,186.5z"
              />
            </Svg>
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
