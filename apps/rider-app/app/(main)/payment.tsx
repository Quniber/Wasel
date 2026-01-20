import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PaymentWebView from '@/components/PaymentWebView';
import { useThemeStore } from '@/stores/theme-store';
import { useBookingStore } from '@/stores/booking-store';
import { socketService } from '@/lib/socket';
import { getColors } from '@/constants/Colors';

export default function PaymentScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    payUrl: string;
    orderId: string;
    amount: string;
  }>();
  const { resolvedTheme } = useThemeStore();
  const { activeOrder, resetBooking } = useBookingStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'processing' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const payUrl = params.payUrl;
  const orderId = params.orderId || activeOrder?.id?.toString();
  const amount = params.amount;

  useEffect(() => {
    // Listen for payment completion via socket
    const completedUnsub = socketService.on('order:completed', (data) => {
      console.log('[Payment] Order completed via socket:', data);
      setPaymentStatus('success');
    });

    const paymentSuccessUnsub = socketService.on('order:payment_success', (data) => {
      console.log('[Payment] Payment success via socket:', data);
      setPaymentStatus('success');
    });

    return () => {
      completedUnsub?.();
      paymentSuccessUnsub?.();
    };
  }, []);

  useEffect(() => {
    // Auto-redirect after success
    if (paymentStatus === 'success') {
      const timer = setTimeout(() => {
        router.replace('/(main)/ride-complete');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [paymentStatus]);

  const handlePaymentSuccess = () => {
    console.log('[Payment] WebView reported success');
    setPaymentStatus('processing');

    // Wait for socket confirmation or timeout
    setTimeout(() => {
      if (paymentStatus !== 'success') {
        // If no socket confirmation, assume success and navigate
        setPaymentStatus('success');
      }
    }, 3000);
  };

  const handlePaymentCancel = () => {
    console.log('[Payment] Payment cancelled by user');
    Alert.alert(
      t('payment.cancelled.title', { defaultValue: 'Payment Cancelled' }),
      t('payment.cancelled.message', { defaultValue: 'Would you like to try again or cancel the ride?' }),
      [
        {
          text: t('payment.tryAgain', { defaultValue: 'Try Again' }),
          onPress: () => {
            setPaymentStatus('loading');
          },
        },
        {
          text: t('common.cancel'),
          style: 'destructive',
          onPress: () => {
            // Go back to home - order remains in WaitingForPostPay
            resetBooking();
            router.replace('/(main)');
          },
        },
      ]
    );
  };

  const handlePaymentError = (error: string) => {
    console.error('[Payment] Payment error:', error);
    setErrorMessage(error);
    setPaymentStatus('error');
  };

  const handleClose = () => {
    Alert.alert(
      t('payment.close.title', { defaultValue: 'Close Payment' }),
      t('payment.close.message', { defaultValue: 'Are you sure you want to close? Your payment may not be completed.' }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.close'),
          style: 'destructive',
          onPress: () => {
            // Go back - order remains in current state
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(main)');
            }
          },
        },
      ]
    );
  };

  // No payment URL provided
  if (!payUrl) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center p-6" style={{ backgroundColor: colors.background }}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.destructive} />
        <Text style={{ color: colors.foreground }} className="text-lg font-semibold mt-4 text-center">
          {t('payment.error.noUrl', { defaultValue: 'Payment Error' })}
        </Text>
        <Text style={{ color: colors.mutedForeground }} className="text-center mt-2">
          {t('payment.error.noUrlMessage', { defaultValue: 'No payment URL provided. Please try again.' })}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 px-6 py-3 rounded-xl bg-primary"
        >
          <Text className="text-white font-semibold">{t('common.goBack')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Processing state (after WebView success, waiting for confirmation)
  if (paymentStatus === 'processing') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center p-6" style={{ backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.foreground }} className="text-lg font-semibold mt-4 text-center">
          {t('payment.processing.title', { defaultValue: 'Processing Payment' })}
        </Text>
        <Text style={{ color: colors.mutedForeground }} className="text-center mt-2">
          {t('payment.processing.message', { defaultValue: 'Please wait while we confirm your payment...' })}
        </Text>
      </SafeAreaView>
    );
  }

  // Success state
  if (paymentStatus === 'success') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center p-6" style={{ backgroundColor: colors.background }}>
        <View className="w-20 h-20 rounded-full bg-primary/20 items-center justify-center">
          <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
        </View>
        <Text style={{ color: colors.foreground }} className="text-xl font-semibold mt-4 text-center">
          {t('payment.success.title', { defaultValue: 'Payment Successful!' })}
        </Text>
        {amount && (
          <Text style={{ color: colors.mutedForeground }} className="text-lg mt-2">
            {amount} QAR
          </Text>
        )}
        <Text style={{ color: colors.mutedForeground }} className="text-center mt-2">
          {t('payment.success.message', { defaultValue: 'Redirecting...' })}
        </Text>
      </SafeAreaView>
    );
  }

  // Error state
  if (paymentStatus === 'error') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center p-6" style={{ backgroundColor: colors.background }}>
        <Ionicons name="close-circle-outline" size={64} color={colors.destructive} />
        <Text style={{ color: colors.foreground }} className="text-lg font-semibold mt-4 text-center">
          {t('payment.error.title', { defaultValue: 'Payment Failed' })}
        </Text>
        <Text style={{ color: colors.mutedForeground }} className="text-center mt-2">
          {errorMessage || t('payment.error.message', { defaultValue: 'Something went wrong. Please try again.' })}
        </Text>
        <View className="flex-row gap-3 mt-6">
          <TouchableOpacity
            onPress={() => setPaymentStatus('loading')}
            className="px-6 py-3 rounded-xl bg-primary"
          >
            <Text className="text-white font-semibold">{t('common.retry')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            className="px-6 py-3 rounded-xl"
            style={{ backgroundColor: colors.muted }}
          >
            <Text style={{ color: colors.foreground }} className="font-semibold">{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main WebView payment view
  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <SafeAreaView edges={['top']}>
        <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.border }}>
          <TouchableOpacity onPress={handleClose} className="p-2">
            <Ionicons name="close" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View className="items-center">
            <Text style={{ color: colors.foreground }} className="text-lg font-semibold">
              {t('payment.title', { defaultValue: 'Complete Payment' })}
            </Text>
            {amount && (
              <Text style={{ color: colors.mutedForeground }} className="text-sm">
                {amount} QAR
              </Text>
            )}
          </View>
          <View className="w-10" />
        </View>
      </SafeAreaView>

      {/* Payment WebView */}
      <PaymentWebView
        payUrl={payUrl}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
        onError={handlePaymentError}
      />

      {/* Secure payment badge */}
      <SafeAreaView edges={['bottom']}>
        <View className="flex-row items-center justify-center py-3 px-4" style={{ borderTopWidth: 1, borderColor: colors.border }}>
          <Ionicons name="lock-closed" size={16} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground }} className="text-xs ml-2">
            {t('payment.securePayment', { defaultValue: 'Secure payment powered by SkipCash' })}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
