import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { couponApi } from '@/lib/api';

interface Coupon {
  id: string;
  code: string;
  description: string;
  discount: string;
  expiresAt: string;
  isUsed: boolean;
}

export default function PromotionsScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const [isLoading, setIsLoading] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      const response = await couponApi.getAvailableCoupons();
      const availableCoupons = response.data || [];

      // Transform API data to display format
      const transformedCoupons = availableCoupons.map((coupon: any) => ({
        id: coupon.id.toString(),
        code: coupon.code,
        description: coupon.description || '',
        discount: coupon.discountType === 'percentage'
          ? `${coupon.discountValue}%`
          : `$${coupon.discountValue}`,
        expiresAt: coupon.expiryDate
          ? new Date(coupon.expiryDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })
          : 'No expiry',
        isUsed: coupon.isUsed || false,
      }));

      setCoupons(transformedCoupons);
    } catch (error) {
      console.error('Error loading coupons:', error);
      setCoupons([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyCode = async () => {
    if (!promoCode.trim()) {
      Alert.alert(t('common.error'), t('promotions.enterCode'));
      return;
    }

    setIsApplying(true);
    try {
      // Validate and add the coupon
      const response = await couponApi.validateCoupon(promoCode, '');
      const couponData = response.data;

      const existingCoupon = coupons.find(
        (c) => c.code.toLowerCase() === promoCode.toLowerCase()
      );

      if (existingCoupon) {
        Alert.alert(t('promotions.alreadyAdded'), t('promotions.alreadyAddedMessage'));
      } else {
        // Add validated coupon
        const newCoupon: Coupon = {
          id: couponData.id?.toString() || Date.now().toString(),
          code: couponData.code || promoCode.toUpperCase(),
          description: couponData.description || 'Promotional discount',
          discount: couponData.discountType === 'percentage'
            ? `${couponData.discountValue}%`
            : `$${couponData.discountValue || couponData.discount}`,
          expiresAt: couponData.expiryDate
            ? new Date(couponData.expiryDate).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })
            : 'No expiry',
          isUsed: false,
        };
        setCoupons([newCoupon, ...coupons]);
        Alert.alert(t('promotions.success'), t('promotions.codeAdded'));
      }
      setPromoCode('');
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.message || t('promotions.invalidCode'));
    } finally {
      setIsApplying(false);
    }
  };

  const renderCouponItem = ({ item }: { item: Coupon }) => (
    <View
      className={`mx-4 mb-3 rounded-xl overflow-hidden ${isDark ? 'bg-card-dark' : 'bg-card'} shadow-sm ${
        item.isUsed ? 'opacity-50' : ''
      }`}
    >
      {/* Coupon Design */}
      <View className="flex-row">
        {/* Left Side - Discount */}
        <View className="bg-primary w-24 items-center justify-center py-4">
          <Ionicons name="ticket" size={24} color="#FFFFFF" />
          <Text className="text-white font-bold text-lg mt-1">{item.discount}</Text>
        </View>

        {/* Right Side - Details */}
        <View className="flex-1 p-4">
          <View className="flex-row items-center justify-between">
            <Text className={`font-bold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {item.code}
            </Text>
            {item.isUsed && (
              <View className="bg-muted px-2 py-1 rounded">
                <Text className="text-muted-foreground text-xs">{t('promotions.used')}</Text>
              </View>
            )}
          </View>
          <Text className="text-muted-foreground text-sm mt-1">{item.description}</Text>
          <View className="flex-row items-center mt-2">
            <Ionicons name="calendar-outline" size={14} color={isDark ? '#757575' : '#9E9E9E'} />
            <Text className="text-muted-foreground text-xs ml-1">
              {t('promotions.expires')}: {item.expiresAt}
            </Text>
          </View>
        </View>
      </View>

      {/* Dotted Line */}
      <View className="flex-row items-center justify-center">
        <View className="w-4 h-4 rounded-full bg-background -ml-2" style={{ backgroundColor: isDark ? '#121212' : '#F5F5F5' }} />
        <View className={`flex-1 border-t border-dashed ${isDark ? 'border-border-dark' : 'border-border'}`} />
        <View className="w-4 h-4 rounded-full bg-background -mr-2" style={{ backgroundColor: isDark ? '#121212' : '#F5F5F5' }} />
      </View>

      {/* Terms */}
      <View className="px-4 py-2">
        <Text className="text-muted-foreground text-xs text-center">
          {t('promotions.termsApply')}
        </Text>
      </View>
    </View>
  );

  const activeCoupons = coupons.filter((c) => !c.isUsed);
  const usedCoupons = coupons.filter((c) => c.isUsed);

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
        </TouchableOpacity>
        <Text className={`flex-1 text-xl font-semibold text-center mr-10 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
          {t('promotions.title')}
        </Text>
      </View>

      {/* Promo Code Input */}
      <View className="px-4 mb-6">
        <Text className="text-muted-foreground text-sm font-semibold mb-2">
          {t('promotions.haveCode')}
        </Text>
        <View className="flex-row">
          <TextInput
            className={`flex-1 px-4 py-3 rounded-l-xl ${isDark ? 'bg-muted-dark text-foreground-dark' : 'bg-muted text-foreground'}`}
            placeholder={t('promotions.enterPromoCode')}
            placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
            value={promoCode}
            onChangeText={setPromoCode}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            onPress={handleApplyCode}
            disabled={isApplying}
            className="bg-primary px-6 rounded-r-xl items-center justify-center"
          >
            <Text className="text-white font-semibold">
              {isApplying ? '...' : t('promotions.apply')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Coupons List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <FlatList
          data={coupons}
          renderItem={renderCouponItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListHeaderComponent={() => (
            <Text className="text-muted-foreground text-sm font-semibold mx-4 mb-2">
              {t('promotions.yourCoupons')} ({activeCoupons.length} {t('promotions.active')})
            </Text>
          )}
          ListEmptyComponent={() => (
            <View className="items-center justify-center py-20 px-8">
              <Ionicons name="ticket-outline" size={64} color={isDark ? '#333' : '#E0E0E0'} />
              <Text className={`text-lg font-semibold mt-4 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                {t('promotions.empty')}
              </Text>
              <Text className="text-muted-foreground mt-2 text-center">
                {t('promotions.emptySubtitle')}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
