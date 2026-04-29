import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '@/components/ScreenHeader';

const BASE_W = 393;

const SUPPORT_PHONE = '+97440409999';
const SUPPORT_EMAIL = 'support@waselapp.qa';

export default function SupportScreen() {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;
  const isRTL = i18n.language === 'ar';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const faqs = [
    {
      q: t('support.q1', 'How do I report a problem with a trip?'),
      a: t(
        'support.a1',
        "Open the app, find your trip in History and tap 'Get help' to start a refund or report an issue."
      ),
    },
    {
      q: t('support.q2', 'Why was my card charged twice?'),
      a: t(
        'support.a2',
        'The first charge is usually a temporary authorization that disappears within a few business days. If both stay, contact support and we will refund.'
      ),
    },
    {
      q: t('support.q3', 'How do I update my payment method?'),
      a: t(
        'support.a3',
        'Open Profile → Wallet & payments to change your default method. You can switch payment per ride right before confirming.'
      ),
    },
    {
      q: t('support.q4', 'Can I schedule a ride in advance?'),
      a: t(
        'support.a4',
        'Yes — on Home, tap the "Now" pill next to the search bar to pick a date and time at least 30 minutes in advance.'
      ),
    },
  ];

  const [expanded, setExpanded] = useState<number | null>(0);

  const Card = ({
    icon,
    title,
    sub,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    sub: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        flex: 1,
        height: 130 * s,
        padding: 14 * s,
        borderRadius: 16 * s,
        borderWidth: 1,
        borderColor: '#E5EBF2',
        backgroundColor: '#F5F7FC',
        gap: 10 * s,
      }}
    >
      <View
        style={{
          width: 40 * s,
          height: 40 * s,
          borderRadius: 20 * s,
          backgroundColor: '#E0F0FF',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={20 * s} color="#0366FB" />
      </View>
      <Text style={{ color: '#111111', fontSize: 15 * s, fontWeight: '700', textAlign }}>
        {title}
      </Text>
      <Text
        numberOfLines={2}
        style={{ color: '#6B7380', fontSize: 12 * s, lineHeight: 17 * s, textAlign }}
      >
        {sub}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <ScreenHeader title={t('support.title', 'Support')} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 * s }}
        showsVerticalScrollIndicator={false}
      >
        {/* Heading */}
        <View style={{ paddingHorizontal: 20 * s, paddingVertical: 8 * s, gap: 4 * s }}>
          <Text
            style={{
              color: '#111111',
              fontSize: 26 * s,
              fontWeight: '700',
              letterSpacing: -0.6,
              textAlign,
            }}
          >
            {t('support.howCanWeHelp', 'How can we help?')}
          </Text>
          <Text style={{ color: '#6B7380', fontSize: 14 * s, lineHeight: 20 * s, textAlign }}>
            {t('support.subtitle', "We're available 24/7. Choose how you want to reach us.")}
          </Text>
        </View>

        {/* Contact cards */}
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            gap: 10 * s,
            paddingHorizontal: 20 * s,
            marginTop: 8 * s,
          }}
        >
          <Card
            icon="call-outline"
            title={t('support.callUs', 'Call us')}
            sub="+974 4040 9999"
            onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
          />
          <Card
            icon="mail-outline"
            title={t('support.email', 'Email')}
            sub={SUPPORT_EMAIL}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          />
          <Card
            icon="chatbubbles-outline"
            title={t('support.liveChat', 'Live chat')}
            sub={t('support.liveChatSub', 'Get help in seconds')}
            onPress={() => {
              // TODO: open live chat
            }}
          />
        </View>

        {/* FAQ */}
        <Text
          style={{
            marginTop: 24 * s,
            marginHorizontal: 20 * s,
            color: '#6B7380',
            fontSize: 11 * s,
            fontWeight: '600',
            letterSpacing: 1.2,
            textAlign,
          }}
        >
          {t('support.faqHeader', 'FREQUENTLY ASKED')}
        </Text>

        <View style={{ marginHorizontal: 20 * s }}>
          {faqs.map((f, i) => {
            const open = expanded === i;
            return (
              <View key={i}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setExpanded(open ? null : i)}
                  style={{
                    paddingVertical: 14 * s,
                    flexDirection: 'column',
                    gap: 8 * s,
                  }}
                >
                  <View
                    style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      gap: 12 * s,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        color: '#111111',
                        fontSize: 14 * s,
                        fontWeight: '600',
                        textAlign,
                      }}
                    >
                      {f.q}
                    </Text>
                    <Ionicons
                      name={open ? 'chevron-up' : 'chevron-down'}
                      size={18 * s}
                      color="#6B7380"
                    />
                  </View>
                  {open && (
                    <Text
                      style={{
                        color: '#6B7380',
                        fontSize: 13 * s,
                        lineHeight: 19 * s,
                        textAlign,
                      }}
                    >
                      {f.a}
                    </Text>
                  )}
                </TouchableOpacity>
                <View style={{ height: 1, backgroundColor: '#E5EBF2' }} />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
