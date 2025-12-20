import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Vibration, Animated, Easing } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { useDriverStore } from '@/stores/driver-store';
import { getColors } from '@/constants/Colors';
import { ordersApi } from '@/lib/api';
import { socketService } from '@/lib/socket';

const TIMEOUT_SECONDS = 15;

export default function IncomingOrderScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { incomingOrder, setIncomingOrder, setActiveRide, clearIncomingOrder } = useDriverStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [timeLeft, setTimeLeft] = useState(TIMEOUT_SECONDS);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  // Vibrate on mount
  useEffect(() => {
    Vibration.vibrate([0, 500, 200, 500, 200, 500]);
  }, []);

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Progress animation
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: TIMEOUT_SECONDS * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      handleTimeout();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleTimeout = () => {
    clearIncomingOrder();
    router.back();
  };

  const handleAccept = async () => {
    if (!incomingOrder || isAccepting) return;

    setIsAccepting(true);
    try {
      const response = await ordersApi.accept(incomingOrder.id);
      socketService.acceptOrder(incomingOrder.id);

      // Set as active ride
      setActiveRide({
        id: incomingOrder.id,
        status: 'accepted',
        pickup: incomingOrder.pickup,
        dropoff: incomingOrder.dropoff,
        rider: incomingOrder.rider,
        fare: incomingOrder.estimatedFare,
        distance: incomingOrder.distance,
        paymentMethod: incomingOrder.paymentMethod,
        createdAt: new Date().toISOString(),
      });

      clearIncomingOrder();
      router.replace('/(main)/active-ride');
    } catch (error) {
      console.error('Error accepting order:', error);
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!incomingOrder || isRejecting) return;

    setIsRejecting(true);
    try {
      await ordersApi.reject(incomingOrder.id, 'driver_rejected');
      socketService.rejectOrder(incomingOrder.id, 'driver_rejected');
      clearIncomingOrder();
      router.back();
    } catch (error) {
      console.error('Error rejecting order:', error);
      setIsRejecting(false);
    }
  };

  if (!incomingOrder) {
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View className="flex-1 px-6">
        {/* Timer Circle */}
        <View className="items-center mt-8">
          <Animated.View
            style={{ transform: [{ scale: pulseAnim }] }}
            className="w-32 h-32 rounded-full items-center justify-center"
          >
            <View
              className="w-28 h-28 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-white text-4xl font-bold">{timeLeft}</Text>
              <Text className="text-white text-sm">{t('incomingOrder.seconds')}</Text>
            </View>
          </Animated.View>

          <Text style={{ color: colors.foreground }} className="text-xl font-bold mt-6">
            {t('incomingOrder.title')}
          </Text>
        </View>

        {/* Progress Bar */}
        <View className="mt-6 h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.muted }}>
          <Animated.View
            className="h-full rounded-full"
            style={{
              backgroundColor: colors.primary,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            }}
          />
        </View>

        {/* Order Details Card */}
        <View
          className="mt-8 p-5 rounded-2xl"
          style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
        >
          {/* Pickup */}
          <View className="flex-row items-start mb-4">
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: colors.success + '20' }}
            >
              <Ionicons name="location" size={20} color={colors.success} />
            </View>
            <View className="flex-1">
              <Text style={{ color: colors.mutedForeground }} className="text-xs uppercase mb-1">
                {t('incomingOrder.pickup')}
              </Text>
              <Text style={{ color: colors.foreground }} className="text-base font-medium" numberOfLines={2}>
                {incomingOrder.pickup.address}
              </Text>
            </View>
          </View>

          {/* Dotted Line */}
          <View className="ml-5 border-l-2 border-dashed h-4" style={{ borderColor: colors.border }} />

          {/* Dropoff */}
          <View className="flex-row items-start mb-4">
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: colors.destructive + '20' }}
            >
              <Ionicons name="flag" size={20} color={colors.destructive} />
            </View>
            <View className="flex-1">
              <Text style={{ color: colors.mutedForeground }} className="text-xs uppercase mb-1">
                {t('incomingOrder.dropoff')}
              </Text>
              <Text style={{ color: colors.foreground }} className="text-base font-medium" numberOfLines={2}>
                {incomingOrder.dropoff.address}
              </Text>
            </View>
          </View>

          {/* Trip Info */}
          <View
            className="flex-row justify-between pt-4 border-t"
            style={{ borderColor: colors.border }}
          >
            <View className="items-center flex-1">
              <Text style={{ color: colors.mutedForeground }} className="text-xs mb-1">
                {t('incomingOrder.distance')}
              </Text>
              <Text style={{ color: colors.foreground }} className="text-lg font-bold">
                {incomingOrder.distance.toFixed(1)} km
              </Text>
            </View>
            <View className="items-center flex-1 border-l border-r" style={{ borderColor: colors.border }}>
              <Text style={{ color: colors.mutedForeground }} className="text-xs mb-1">
                {t('incomingOrder.fare')}
              </Text>
              <Text style={{ color: colors.success }} className="text-lg font-bold">
                QAR {incomingOrder.estimatedFare.toFixed(0)}
              </Text>
            </View>
            <View className="items-center flex-1">
              <Text style={{ color: colors.mutedForeground }} className="text-xs mb-1">
                {t('incomingOrder.payment')}
              </Text>
              <View className="flex-row items-center">
                <Ionicons
                  name={incomingOrder.paymentMethod === 'cash' ? 'cash-outline' : 'card-outline'}
                  size={16}
                  color={colors.foreground}
                />
                <Text style={{ color: colors.foreground }} className="text-base font-medium ml-1">
                  {incomingOrder.paymentMethod === 'cash' ? t('payment.cash') : t('payment.card')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Rider Info */}
        {incomingOrder.rider && (
          <View
            className="mt-4 p-4 rounded-xl flex-row items-center"
            style={{ backgroundColor: colors.secondary }}
          >
            <View
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.muted }}
            >
              <Ionicons name="person" size={24} color={colors.mutedForeground} />
            </View>
            <View className="ml-3 flex-1">
              <Text style={{ color: colors.foreground }} className="text-base font-medium">
                {incomingOrder.rider.name}
              </Text>
              <View className="flex-row items-center mt-1">
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={{ color: colors.mutedForeground }} className="ml-1 text-sm">
                  {incomingOrder.rider.rating?.toFixed(1) || '5.0'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View className="flex-1 justify-end pb-6">
          <View className="flex-row gap-4">
            <TouchableOpacity
              onPress={handleReject}
              disabled={isRejecting || isAccepting}
              className="flex-1 py-4 rounded-xl items-center flex-row justify-center"
              style={{ backgroundColor: colors.destructive + '15', borderColor: colors.destructive, borderWidth: 2 }}
            >
              <Ionicons name="close" size={24} color={colors.destructive} />
              <Text style={{ color: colors.destructive }} className="text-lg font-semibold ml-2">
                {t('incomingOrder.reject')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleAccept}
              disabled={isAccepting || isRejecting}
              className="flex-1 py-4 rounded-xl items-center flex-row justify-center"
              style={{ backgroundColor: colors.success }}
            >
              <Ionicons name="checkmark" size={24} color="#fff" />
              <Text className="text-white text-lg font-semibold ml-2">
                {isAccepting ? t('common.loading') : t('incomingOrder.accept')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
