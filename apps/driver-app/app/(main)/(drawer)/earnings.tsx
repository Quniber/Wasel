import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useThemeStore } from '@/stores/theme-store';
import { useDriverStore } from '@/stores/driver-store';
import { getColors } from '@/constants/Colors';
import { earningsApi } from '@/lib/api';

type Period = 'today' | 'week' | 'month';

interface EarningsData {
  total: number;
  trips: number;
  onlineHours: number;
  daily: { date: string; amount: number; trips: number }[];
}

export default function EarningsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { resolvedTheme } = useThemeStore();
  const { balance } = useDriverStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [period, setPeriod] = useState<Period>('week');
  const [isLoading, setIsLoading] = useState(true);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);

  useEffect(() => {
    fetchEarnings();
  }, [period]);

  const fetchEarnings = async () => {
    setIsLoading(true);
    try {
      // Use appropriate endpoint based on period
      let response;
      if (period === 'today') {
        response = await earningsApi.getToday();
      } else if (period === 'week') {
        response = await earningsApi.getWeek();
      } else {
        // For month, use history with date range
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endDate = now.toISOString();
        response = await earningsApi.getHistory(1, 100, startDate, endDate);
      }
      setEarnings(response.data);
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: t('earnings.today') },
    { key: 'week', label: t('earnings.thisWeek') },
    { key: 'month', label: t('earnings.thisMonth') },
  ];

  const maxDailyEarning = earnings?.daily?.length
    ? Math.max(...earnings.daily.map((d) => d.amount))
    : 100;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View className="px-4 py-4 border-b" style={{ borderColor: colors.border }}>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            className="w-11 h-11 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: colors.secondary }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text style={{ color: colors.foreground }} className="text-2xl font-bold">
              {t('earnings.title')}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Period Selector */}
        <View className="flex-row mx-4 mt-4 p-1 rounded-xl" style={{ backgroundColor: colors.secondary }}>
          {periods.map((p) => (
            <TouchableOpacity
              key={p.key}
              onPress={() => setPeriod(p.key)}
              className="flex-1 py-2 rounded-lg items-center"
              style={{ backgroundColor: period === p.key ? colors.primary : 'transparent' }}
            >
              <Text
                style={{ color: period === p.key ? colors.primaryForeground : colors.mutedForeground }}
                className="font-medium"
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Total Earnings Card */}
            <View
              className="mx-4 mt-4 p-6 rounded-2xl items-center"
              style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
            >
              <Text style={{ color: colors.mutedForeground }} className="text-sm uppercase">
                {t('earnings.totalEarnings')}
              </Text>
              <Text style={{ color: colors.success }} className="text-4xl font-bold mt-2">
                QAR {earnings?.total?.toFixed(0) || '0'}
              </Text>

              <View className="flex-row mt-4 gap-6">
                <View className="items-center">
                  <Text style={{ color: colors.foreground }} className="text-xl font-bold">
                    {earnings?.trips || 0}
                  </Text>
                  <Text style={{ color: colors.mutedForeground }} className="text-sm">
                    {t('earnings.trips')}
                  </Text>
                </View>
                <View className="items-center">
                  <Text style={{ color: colors.foreground }} className="text-xl font-bold">
                    {earnings?.onlineHours?.toFixed(1) || '0'}
                  </Text>
                  <Text style={{ color: colors.mutedForeground }} className="text-sm">
                    {t('earnings.hours')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Wallet Balance */}
            <View
              className="mx-4 mt-4 p-4 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: colors.primary + '15' }}
            >
              <View className="flex-row items-center">
                <Ionicons name="wallet-outline" size={24} color={colors.primary} />
                <View className="ml-3">
                  <Text style={{ color: colors.mutedForeground }} className="text-xs">
                    {t('earnings.availableBalance')}
                  </Text>
                  <Text style={{ color: colors.foreground }} className="text-lg font-bold">
                    QAR {balance.toFixed(0)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(main)/(drawer)/withdrawals')}
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="text-white font-medium">{t('earnings.withdraw')}</Text>
              </TouchableOpacity>
            </View>

            {/* Daily Breakdown Chart */}
            {earnings?.daily && earnings.daily.length > 0 && (
              <View className="mx-4 mt-6">
                <Text style={{ color: colors.foreground }} className="text-lg font-semibold mb-4">
                  {t('earnings.dailyBreakdown')}
                </Text>

                <View className="flex-row justify-between items-end h-40 px-2">
                  {earnings.daily.slice(-7).map((day, index) => {
                    const height = maxDailyEarning > 0 ? (day.amount / maxDailyEarning) * 100 : 0;
                    return (
                      <View key={index} className="items-center flex-1">
                        <Text style={{ color: colors.foreground }} className="text-xs font-medium mb-1">
                          {day.amount > 0 ? day.amount.toFixed(0) : ''}
                        </Text>
                        <View
                          className="w-8 rounded-t-md"
                          style={{
                            backgroundColor: colors.primary,
                            height: Math.max(height, 4),
                          }}
                        />
                        <Text style={{ color: colors.mutedForeground }} className="text-xs mt-2">
                          {new Date(day.date).toLocaleDateString('en', { weekday: 'short' }).slice(0, 3)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Daily List */}
            <View className="mx-4 mt-6 mb-6">
              <Text style={{ color: colors.foreground }} className="text-lg font-semibold mb-4">
                {t('earnings.recentDays')}
              </Text>

              {earnings?.daily?.map((day, index) => (
                <View
                  key={index}
                  className="flex-row items-center justify-between py-3 border-b"
                  style={{ borderColor: colors.border }}
                >
                  <View>
                    <Text style={{ color: colors.foreground }} className="text-base font-medium">
                      {new Date(day.date).toLocaleDateString('en', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    <Text style={{ color: colors.mutedForeground }} className="text-sm">
                      {day.trips} {t('earnings.trips')}
                    </Text>
                  </View>
                  <Text style={{ color: colors.success }} className="text-lg font-bold">
                    QAR {day.amount.toFixed(0)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
