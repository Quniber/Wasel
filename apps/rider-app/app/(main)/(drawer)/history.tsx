import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '@/components/ScreenHeader';
import { orderApi } from '@/lib/api';

const BASE_W = 393;

interface Trip {
  id: string;
  status: string;
  pickup: string;
  dropoff: string;
  fare: number;
  currency: string;
  createdAt: Date;
}

const formatWhen = (d: Date, t: (k: string, def?: string) => string) => {
  const now = new Date();
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (same(d, now)) return `${t('common.today', 'Today')} · ${time}`;
  if (same(d, yesterday)) return `${t('common.yesterday', 'Yesterday')} · ${time}`;
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${time}`;
};

const tabs: Array<'all' | 'completed' | 'cancelled'> = ['all', 'completed', 'cancelled'];

export default function HistoryScreen() {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;
  const isRTL = i18n.language === 'ar';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const [trips, setTrips] = useState<Trip[]>([]);
  const [tab, setTab] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await orderApi.getOrderHistory();
      const arr = (res.data || []).map((o: any) => ({
        id: o.id?.toString() || String(Math.random()),
        status: o.status || '',
        pickup: o.pickupAddress || '',
        dropoff: o.dropoffAddress || '',
        fare: parseFloat(o.costAfterCoupon || o.costBest || o.serviceCost || '0') || 0,
        currency: o.currency || 'QAR',
        createdAt: new Date(o.createdAt || Date.now()),
      }));
      setTrips(arr);
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const isCompleted = (s: string) =>
    ['Finished', 'finished', 'Completed', 'completed'].includes(s);
  const isCancelled = (s: string) =>
    ['RiderCanceled', 'DriverCanceled', 'Cancelled', 'cancelled', 'Expired', 'NotFound', 'NoCloseFound'].includes(
      s
    );

  const filtered = trips.filter((t) => {
    if (tab === 'all') return true;
    if (tab === 'completed') return isCompleted(t.status);
    if (tab === 'cancelled') return isCancelled(t.status);
    return true;
  });

  const tabLabel = (k: 'all' | 'completed' | 'cancelled') => {
    if (k === 'all') return t('history.all', 'All');
    if (k === 'completed') return t('history.completed', 'Completed');
    return t('history.cancelled', 'Cancelled');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <ScreenHeader title={t('history.title', 'My rides')} />

      {/* Tabs */}
      <View
        style={{
          flexDirection: isRTL ? 'row-reverse' : 'row',
          gap: 24 * s,
          paddingHorizontal: 20 * s,
          height: 44 * s,
        }}
      >
        {tabs.map((k) => {
          const sel = tab === k;
          return (
            <TouchableOpacity
              key={k}
              activeOpacity={0.7}
              onPress={() => setTab(k)}
              hitSlop={6}
              style={{ alignItems: 'center', gap: 8 * s }}
            >
              <Text
                style={{
                  color: sel ? '#111111' : '#6B7380',
                  fontSize: 15 * s,
                  fontWeight: sel ? '700' : '500',
                }}
              >
                {tabLabel(k)}
              </Text>
              {sel && (
                <View
                  style={{
                    width: 28 * s,
                    height: 3 * s,
                    borderRadius: 999,
                    backgroundColor: '#101969',
                  }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#101969" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20 * s,
            paddingTop: 8 * s,
            paddingBottom: 24 * s,
            gap: 12 * s,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#101969"
            />
          }
        >
          {filtered.length === 0 ? (
            <View
              style={{
                paddingTop: 80 * s,
                alignItems: 'center',
                gap: 8 * s,
                paddingHorizontal: 24 * s,
              }}
            >
              <Ionicons name="time-outline" size={48 * s} color="#6B7380" />
              <Text style={{ color: '#111111', fontSize: 16 * s, fontWeight: '600' }}>
                {t('history.empty', 'No rides yet')}
              </Text>
              <Text style={{ color: '#6B7380', fontSize: 13 * s, textAlign: 'center' }}>
                {t('history.emptySubtitle', 'Your trip history will show up here.')}
              </Text>
            </View>
          ) : (
            filtered.map((trip) => {
              const completed = isCompleted(trip.status);
              return (
                <TouchableOpacity
                  key={trip.id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/(main)/(drawer)/history/${trip.id}` as any)}
                  style={{
                    borderRadius: 16 * s,
                    borderWidth: 1,
                    borderColor: '#E5EBF2',
                    backgroundColor: '#FFFFFF',
                    paddingHorizontal: 16 * s,
                    paddingVertical: 14 * s,
                    gap: 12 * s,
                  }}
                >
                  <View
                    style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        color: '#6B7380',
                        fontSize: 12 * s,
                        fontWeight: '500',
                        textAlign,
                      }}
                    >
                      {formatWhen(trip.createdAt, t as any)}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 8 * s,
                        paddingVertical: 4 * s,
                        borderRadius: 999,
                        backgroundColor: completed ? '#DBF5E3' : '#FFEBED',
                      }}
                    >
                      <Text
                        style={{
                          color: completed ? '#33BF73' : '#ED4557',
                          fontSize: 11 * s,
                          fontWeight: '600',
                        }}
                      >
                        {completed
                          ? t('history.completed', 'Completed')
                          : t('history.cancelled', 'Cancelled')}
                      </Text>
                    </View>
                  </View>

                  {/* Pickup → dropoff with vertical line */}
                  <View
                    style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      gap: 12 * s,
                    }}
                  >
                    <View
                      style={{
                        height: 40 * s,
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View
                        style={{
                          width: 8 * s,
                          height: 8 * s,
                          borderRadius: 4 * s,
                          backgroundColor: '#0366FB',
                        }}
                      />
                      <View style={{ flex: 1, width: 1.5, backgroundColor: '#E5EBF2' }} />
                      <View
                        style={{
                          width: 8 * s,
                          height: 8 * s,
                          borderRadius: 2 * s,
                          backgroundColor: '#ED4557',
                        }}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 12 * s }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: '#111111',
                          fontSize: 14 * s,
                          fontWeight: '600',
                          textAlign,
                        }}
                      >
                        {trip.pickup || '—'}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: '#111111',
                          fontSize: 14 * s,
                          fontWeight: '600',
                          textAlign,
                        }}
                      >
                        {trip.dropoff || '—'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      paddingTop: 4 * s,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        color: '#111111',
                        fontSize: 16 * s,
                        fontWeight: '700',
                        textAlign,
                      }}
                    >
                      {trip.currency} {trip.fare.toFixed(2)}
                    </Text>
                    <Ionicons
                      name={isRTL ? 'chevron-back' : 'chevron-forward'}
                      size={18 * s}
                      color="#6B7380"
                    />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
