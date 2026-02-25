import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Linking, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { getColors } from '@/constants/Colors';

interface FAQ {
  question: string;
  answer: string;
}

export default function SupportScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const contactOptions = [
    {
      icon: 'call-outline' as const,
      label: t('support.callUs'),
      subtitle: '+974 4444 5555',
      onPress: () => Linking.openURL('tel:+97444445555'),
    },
    {
      icon: 'mail-outline' as const,
      label: t('support.emailUs'),
      subtitle: 'driver-support@wasel.qa',
      onPress: () => Linking.openURL('mailto:driver-support@wasel.qa'),
    },
    {
      icon: 'logo-whatsapp' as const,
      label: t('support.whatsapp'),
      subtitle: '+974 5555 6666',
      onPress: () => Linking.openURL('https://wa.me/97455556666'),
    },
  ];

  const faqs: FAQ[] = [
    {
      question: t('support.faq1Question'),
      answer: t('support.faq1Answer'),
    },
    {
      question: t('support.faq2Question'),
      answer: t('support.faq2Answer'),
    },
    {
      question: t('support.faq3Question'),
      answer: t('support.faq3Answer'),
    },
    {
      question: t('support.faq4Question'),
      answer: t('support.faq4Answer'),
    },
  ];

  const handleSendMessage = async () => {
    if (!message.trim()) {
      Alert.alert(t('errors.validationError'), t('support.enterMessage'));
      return;
    }

    setIsSending(true);
    // Simulate API call
    setTimeout(() => {
      setIsSending(false);
      setMessage('');
      Alert.alert(t('support.messageSent'), t('support.messageSentSubtitle'));
    }, 1500);
  };

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
          {t('support.title')}
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Contact Options */}
        <Text style={{ color: colors.foreground }} className="text-lg font-semibold mb-4">
          {t('support.contactUs')}
        </Text>
        <View className="flex-row gap-3 mb-8">
          {contactOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              onPress={option.onPress}
              className="flex-1 p-4 rounded-xl items-center"
              style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
            >
              <View
                className="w-12 h-12 rounded-full items-center justify-center mb-2"
                style={{ backgroundColor: colors.primary + '20' }}
              >
                <Ionicons name={option.icon} size={24} color={colors.primary} />
              </View>
              <Text style={{ color: colors.foreground }} className="text-sm font-medium text-center">
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ Section */}
        <Text style={{ color: colors.foreground }} className="text-lg font-semibold mb-4">
          {t('support.faq')}
        </Text>
        <View className="mb-8">
          {faqs.map((faq, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setExpandedFaq(expandedFaq === index ? null : index)}
              className="mb-3 rounded-xl overflow-hidden"
              style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
            >
              <View className="flex-row items-center justify-between p-4">
                <Text
                  style={{ color: colors.foreground }}
                  className="text-base font-medium flex-1 mr-2"
                >
                  {faq.question}
                </Text>
                <Ionicons
                  name={expandedFaq === index ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.mutedForeground}
                />
              </View>
              {expandedFaq === index && (
                <View
                  className="px-4 pb-4 pt-0 border-t"
                  style={{ borderColor: colors.border }}
                >
                  <Text style={{ color: colors.mutedForeground }} className="text-sm leading-5">
                    {faq.answer}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Send Message */}
        <Text style={{ color: colors.foreground }} className="text-lg font-semibold mb-4">
          {t('support.sendMessage')}
        </Text>
        <View
          className="p-4 rounded-xl"
          style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
        >
          <TextInput
            style={{
              backgroundColor: colors.secondary,
              borderColor: colors.border,
              borderWidth: 1,
              color: colors.foreground,
              minHeight: 100,
              textAlignVertical: 'top',
            }}
            className="px-4 py-3 rounded-xl text-base"
            placeholder={t('support.messagePlaceholder')}
            placeholderTextColor={colors.mutedForeground}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={isSending}
            className="mt-4 py-3 rounded-xl items-center"
            style={{ backgroundColor: colors.primary }}
          >
            {isSending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">{t('support.send')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Emergency */}
        <View
          className="mt-6 p-4 rounded-xl flex-row items-center"
          style={{ backgroundColor: colors.destructive + '15' }}
        >
          <Ionicons name="warning-outline" size={24} color={colors.destructive} />
          <View className="ml-3 flex-1">
            <Text style={{ color: colors.foreground }} className="font-semibold">
              {t('support.emergency')}
            </Text>
            <Text style={{ color: colors.mutedForeground }} className="text-sm">
              {t('support.emergencySubtitle')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
