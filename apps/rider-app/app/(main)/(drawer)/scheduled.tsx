import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { orderApi } from '@/lib/api';
import ScreenHeader from '@/components/ScreenHeader';
import AlertModal from '@/components/AlertModal';

const BASE_W = 393;

interface ScheduledRide {
  id: string;
  scheduledAt: string;
  pickup: string;
  dropoff: string;
  estimatedFare: number;
  currency?: string;
}

const formatWhen = (iso: string, t: (k: string, def?: string) => string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (same(d, now)) return `${t('common.today', 'Today')} · ${time}`;
  if (same(d, tomorrow)) return `${t('common.tomorrow', 'Tomorrow')} · ${time}`;
  const day = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day} · ${time}`;
};

export default function ScheduledScreen() {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;
  const isRTL = i18n.language === 'ar';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const [rides, setRides] = useState<ScheduledRide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState<ScheduledRide | null>(null);

  const load = async () => {
    try {
      const res = await orderApi.getScheduledOrders();
      const arr = (res.data || []).map((o: any) => ({
        id: o.id?.toString() || String(Math.random()),
        scheduledAt: o.scheduledAt || o.scheduled_at || new Date().toISOString(),
        pickup: o.pickupAddress || '',
        dropoff: o.dropoffAddress || '',
        estimatedFare: parseFloat(o.estimatedFare || o.serviceCost || '0'),
        currency: o.currency || 'QAR',
      }));
      setRides(arr);
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  const handleCancel = async () => {
    if (!confirmCancel) return;
    try {
      await orderApi.cancelOrder(confirmCancel.id);
      setRides((prev) => prev.filter((r) => r.id !== confirmCancel.id));
    } catch {}
    setConfirmCancel(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <ScreenHeader title={t('scheduled.title', 'Scheduled rides')} />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#101969" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20 * s, paddingBottom: 120 * s, gap: 12 * s }}
        >
          {rides.length === 0 ? (
            <View
              style={{ paddingTop: 80 * s, alignItems: 'center', gap: 8 * s, paddingHorizontal: 24 * s }}
            >
              <Ionicons name="calendar-outline" size={48 * s} color="#6B7380" />
              <Text
                style={{ color: '#111111', fontSize: 16 * s, fontWeight: '600', textAlign: 'center' }}
              >
                {t('scheduled.empty', 'No scheduled rides')}
              </Text>
              <Text style={{ color: '#6B7380', fontSize: 13 * s, textAlign: 'center' }}>
                {t(
                  'scheduled.emptySubtitle',
                  "Plan a ride for later — we'll have a driver ready when you need one."
                )}
              </Text>
            </View>
          ) : (
            rides.map((r) => (
              <View
                key={r.id}
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
                    gap: 8 * s,
                  }}
                >
                  <View
                    style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      gap: 6 * s,
                      paddingHorizontal: 10 * s,
                      paddingVertical: 6 * s,
                      borderRadius: 999,
                      backgroundColor: '#E0F0FF',
                    }}
                  >
                    <Ionicons name="time" size={14 * s} color="#0366FB" />
                    <Text style={{ color: '#0366FB', fontSize: 12 * s, fontWeight: '600' }}>
                      {formatWhen(r.scheduledAt, t as any)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <Text style={{ color: '#111111', fontSize: 15 * s, fontWeight: '700' }}>
                    {r.currency || 'QAR'} {r.estimatedFare.toFixed(2)}
                  </Text>
                </View>

                {/* Pickup → dropoff with vertical line */}
                <View
                  style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 12 * s,
                  }}
                >
                  <View style={{ alignItems: 'center', height: 38 * s, justifyContent: 'space-between' }}>
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
                  <View style={{ flex: 1, gap: 10 * s }}>
                    <Text
                      numberOfLines={1}
                      style={{ color: '#111111', fontSize: 14 * s, fontWeight: '600', textAlign }}
                    >
                      {r.pickup || '—'}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{ color: '#111111', fontSize: 14 * s, fontWeight: '600', textAlign }}
                    >
                      {r.dropoff || '—'}
                    </Text>
                  </View>
                </View>

                {/* Buttons */}
                <View
                  style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    gap: 8 * s,
                    height: 40 * s,
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      // edit not yet implemented — open schedule sheet on home
                      router.push('/(main)/(drawer)' as any);
                    }}
                    style={{
                      flex: 1,
                      height: 40 * s,
                      borderRadius: 12 * s,
                      backgroundColor: '#F5F7FC',
                      borderWidth: 1,
                      borderColor: '#E5EBF2',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#111111', fontSize: 13 * s, fontWeight: '600' }}>
                      {t('common.edit', 'Edit')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setConfirmCancel(r)}
                    style={{
                      flex: 1,
                      height: 40 * s,
                      borderRadius: 12 * s,
                      backgroundColor: '#FFF0F2',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#ED4557', fontSize: 13 * s, fontWeight: '600' }}>
                      {t('common.cancel', 'Cancel')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Floating Schedule a ride pill */}
      <View
        style={{
          position: 'absolute',
          bottom: 40 * s,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/(main)/(drawer)' as any)}
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 8 * s,
            paddingLeft: 16 * s,
            paddingRight: 18 * s,
            paddingVertical: 14 * s,
            borderRadius: 999,
            backgroundColor: '#101969',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.16,
            shadowRadius: 20,
            elevation: 8,
          }}
        >
          <Ionicons name="calendar" size={18 * s} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 15 * s, fontWeight: '600' }}>
            {t('scheduled.schedule', 'Schedule a ride')}
          </Text>
        </TouchableOpacity>
      </View>

      <AlertModal
        visible={!!confirmCancel}
        variant="warning"
        title={t('scheduled.confirmCancelTitle', 'Cancel scheduled ride?')}
        message={t(
          'scheduled.confirmCancelMsg',
          "You can schedule a new ride at any time."
        )}
        primaryLabel={t('scheduled.yesCancel', 'Yes, cancel')}
        onPrimaryPress={handleCancel}
        secondaryLabel={t('scheduled.keep', 'Keep ride')}
        onSecondaryPress={() => setConfirmCancel(null)}
        onRequestClose={() => setConfirmCancel(null)}
      />
    </SafeAreaView>
  );
}
