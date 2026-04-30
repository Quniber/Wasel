import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { orderApi } from '@/lib/api';

const BASE_W = 393;

interface Detail {
  status: string;
  createdAt: Date;
  pickup: string;
  dropoff: string;
  distance: number;
  durationMin: number;
  payment: string;
  driverName: string;
  driverRating: number;
  carModel: string;
  carPlate: string;
  tripFare: number;
  serviceFee: number;
  promoDiscount: number;
  total: number;
  currency: string;
}

export default function HistoryDetailScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;
  const isRTL = i18n.language === 'ar';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';
  const writingDirection: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';

  const [d, setD] = useState<Detail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await orderApi.getOrderDetails(String(id));
        const o = res.data || {};
        setD({
          status: o.status || '',
          createdAt: new Date(o.createdAt || Date.now()),
          pickup: o.pickupAddress || '',
          dropoff: o.dropoffAddress || '',
          distance: parseFloat(o.distance || '0') || 0,
          durationMin: parseFloat(o.durationMin || o.estimatedDuration || '0') || 0,
          payment:
            o.paymentMode === 'card' || o.paymentMode === 'payment_gateway'
              ? `${t('booking.payment.card', 'Card')} · ${o.cardLast4 || '••'}`.trim()
              : o.paymentMode === 'wallet'
              ? t('booking.payment.wallet', 'Wallet')
              : t('booking.payment.cash', 'Cash'),
          driverName:
            [o.driver?.firstName, o.driver?.lastName].filter(Boolean).join(' ') ||
            t('common.driver', 'Driver'),
          driverRating: parseFloat(o.driver?.rating || '5') || 5,
          carModel:
            typeof o.driver?.carModel === 'string'
              ? o.driver.carModel
              : o.driver?.carModel
              ? `${o.driver.carModel.brand || ''} ${o.driver.carModel.model || ''}`.trim()
              : '',
          carPlate: o.driver?.carPlate || '',
          tripFare: parseFloat(o.serviceCost || '0') || 0,
          serviceFee: parseFloat(o.serviceFee || '0') || 0,
          promoDiscount: parseFloat(o.couponAmount || '0') || 0,
          total: parseFloat(o.costAfterCoupon || o.costBest || o.total || '0') || 0,
          currency: o.currency || 'QAR',
        });
      } catch {
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  const isCompleted = d && ['Finished', 'finished', 'Completed', 'completed'].includes(d.status);

  if (isLoading || !d) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#101969" />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Map preview area */}
      <View
        style={{
          height: 200 * s,
          backgroundColor: '#EBF0F7',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="map" size={64 * s} color="#C7CDD8" />
      </View>

      {/* Floating back button */}
      <SafeAreaView
        edges={['top']}
        style={{ position: 'absolute', top: 0, left: 0 }}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.back()}
          style={{
            marginLeft: 16 * s,
            marginTop: 8 * s,
            width: 40 * s,
            height: 40 * s,
            borderRadius: 20 * s,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <Ionicons
            name={isRTL ? 'chevron-forward' : 'chevron-back'}
            size={20 * s}
            color="#111111"
          />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 * s }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20 * s, paddingTop: 14 * s, gap: 12 * s }}>
          {/* Title row */}
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1, gap: 2 * s }}>
              <Text
                style={{ color: '#111111', fontSize: 18 * s, fontWeight: '700', textAlign }}
              >
                {d.createdAt.toLocaleDateString(undefined, {
                  weekday: 'long',
                })}
              </Text>
              <Text style={{ color: '#6B7380', fontSize: 12 * s, textAlign }}>
                {d.createdAt.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {' · '}
                {d.createdAt.toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: 10 * s,
                paddingVertical: 6 * s,
                borderRadius: 999,
                backgroundColor: isCompleted ? '#DBF5E3' : '#FFEBED',
              }}
            >
              <Text
                style={{
                  color: isCompleted ? '#33BF73' : '#ED4557',
                  fontSize: 12 * s,
                  fontWeight: '600',
                }}
              >
                {isCompleted
                  ? t('history.completed', 'Completed')
                  : t('history.cancelled', 'Cancelled')}
              </Text>
            </View>
          </View>

          {/* Driver */}
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 12 * s,
              backgroundColor: '#F5F7FC',
              borderWidth: 1,
              borderColor: '#E5EBF2',
              borderRadius: 14 * s,
              paddingHorizontal: 14 * s,
              paddingVertical: 12 * s,
            }}
          >
            <View
              style={{
                width: 40 * s,
                height: 40 * s,
                borderRadius: 20 * s,
                backgroundColor: '#101969',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14 * s, fontWeight: '700' }}>
                {(d.driverName?.[0] || 'D').toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                style={{ color: '#111111', fontSize: 14 * s, fontWeight: '600', textAlign }}
              >
                {d.driverName}
              </Text>
              <View
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  gap: 6 * s,
                  marginTop: 2 * s,
                }}
              >
                <Ionicons name="star" size={12 * s} color="#F28C0D" />
                <Text style={{ color: '#111111', fontSize: 12 * s, fontWeight: '600' }}>
                  {d.driverRating.toFixed(1)}
                </Text>
                <Text style={{ color: '#6B7380', fontSize: 12 * s }}>·</Text>
                <Text
                  numberOfLines={1}
                  style={{ color: '#6B7380', fontSize: 12 * s }}
                >
                  {[d.carModel, d.carPlate].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats row */}
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              gap: 10 * s,
              height: 64 * s,
            }}
          >
            {[
              { label: t('rideComplete.distance', 'DISTANCE'), value: `${d.distance.toFixed(1)} km` },
              { label: t('rideComplete.duration', 'DURATION'), value: `${Math.round(d.durationMin)} min` },
              { label: t('history.payment', 'PAYMENT'), value: d.payment },
            ].map((row, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
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
                  style={{
                    color: '#6B7380',
                    fontSize: 10 * s,
                    fontWeight: '500',
                    letterSpacing: 0.4,
                  }}
                >
                  {row.label}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ color: '#111111', fontSize: 13 * s, fontWeight: '700' }}
                >
                  {row.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Fare breakdown */}
          <View
            style={{
              borderRadius: 14 * s,
              borderWidth: 1,
              borderColor: '#E5EBF2',
              backgroundColor: '#FFFFFF',
              paddingHorizontal: 14 * s,
              paddingVertical: 12 * s,
              gap: 10 * s,
            }}
          >
            {[
              { label: t('rideComplete.tripFare', 'Trip fare'), value: d.tripFare },
              { label: t('rideComplete.serviceFee', 'Service fee'), value: d.serviceFee },
              { label: t('history.promo', 'Promo'), value: -d.promoDiscount },
            ].map((row) => (
              <View
                key={row.label}
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{ flex: 1, color: '#6B7380', fontSize: 13 * s, textAlign }}
                >
                  {row.label}
                </Text>
                <Text style={{ color: '#111111', fontSize: 13 * s, fontWeight: '600' }}>
                  {row.value < 0 ? '−' : ''}
                  {d.currency} {Math.abs(row.value).toFixed(2)}
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
                  fontSize: 15 * s,
                  fontWeight: '700',
                  textAlign,
                }}
              >
                {t('rideComplete.total', 'Total')}
              </Text>
              <Text style={{ color: '#111111', fontSize: 17 * s, fontWeight: '700' }}>
                {d.currency} {d.total.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom action buttons */}
      <SafeAreaView
        edges={['bottom']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF' }}
      >
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            gap: 10 * s,
            paddingHorizontal: 20 * s,
            paddingTop: 12 * s,
            paddingBottom: 8 * s,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(main)/(drawer)/support' as any)}
            style={{
              flex: 1,
              height: 48 * s,
              borderRadius: 14 * s,
              borderWidth: 1,
              borderColor: '#E5EBF2',
              backgroundColor: '#F5F7FC',
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8 * s,
            }}
          >
            <Ionicons name="help-circle-outline" size={20 * s} color="#101969" />
            <Text style={{ color: '#111111', fontSize: 15 * s, fontWeight: '600' }}>
              {t('history.getHelp', 'Get help')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/(main)/(drawer)' as any)}
            style={{
              flex: 1,
              height: 48 * s,
              borderRadius: 14 * s,
              backgroundColor: '#101969',
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8 * s,
            }}
          >
            <Ionicons name="repeat" size={20 * s} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 15 * s, fontWeight: '600' }}>
              {t('history.rebook', 'Rebook')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
