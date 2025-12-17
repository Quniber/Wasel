import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { useBookingStore } from '@/stores/booking-store';
import { orderApi } from '@/lib/api';

export default function RateDriverScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { activeOrder, resetBooking } = useBookingStore();
  const isDark = resolvedTheme === 'dark';

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feedbackTags = [
    { key: 'clean', label: t('ride.rating.cleanCar') },
    { key: 'good', label: t('ride.rating.goodDriver') },
    { key: 'safe', label: t('ride.rating.safeRide') },
    { key: 'time', label: t('ride.rating.onTime') },
  ];

  const toggleTag = (key: string) => {
    setSelectedTags((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    if (!activeOrder) return;

    setIsSubmitting(true);
    try {
      // await orderApi.rateDriver(activeOrder.id, rating, comment);
      resetBooking();
      router.replace('/(main)');
    } catch (error) {
      console.error('Error submitting rating:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    resetBooking();
    router.replace('/(main)');
  };

  const driver = activeOrder?.driver;

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      <ScrollView className="flex-1" contentContainerClassName="px-6 py-6">
        {/* Title */}
        <Text className={`text-2xl font-bold text-center mb-8 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
          {t('ride.rating.title')}
        </Text>

        {/* Driver Avatar */}
        <View className="items-center mb-6">
          <View className="w-24 h-24 rounded-full bg-primary items-center justify-center mb-3">
            <Text className="text-white text-3xl font-bold">
              {driver?.firstName?.[0]}{driver?.lastName?.[0]}
            </Text>
          </View>
          <Text className={`text-xl font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
            {driver?.firstName}
          </Text>
        </View>

        {/* Star Rating */}
        <View className="flex-row justify-center mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              className="p-2"
            >
              <Ionicons
                name={star <= rating ? 'star' : 'star-outline'}
                size={40}
                color={star <= rating ? '#FFB300' : '#E0E0E0'}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Comment Input */}
        <View className={`rounded-xl p-4 mb-6 ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}>
          <TextInput
            className={`text-base min-h-[100px] ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}
            placeholder={t('ride.rating.addComment')}
            placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
            value={comment}
            onChangeText={setComment}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Quick Feedback Tags */}
        <Text className={`text-sm font-semibold mb-3 ${isDark ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
          {t('ride.rating.quickFeedback')}
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-8">
          {feedbackTags.map((tag) => (
            <TouchableOpacity
              key={tag.key}
              onPress={() => toggleTag(tag.key)}
              className={`px-4 py-2 rounded-full border ${
                selectedTags.includes(tag.key)
                  ? 'bg-primary border-primary'
                  : isDark
                  ? 'border-border-dark bg-transparent'
                  : 'border-border bg-transparent'
              }`}
            >
              <Text
                className={`${
                  selectedTags.includes(tag.key)
                    ? 'text-white'
                    : isDark
                    ? 'text-foreground-dark'
                    : 'text-foreground'
                }`}
              >
                {tag.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Actions */}
      <View className={`px-6 pb-6 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          className="bg-primary py-4 rounded-xl items-center mb-3"
        >
          <Text className="text-white text-lg font-semibold">
            {isSubmitting ? t('common.loading') : t('common.submit')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} className="py-3 items-center">
          <Text className="text-muted-foreground">{t('common.skip')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
