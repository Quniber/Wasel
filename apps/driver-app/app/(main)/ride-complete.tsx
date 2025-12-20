import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { useDriverStore } from '@/stores/driver-store';
import { getColors } from '@/constants/Colors';
import { ordersApi } from '@/lib/api';

export default function RideCompleteScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { activeRide, setActiveRide, updateStats, todayStats } = useDriverStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [rating, setRating] = useState(5);
  const [tip, setTip] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tipOptions = [0, 5, 10, 20];

  useEffect(() => {
    // Update today's stats
    if (activeRide) {
      updateStats({
        earnings: todayStats.earnings + (activeRide.fare || 0),
        trips: todayStats.trips + 1,
        acceptanceRate: todayStats.acceptanceRate,
      });
    }
  }, []);

  const handleSubmit = async () => {
    if (!activeRide) {
      router.replace('/(main)');
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit rating for rider
      await ordersApi.rateRider(activeRide.id, {
        rating,
        tip: parseFloat(tip) || 0,
      });

      setActiveRide(null);
      router.replace('/(main)');
    } catch (error) {
      console.error('Error submitting rating:', error);
      setActiveRide(null);
      router.replace('/(main)');
    }
  };

  const handleSkip = () => {
    setActiveRide(null);
    router.replace('/(main)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View className="flex-1 px-6">
        {/* Header */}
        <View className="items-center mt-8">
          <View
            className="w-20 h-20 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.success + '20' }}
          >
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          </View>
          <Text style={{ color: colors.foreground }} className="text-2xl font-bold mt-4">
            {t('rideComplete.title')}
          </Text>
          <Text style={{ color: colors.mutedForeground }} className="text-base mt-2 text-center">
            {t('rideComplete.subtitle')}
          </Text>
        </View>

        {/* Earnings Card */}
        <View
          className="mt-8 p-6 rounded-2xl items-center"
          style={{ backgroundColor: colors.success + '10', borderColor: colors.success, borderWidth: 1 }}
        >
          <Text style={{ color: colors.mutedForeground }} className="text-sm uppercase">
            {t('rideComplete.youEarned')}
          </Text>
          <Text style={{ color: colors.success }} className="text-4xl font-bold mt-2">
            QAR {activeRide?.fare?.toFixed(0) || '0'}
          </Text>
          <View className="flex-row items-center mt-3">
            <View className="flex-row items-center mr-4">
              <Ionicons name="navigate-outline" size={16} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground }} className="ml-1">
                {activeRide?.distance?.toFixed(1) || '--'} km
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons
                name={activeRide?.paymentMethod === 'cash' ? 'cash-outline' : 'card-outline'}
                size={16}
                color={colors.mutedForeground}
              />
              <Text style={{ color: colors.mutedForeground }} className="ml-1">
                {activeRide?.paymentMethod === 'cash' ? t('payment.cash') : t('payment.card')}
              </Text>
            </View>
          </View>
        </View>

        {/* Rate Rider */}
        <View className="mt-8">
          <Text style={{ color: colors.foreground }} className="text-lg font-semibold mb-4 text-center">
            {t('rideComplete.rateRider')}
          </Text>
          <View className="flex-row justify-center gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={40}
                  color={star <= rating ? '#f59e0b' : colors.muted}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tip Section (for card payments, driver can record cash tips) */}
        <View className="mt-8">
          <Text style={{ color: colors.foreground }} className="text-base font-medium mb-3">
            {t('rideComplete.tipReceived')}
          </Text>
          <View className="flex-row gap-3 mb-3">
            {tipOptions.map((amount) => (
              <TouchableOpacity
                key={amount}
                onPress={() => setTip(amount.toString())}
                className="flex-1 py-3 rounded-xl items-center"
                style={{
                  backgroundColor: tip === amount.toString() ? colors.primary + '20' : colors.secondary,
                  borderColor: tip === amount.toString() ? colors.primary : colors.border,
                  borderWidth: 1,
                }}
              >
                <Text
                  style={{ color: tip === amount.toString() ? colors.primary : colors.foreground }}
                  className="font-medium"
                >
                  {amount === 0 ? t('rideComplete.noTip') : `QAR ${amount}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View
            className="flex-row items-center rounded-xl px-4"
            style={{ backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 }}
          >
            <Text style={{ color: colors.mutedForeground }} className="mr-2">QAR</Text>
            <TextInput
              style={{ color: colors.foreground }}
              className="flex-1 py-3 text-base"
              placeholder={t('rideComplete.customTip')}
              placeholderTextColor={colors.mutedForeground}
              value={tip}
              onChangeText={setTip}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-1 justify-end pb-6">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            className="py-4 rounded-xl items-center mb-3"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white text-lg font-semibold">
              {isSubmitting ? t('common.loading') : t('rideComplete.submit')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} className="py-3 items-center">
            <Text style={{ color: colors.mutedForeground }} className="text-base">
              {t('common.skip')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
