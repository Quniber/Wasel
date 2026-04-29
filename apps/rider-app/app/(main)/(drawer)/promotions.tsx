import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { couponApi } from '@/lib/api';
import ScreenHeader from '@/components/ScreenHeader';
import AlertModal from '@/components/AlertModal';

const BASE_W = 393;

interface Promo {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed' | string;
  discountValue: number;
  expiresAt?: string;
  isRecurring?: boolean;
}

const palette = (idx: number) => {
  // Cycle through 3 colored badges from Figma
  const choices = [
    { bg: '#FFEBC7', fg: '#F28C0D' },
    { bg: '#DBF5E3', fg: '#33BF73' },
    { bg: '#EDE8FF', fg: '#101969' },
  ];
  return choices[idx % choices.length];
};

const formatExpiry = (iso?: string) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

export default function PromotionsScreen() {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;
  const isRTL = i18n.language === 'ar';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{ variant: 'success' | 'error'; title: string; msg: string } | null>(
    null
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await couponApi.getAvailableCoupons();
        const arr = (res.data || []).map((c: any, i: number) => ({
          id: c.id?.toString() || String(i),
          code: c.code || '',
          title: c.title || c.code || 'Promo',
          description: c.description || '',
          discountType: c.discountType || 'fixed',
          discountValue: Number(c.discountValue) || 0,
          expiresAt: c.expiresAt,
          isRecurring: !!c.isRecurring,
        }));
        setPromos(arr);
      } catch {
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleApply = async () => {
    const target = code.trim().toUpperCase();
    if (!target) return;
    setApplying(true);
    try {
      await couponApi.validateCoupon(target);
      setAlert({
        variant: 'success',
        title: t('booking.coupon.applied', 'Coupon applied'),
        msg: t('promotions.appliedMsg', `${target} is now active for your next ride.`).replace(
          '${target}',
          target
        ),
      });
      setCode('');
    } catch (err: any) {
      setAlert({
        variant: 'error',
        title: t('common.error', 'Error'),
        msg: err.response?.data?.message || t('booking.coupon.invalid', 'Invalid or expired coupon'),
      });
    } finally {
      setApplying(false);
    }
  };

  const useNow = (c: Promo) => {
    setCode(c.code);
    router.push('/(main)/(drawer)' as any);
  };

  const badgeText = (c: Promo) => {
    if (c.discountType === 'percentage') return `${c.discountValue}%`;
    return `QAR ${c.discountValue}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <ScreenHeader title={t('promotions.title', 'Promotions')} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 * s }}>
        {/* Promo input + Apply */}
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 10 * s,
            paddingHorizontal: 20 * s,
            paddingTop: 8 * s,
          }}
        >
          <View
            style={{
              flex: 1,
              height: 56 * s,
              paddingHorizontal: 16 * s,
              borderRadius: 14 * s,
              borderWidth: 1,
              borderColor: '#E5EBF2',
              backgroundColor: '#F5F7FC',
              justifyContent: 'center',
            }}
          >
            <TextInput
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              placeholder={t('booking.coupon.enter', 'Enter promo code')}
              placeholderTextColor="#6B7380"
              autoCapitalize="characters"
              autoCorrect={false}
              style={{
                fontSize: 14 * s,
                fontWeight: '600',
                color: '#111111',
                padding: 0,
                textAlign,
              }}
            />
          </View>
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={!code.trim() || applying}
            onPress={handleApply}
            style={{
              width: 86 * s,
              height: 56 * s,
              borderRadius: 14 * s,
              backgroundColor: code.trim() && !applying ? '#101969' : '#C7CDD8',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {applying ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 14 * s, fontWeight: '600' }}>
                {t('booking.coupon.apply', 'Apply')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Section header */}
        <Text
          style={{
            marginTop: 20 * s,
            marginHorizontal: 20 * s,
            color: '#6B7380',
            fontSize: 11 * s,
            fontWeight: '600',
            letterSpacing: 1.2,
            textAlign,
          }}
        >
          {t('promotions.available', 'AVAILABLE OFFERS')}
        </Text>

        {/* Cards */}
        <View style={{ marginTop: 12 * s, paddingHorizontal: 20 * s, gap: 12 * s }}>
          {isLoading ? (
            <View style={{ paddingVertical: 24 * s, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#101969" />
            </View>
          ) : promos.length === 0 ? (
            <Text
              style={{ color: '#6B7380', fontSize: 14 * s, paddingVertical: 24 * s, textAlign }}
            >
              {t('booking.coupon.empty', 'No coupons available right now.')}
            </Text>
          ) : (
            promos.map((p, i) => {
              const c = palette(i);
              return (
                <View
                  key={p.id}
                  style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'stretch',
                    height: 110 * s,
                    borderRadius: 16 * s,
                    borderWidth: 1,
                    borderColor: '#E5EBF2',
                    backgroundColor: '#FFFFFF',
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: 110 * s,
                      backgroundColor: c.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4 * s,
                    }}
                  >
                    <Text
                      style={{
                        color: c.fg,
                        fontSize: badgeText(p).length > 4 ? 18 * s : 26 * s,
                        fontWeight: '700',
                        letterSpacing: -0.6,
                      }}
                    >
                      {badgeText(p)}
                    </Text>
                    <Text
                      style={{
                        color: c.fg,
                        fontSize: 12 * s,
                        fontWeight: '600',
                        letterSpacing: 1,
                      }}
                    >
                      OFF
                    </Text>
                  </View>
                  <View
                    style={{
                      flex: 1,
                      paddingTop: 14 * s,
                      paddingBottom: 12 * s,
                      paddingHorizontal: 14 * s,
                      gap: 4 * s,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        color: '#111111',
                        fontSize: 15 * s,
                        fontWeight: '700',
                        textAlign,
                      }}
                    >
                      {p.title}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: '#6B7380',
                        fontSize: 12 * s,
                        lineHeight: 17 * s,
                        textAlign,
                      }}
                    >
                      {p.description}
                    </Text>
                    <View
                      style={{
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                        alignItems: 'center',
                        marginTop: 'auto',
                      }}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          flex: 1,
                          color: '#6B7380',
                          fontSize: 11 * s,
                          fontWeight: '500',
                          textAlign,
                        }}
                      >
                        {p.isRecurring
                          ? t('promotions.recurring', 'Recurring · No expiry')
                          : p.expiresAt
                          ? `${t('booking.coupon.expires', 'Expires')} ${formatExpiry(p.expiresAt)}`
                          : ''}
                      </Text>
                      <TouchableOpacity activeOpacity={0.7} hitSlop={6} onPress={() => useNow(p)}>
                        <Text style={{ color: '#101969', fontSize: 12 * s, fontWeight: '600' }}>
                          {t('promotions.useNow', 'Use now')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <AlertModal
        visible={!!alert}
        variant={alert?.variant || 'info'}
        title={alert?.title || ''}
        message={alert?.msg}
        primaryLabel={t('common.ok', 'OK')}
        onPrimaryPress={() => setAlert(null)}
        onRequestClose={() => setAlert(null)}
      />
    </SafeAreaView>
  );
}
