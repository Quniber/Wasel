import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PaymentWebView from '@/components/PaymentWebView';
import AlertModal from '@/components/AlertModal';
import { useBookingStore } from '@/stores/booking-store';
import { socketService } from '@/lib/socket';

const BASE_W = 393;

export default function PaymentScreen() {
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{
    payUrl: string;
    orderId: string;
    amount: string;
    isPrePay: string;
    serviceId: string;
  }>();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;
  const isRTL = i18n.language === 'ar';

  const { activeOrder, resetBooking, pickup, dropoff, selectedService, setActiveOrder } =
    useBookingStore();
  const isPrePay = params.isPrePay === 'true';

  const [paymentStatus, setPaymentStatus] = useState<
    'loading' | 'processing' | 'success' | 'error'
  >('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prePayOrderId, setPrePayOrderId] = useState<string | null>(null);
  const [cancelModal, setCancelModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);

  const payUrl = params.payUrl;
  const amount = params.amount;

  useEffect(() => {
    const completedUnsub = socketService.on('order:completed', () => {
      setPaymentStatus('success');
    });
    const paymentSuccessUnsub = socketService.on('order:payment_success', () => {
      setPaymentStatus('success');
    });
    return () => {
      completedUnsub?.();
      paymentSuccessUnsub?.();
    };
  }, []);

  useEffect(() => {
    if (paymentStatus === 'success') {
      const timer = setTimeout(() => {
        if (isPrePay) {
          if (prePayOrderId && pickup && dropoff && selectedService) {
            setActiveOrder({
              id: prePayOrderId,
              status: 'Requested',
              pickup,
              dropoff,
              service: selectedService,
              fare: parseFloat(params.amount || '0'),
              driver: null,
              createdAt: new Date().toISOString(),
            });
          }
          router.replace('/(main)/finding-driver');
        } else {
          router.replace('/(main)/ride-complete');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [paymentStatus, isPrePay, prePayOrderId, pickup, dropoff, selectedService]);

  const handlePaymentSuccess = (data?: { orderId?: string; paymentId?: string }) => {
    setPaymentStatus('processing');
    if (isPrePay && data?.orderId) {
      setPrePayOrderId(data.orderId);
    }
    setTimeout(() => {
      setPaymentStatus((prev) => (prev !== 'success' ? 'success' : prev));
    }, 3000);
  };

  const handlePaymentCancel = () => setCancelModal(true);

  const handlePaymentError = (error: string) => {
    setErrorMessage(error);
    setPaymentStatus('error');
  };

  const handleClose = () => setCloseModal(true);

  // Centered status view (loading/processing/success/error)
  const StatusView = ({
    icon,
    iconColor,
    iconBg,
    title,
    message,
    actions,
    activity,
  }: {
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    iconBg?: string;
    title: string;
    message?: string;
    actions?: React.ReactNode;
    activity?: boolean;
  }) => (
    <SafeAreaView
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24 * s,
        backgroundColor: '#FFFFFF',
      }}
      edges={['top', 'bottom']}
    >
      {activity ? (
        <ActivityIndicator size="large" color="#101969" />
      ) : icon ? (
        <View
          style={{
            width: 88 * s,
            height: 88 * s,
            borderRadius: 44 * s,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: iconBg || '#F5F7FC',
          }}
        >
          <Ionicons name={icon} size={48 * s} color={iconColor || '#101969'} />
        </View>
      ) : null}

      <Text
        style={{
          marginTop: 18 * s,
          color: '#111111',
          fontSize: 20 * s,
          fontWeight: '700',
          textAlign: 'center',
        }}
      >
        {title}
      </Text>

      {!!amount && (title === t('payment.success.title', 'Payment Successful!') || false) && (
        <Text style={{ color: '#101969', fontSize: 18 * s, fontWeight: '700', marginTop: 8 * s }}>
          {amount} QAR
        </Text>
      )}

      {!!message && (
        <Text
          style={{
            color: '#6B7380',
            fontSize: 14 * s,
            textAlign: 'center',
            marginTop: 8 * s,
            paddingHorizontal: 16 * s,
          }}
        >
          {message}
        </Text>
      )}

      {actions && <View style={{ marginTop: 24 * s, width: '100%' }}>{actions}</View>}
    </SafeAreaView>
  );

  if (!payUrl) {
    return (
      <StatusView
        icon="alert-circle-outline"
        iconColor="#ED4557"
        iconBg="#FFEBED"
        title={t('payment.error.noUrl', 'Payment Error')}
        message={t('payment.error.noUrlMessage', 'No payment URL provided. Please try again.')}
        actions={
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.back()}
            style={{
              height: 56 * s,
              borderRadius: 14 * s,
              backgroundColor: '#101969',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16 * s, fontWeight: '600' }}>
              {t('common.goBack', 'Go back')}
            </Text>
          </TouchableOpacity>
        }
      />
    );
  }

  if (paymentStatus === 'processing') {
    return (
      <StatusView
        activity
        title={t('payment.processing.title', 'Processing Payment')}
        message={t('payment.processing.message', 'Please wait while we confirm your payment...')}
      />
    );
  }

  if (paymentStatus === 'success') {
    return (
      <StatusView
        icon="checkmark-circle"
        iconColor="#33BF73"
        iconBg="#DBF5E3"
        title={t('payment.success.title', 'Payment Successful!')}
        message={t('payment.success.message', 'Redirecting...')}
      />
    );
  }

  if (paymentStatus === 'error') {
    return (
      <StatusView
        icon="close-circle-outline"
        iconColor="#ED4557"
        iconBg="#FFEBED"
        title={t('payment.error.title', 'Payment Failed')}
        message={errorMessage || t('payment.error.message', 'Something went wrong. Please try again.')}
        actions={
          <View style={{ flexDirection: 'row', gap: 12 * s }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setPaymentStatus('loading')}
              style={{
                flex: 1,
                height: 56 * s,
                borderRadius: 14 * s,
                backgroundColor: '#101969',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16 * s, fontWeight: '600' }}>
                {t('common.retry', 'Retry')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.back()}
              style={{
                flex: 1,
                height: 56 * s,
                borderRadius: 14 * s,
                backgroundColor: '#F5F7FC',
                borderWidth: 1,
                borderColor: '#E5EBF2',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#111111', fontSize: 16 * s, fontWeight: '600' }}>
                {t('common.cancel', 'Cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <SafeAreaView edges={['top']}>
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            paddingHorizontal: 16 * s,
            paddingVertical: 12 * s,
            borderBottomWidth: 1,
            borderBottomColor: '#E5EBF2',
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleClose}
            style={{
              width: 40 * s,
              height: 40 * s,
              borderRadius: 12 * s,
              backgroundColor: '#F5F7FC',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={20 * s} color="#111111" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: '#111111', fontSize: 16 * s, fontWeight: '700' }}>
              {t('payment.title', 'Complete Payment')}
            </Text>
            {!!amount && (
              <Text
                style={{
                  color: '#6B7380',
                  fontSize: 13 * s,
                  fontWeight: '500',
                  marginTop: 2 * s,
                }}
              >
                {amount} QAR
              </Text>
            )}
          </View>
          <View style={{ width: 40 * s }} />
        </View>
      </SafeAreaView>

      <PaymentWebView
        payUrl={payUrl}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
        onError={handlePaymentError}
      />

      <SafeAreaView edges={['bottom']}>
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6 * s,
            paddingVertical: 12 * s,
            paddingHorizontal: 16 * s,
            borderTopWidth: 1,
            borderTopColor: '#E5EBF2',
          }}
        >
          <Ionicons name="lock-closed" size={14 * s} color="#6B7380" />
          <Text style={{ color: '#6B7380', fontSize: 12 * s, fontWeight: '500' }}>
            {t('payment.securePayment', 'Secure payment powered by SkipCash')}
          </Text>
        </View>
      </SafeAreaView>

      <AlertModal
        visible={cancelModal}
        variant="warning"
        title={t('payment.cancelled.title', 'Payment Cancelled')}
        message={t('payment.cancelled.message', 'Would you like to try again or cancel the ride?')}
        primaryLabel={t('payment.tryAgain', 'Try Again')}
        secondaryLabel={t('common.cancel', 'Cancel')}
        onPrimaryPress={() => {
          setCancelModal(false);
          setPaymentStatus('loading');
        }}
        onSecondaryPress={() => {
          setCancelModal(false);
          resetBooking();
          router.replace('/(main)');
        }}
        onRequestClose={() => setCancelModal(false)}
      />

      <AlertModal
        visible={closeModal}
        variant="warning"
        title={t('payment.close.title', 'Close Payment')}
        message={t(
          'payment.close.message',
          'Are you sure you want to close? Your payment may not be completed.'
        )}
        primaryLabel={t('common.close', 'Close')}
        secondaryLabel={t('common.cancel', 'Cancel')}
        primaryColor="#ED4557"
        onPrimaryPress={() => {
          setCloseModal(false);
          if (router.canGoBack()) router.back();
          else router.replace('/(main)');
        }}
        onSecondaryPress={() => setCloseModal(false)}
        onRequestClose={() => setCloseModal(false)}
      />
    </View>
  );
}
