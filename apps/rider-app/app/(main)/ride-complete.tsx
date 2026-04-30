import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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

interface Breakdown {
  tripFare: number;
  serviceFee: number;
  promoDiscount: number;
  total: number;
  currency: string;
  paidWith: string;
  distance: number;
  durationMin: number;
  pickup: string;
  dropoff: string;
}

export default function RideCompleteScreen() {
  const { t, i18n } = useTranslation();
  const { activeOrder, resetBooking } = useBookingStore();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;
  const isRTL = i18n.language === 'ar';
  const writingDirection: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const [bd, setBd] = useState<Breakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeOrder?.id) {
      setIsLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await orderApi.getOrderDetails(String(activeOrder.id));
        const o = res.data || {};
        setBd({
          tripFare:
            parseFloat(o.serviceCost || o.fare || activeOrder.fare?.toString() || '0') || 0,
          serviceFee: parseFloat(o.serviceFee || '0') || 0,
          promoDiscount: parseFloat(o.couponAmount || o.discount || '0') || 0,
          total:
            parseFloat(
              o.costAfterCoupon || o.costBest || o.total || activeOrder.fare?.toString() || '0'
            ) || 0,
          currency: o.currency || 'QAR',
          paidWith:
            o.paymentMode === 'card' || o.paymentMode === 'payment_gateway'
              ? `${t('booking.payment.card', 'Card')} · •••• ${o.cardLast4 || ''}`.trim()
              : o.paymentMode === 'wallet'
              ? t('booking.payment.wallet', 'Wallet')
              : t('booking.payment.cash', 'Cash'),
          distance: parseFloat(o.distance || '0') || 0,
          durationMin: parseFloat(o.durationMin || o.estimatedDuration || '0') || 0,
          pickup: o.pickupAddress || activeOrder.pickup?.address || '',
          dropoff: o.dropoffAddress || activeOrder.dropoff?.address || '',
        });
      } catch {
        // Fallback to local state
        setBd({
          tripFare: Number(activeOrder.fare) || 0,
          serviceFee: 0,
          promoDiscount: 0,
          total: Number(activeOrder.fare) || 0,
          currency: 'QAR',
          paidWith: t('booking.payment.cash', 'Cash'),
          distance: 0,
          durationMin: 0,
          pickup: activeOrder.pickup?.address || '',
          dropoff: activeOrder.dropoff?.address || '',
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, [activeOrder?.id]);

  const goRate = () => router.replace('/(main)/rate-driver');
  const done = () => {
    resetBooking();
    router.replace('/(main)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 * s }}
        showsVerticalScrollIndicator={false}
      >
        {/* Green check halo */}
        <View style={{ alignItems: 'center', marginTop: 20 * s }}>
          <View
            style={{
              width: 80 * s,
              height: 80 * s,
              borderRadius: 40 * s,
              backgroundColor: '#33BF73',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="checkmark" size={40 * s} color="#FFFFFF" />
          </View>
        </View>

        <Text
          style={{
            marginTop: 28 * s,
            color: '#111111',
            fontSize: 28 * s,
            fontWeight: '700',
            letterSpacing: -0.6,
            textAlign: 'center',
          }}
        >
          {t('rideComplete.title', "You've arrived!")}
        </Text>
        <Text
          style={{
            marginTop: 8 * s,
            color: '#6B7380',
            fontSize: 15 * s,
            lineHeight: 22 * s,
            textAlign: 'center',
          }}
        >
          {t('rideComplete.subtitle', 'Hope you had a great trip with WaselGo.')}
        </Text>

        {isLoading || !bd ? (
          <View style={{ paddingVertical: 60 * s, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#101969" />
          </View>
        ) : (
          <View style={{ paddingHorizontal: 24 * s, gap: 14 * s, marginTop: 24 * s }}>
            {/* Pickup → dropoff */}
            <View
              style={{
                backgroundColor: '#F5F7FC',
                borderWidth: 1,
                borderColor: '#E5EBF2',
                borderRadius: 16 * s,
                paddingHorizontal: 16 * s,
                paddingVertical: 14 * s,
                gap: 12 * s,
              }}
            >
              <View
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  gap: 12 * s,
                }}
              >
                <View
                  style={{
                    width: 10 * s,
                    height: 10 * s,
                    borderRadius: 5 * s,
                    backgroundColor: '#0366FB',
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: '#6B7380',
                      fontSize: 11 * s,
                      fontWeight: '500',
                      textAlign,
                      writingDirection,
                    }}
                  >
                    {t('booking.pickup', 'PICKUP').toUpperCase()}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: '#111111',
                      fontSize: 14 * s,
                      fontWeight: '600',
                      textAlign,
                      writingDirection,
                    }}
                  >
                    {bd.pickup || '—'}
                  </Text>
                </View>
              </View>
              <View style={{ height: 1, backgroundColor: '#E5EBF2' }} />
              <View
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  gap: 12 * s,
                }}
              >
                <View
                  style={{
                    width: 10 * s,
                    height: 10 * s,
                    borderRadius: 2 * s,
                    backgroundColor: '#ED4557',
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: '#6B7380',
                      fontSize: 11 * s,
                      fontWeight: '500',
                      textAlign,
                      writingDirection,
                    }}
                  >
                    {t('booking.dropoff', 'DROP-OFF').toUpperCase()}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: '#111111',
                      fontSize: 14 * s,
                      fontWeight: '600',
                      textAlign,
                      writingDirection,
                    }}
                  >
                    {bd.dropoff || '—'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Distance + Duration */}
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12 * s }}>
              <View
                style={{
                  flex: 1,
                  height: 64 * s,
                  borderRadius: 14 * s,
                  borderWidth: 1,
                  borderColor: '#E5EBF2',
                  backgroundColor: '#F5F7FC',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2 * s,
                }}
              >
                <Text
                  style={{ color: '#6B7380', fontSize: 11 * s, fontWeight: '500', letterSpacing: 0.4 }}
                >
                  {t('rideComplete.distance', 'DISTANCE')}
                </Text>
                <Text style={{ color: '#111111', fontSize: 16 * s, fontWeight: '700' }}>
                  {bd.distance.toFixed(1)} km
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  height: 64 * s,
                  borderRadius: 14 * s,
                  borderWidth: 1,
                  borderColor: '#E5EBF2',
                  backgroundColor: '#F5F7FC',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2 * s,
                }}
              >
                <Text
                  style={{ color: '#6B7380', fontSize: 11 * s, fontWeight: '500', letterSpacing: 0.4 }}
                >
                  {t('rideComplete.duration', 'DURATION')}
                </Text>
                <Text style={{ color: '#111111', fontSize: 16 * s, fontWeight: '700' }}>
                  {Math.round(bd.durationMin)} min
                </Text>
              </View>
            </View>

            {/* Fare breakdown */}
            <View
              style={{
                borderRadius: 16 * s,
                borderWidth: 1,
                borderColor: '#E5EBF2',
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 16 * s,
                paddingVertical: 14 * s,
                gap: 10 * s,
              }}
            >
              {[
                { label: t('rideComplete.tripFare', 'Trip fare'), value: bd.tripFare },
                { label: t('rideComplete.serviceFee', 'Service fee'), value: bd.serviceFee },
                {
                  label: t('rideComplete.promoDiscount', 'Promo discount'),
                  value: -bd.promoDiscount,
                },
              ].map((row) => (
                <View
                  key={row.label}
                  style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{ flex: 1, color: '#6B7380', fontSize: 14 * s, textAlign }}
                  >
                    {row.label}
                  </Text>
                  <Text style={{ color: '#111111', fontSize: 14 * s, fontWeight: '600' }}>
                    {row.value < 0 ? '−' : ''}
                    {bd.currency} {Math.abs(row.value).toFixed(2)}
                  </Text>
                </View>
              ))}
              <View style={{ height: 1, backgroundColor: '#E5EBF2' }} />
              <View
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
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
                  {t('rideComplete.totalPaid', 'Total paid')}
                </Text>
                <Text style={{ color: '#111111', fontSize: 18 * s, fontWeight: '700' }}>
                  {bd.currency} {bd.total.toFixed(2)}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                }}
              >
                <Text style={{ flex: 1, color: '#6B7380', fontSize: 12 * s, textAlign }}>
                  {t('rideComplete.paidWith', 'Paid with')}
                </Text>
                <Text style={{ color: '#6B7380', fontSize: 12 * s, fontWeight: '600' }}>
                  {bd.paidWith}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom buttons */}
      <View style={{ paddingHorizontal: 24 * s, gap: 8 * s, paddingBottom: 8 * s }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={goRate}
          style={{
            height: 56 * s,
            borderRadius: 14 * s,
            backgroundColor: '#101969',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8 * s,
          }}
        >
          <Ionicons name="star" size={20 * s} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 17 * s, fontWeight: '600' }}>
            {t('rideComplete.rate', 'Rate your driver')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={done}
          style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 8 * s }}
        >
          <Text style={{ color: '#6B7380', fontSize: 15 * s, fontWeight: '600' }}>
            {t('common.done', 'Done')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
