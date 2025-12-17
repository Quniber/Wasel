import { View, Text, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';

export default function SupportScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const supportOptions = [
    {
      icon: 'document-text',
      title: t('support.recentTrips'),
      description: t('support.recentTripsDesc'),
      onPress: () => router.push('/(main)/history'),
    },
    {
      icon: 'help-circle',
      title: t('support.faq'),
      description: t('support.faqDesc'),
      onPress: () => {
        // Open FAQ page or modal
      },
    },
    {
      icon: 'call',
      title: t('support.callUs'),
      description: t('support.callUsDesc'),
      onPress: () => Linking.openURL('tel:+1234567890'),
    },
    {
      icon: 'mail',
      title: t('support.emailUs'),
      description: t('support.emailUsDesc'),
      onPress: () => Linking.openURL('mailto:support@wasel.com'),
    },
    {
      icon: 'chatbubble-ellipses',
      title: t('support.liveChat'),
      description: t('support.liveChatDesc'),
      onPress: () => {
        // Open live chat
      },
    },
  ];

  const faqItems = [
    {
      question: t('support.faqQuestions.q1'),
      answer: t('support.faqAnswers.a1'),
    },
    {
      question: t('support.faqQuestions.q2'),
      answer: t('support.faqAnswers.a2'),
    },
    {
      question: t('support.faqQuestions.q3'),
      answer: t('support.faqAnswers.a3'),
    },
  ];

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
        </TouchableOpacity>
        <Text className={`flex-1 text-xl font-semibold text-center mr-10 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
          {t('support.title')}
        </Text>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Hero Section */}
        <View className="items-center py-6">
          <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
            <Ionicons name="headset" size={40} color="#4CAF50" />
          </View>
          <Text className={`text-xl font-bold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
            {t('support.howCanWeHelp')}
          </Text>
          <Text className="text-muted-foreground mt-2 text-center">
            {t('support.subtitle')}
          </Text>
        </View>

        {/* Support Options */}
        <View className={`rounded-xl overflow-hidden ${isDark ? 'bg-card-dark' : 'bg-card'} mb-6`}>
          {supportOptions.map((option, index) => (
            <TouchableOpacity
              key={option.title}
              onPress={option.onPress}
              className={`flex-row items-center px-4 py-4 ${
                index < supportOptions.length - 1
                  ? `border-b ${isDark ? 'border-border-dark' : 'border-border'}`
                  : ''
              }`}
            >
              <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                <Ionicons name={option.icon as any} size={20} color="#4CAF50" />
              </View>
              <View className="flex-1 ml-3">
                <Text className={`font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                  {option.title}
                </Text>
                <Text className="text-muted-foreground text-sm">{option.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDark ? '#757575' : '#9E9E9E'} />
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ Section */}
        <Text className="text-muted-foreground text-sm font-semibold mb-2 mt-2">
          {t('support.frequentQuestions')}
        </Text>
        <View className={`rounded-xl overflow-hidden ${isDark ? 'bg-card-dark' : 'bg-card'} mb-6`}>
          {faqItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              className={`px-4 py-4 ${
                index < faqItems.length - 1
                  ? `border-b ${isDark ? 'border-border-dark' : 'border-border'}`
                  : ''
              }`}
            >
              <View className="flex-row items-start">
                <Ionicons name="help-circle" size={20} color="#4CAF50" />
                <View className="flex-1 ml-3">
                  <Text className={`font-medium ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                    {item.question}
                  </Text>
                  <Text className="text-muted-foreground text-sm mt-1">{item.answer}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Info */}
        <View className={`rounded-xl p-4 mb-8 ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}>
          <Text className="text-muted-foreground text-center text-sm">
            {t('support.available')}
          </Text>
          <Text className={`text-center font-semibold mt-1 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
            {t('support.hours')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
