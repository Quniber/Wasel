import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBookingStore } from '@/stores/booking-store';
import { orderApi } from '@/lib/api';

const BASE_W = 393;

const ratingLabels = (t: (k: string, def?: string) => string) => [
  t('rate.bad', 'Bad'),
  t('rate.poor', 'Poor'),
  t('rate.ok', 'OK'),
  t('rate.good', 'Good'),
  t('rate.excellent', 'Excellent!'),
];

const tagsByRating: Record<number, string[]> = {
  1: ['Late', 'Reckless', 'Rude', 'Dirty car'],
  2: ['Late', 'Slow', 'Took long route'],
  3: ['Took long route', 'Cold AC', 'Music too loud'],
  4: ['On time', 'Polite', 'Clean car'],
  5: ['Clean car', 'Good driver', 'Safe ride', 'On time', 'Friendly'],
};

export default function RateDriverScreen() {
  const { t, i18n } = useTranslation();
  const { activeOrder, resetBooking } = useBookingStore();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;
  const isRTL = i18n.language === 'ar';
  const writingDirection: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const driver = activeOrder?.driver;

  const [stars, setStars] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const labels = ratingLabels(t as any);
  const tags = tagsByRating[stars] || tagsByRating[5];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const submit = async () => {
    if (!activeOrder?.id) return;
    setSubmitting(true);
    try {
      await orderApi.rateDriver(activeOrder.id, stars, [...selectedTags, comment].filter(Boolean).join(' · '));
    } catch {}
    setSubmitting(false);
    resetBooking();
    router.replace('/(main)');
  };

  const skip = () => {
    resetBooking();
    router.replace('/(main)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 * s }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Skip button top-right */}
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: isRTL ? 'flex-start' : 'flex-end',
              paddingHorizontal: 20 * s,
              paddingTop: 14 * s,
            }}
          >
            <TouchableOpacity activeOpacity={0.7} onPress={skip} hitSlop={8}>
              <Text style={{ color: '#6B7380', fontSize: 15 * s, fontWeight: '600' }}>
                {t('common.skip', 'Skip')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            style={{
              marginTop: 12 * s,
              color: '#111111',
              fontSize: 26 * s,
              fontWeight: '700',
              letterSpacing: -0.6,
              textAlign: 'center',
            }}
          >
            {t('rate.title', 'How was your ride?')}
          </Text>

          {/* Driver avatar */}
          <View style={{ alignItems: 'center', marginTop: 24 * s }}>
            <View
              style={{
                width: 80 * s,
                height: 80 * s,
                borderRadius: 40 * s,
                backgroundColor: '#101969',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 26 * s, fontWeight: '700' }}>
                {(driver?.firstName?.[0] || 'D').toUpperCase()}
              </Text>
            </View>
            <Text
              style={{
                marginTop: 12 * s,
                color: '#111111',
                fontSize: 18 * s,
                fontWeight: '700',
                textAlign: 'center',
              }}
            >
              {[driver?.firstName, driver?.lastName].filter(Boolean).join(' ') ||
                t('common.driver', 'Driver')}
            </Text>
            <Text style={{ marginTop: 4 * s, color: '#6B7380', fontSize: 13 * s }}>
              {[driver?.carModel, driver?.carPlate].filter(Boolean).join(' · ')}
            </Text>
          </View>

          {/* Stars */}
          <View
            style={{
              marginTop: 20 * s,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 12 * s,
            }}
          >
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = n <= stars;
              return (
                <TouchableOpacity
                  key={n}
                  activeOpacity={0.7}
                  onPress={() => setStars(n)}
                  hitSlop={8}
                >
                  <Ionicons
                    name={filled ? 'star' : 'star-outline'}
                    size={40 * s}
                    color={filled ? '#F28C0D' : '#C7CDD8'}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <Text
            style={{
              marginTop: 16 * s,
              color: '#101969',
              fontSize: 17 * s,
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            {labels[stars - 1] || labels[4]}
          </Text>

          {/* Tags */}
          <View style={{ marginTop: 28 * s, paddingHorizontal: 24 * s, gap: 12 * s }}>
            <Text
              style={{
                color: '#6B7380',
                fontSize: 11 * s,
                fontWeight: '600',
                letterSpacing: 1,
                textAlign,
              }}
            >
              {stars >= 4
                ? t('rate.whatWentWell', 'WHAT WENT WELL?')
                : t('rate.whatWentWrong', 'WHAT WENT WRONG?')}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8 * s,
              }}
            >
              {tags.map((tag) => {
                const sel = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    activeOpacity={0.85}
                    onPress={() => toggleTag(tag)}
                    style={{
                      paddingHorizontal: 14 * s,
                      paddingVertical: 10 * s,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: sel ? '#101969' : '#E5EBF2',
                      backgroundColor: sel ? '#101969' : '#F5F7FC',
                    }}
                  >
                    <Text
                      style={{
                        color: sel ? '#FFFFFF' : '#111111',
                        fontSize: 13 * s,
                        fontWeight: '600',
                      }}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Comment */}
          <View style={{ marginTop: 20 * s, paddingHorizontal: 24 * s }}>
            <View
              style={{
                minHeight: 96 * s,
                paddingHorizontal: 16 * s,
                paddingVertical: 14 * s,
                borderRadius: 14 * s,
                borderWidth: 1,
                borderColor: '#E5EBF2',
                backgroundColor: '#F5F7FC',
              }}
            >
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder={t('rate.commentPlaceholder', 'Add a public comment (optional)')}
                placeholderTextColor="#6B7380"
                multiline
                style={{
                  fontSize: 14 * s,
                  color: '#111111',
                  padding: 0,
                  minHeight: 60 * s,
                  textAlign,
                  writingDirection,
                }}
              />
            </View>
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 24 * s, paddingBottom: 12 * s }}>
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={submitting}
            onPress={submit}
            style={{
              height: 56 * s,
              borderRadius: 14 * s,
              backgroundColor: '#101969',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 17 * s, fontWeight: '600' }}>
                {t('common.submit', 'Submit')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
