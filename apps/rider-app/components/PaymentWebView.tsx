import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

const BASE_W = 393;

interface PaymentWebViewProps {
  payUrl: string;
  onSuccess: (data?: { orderId?: string; paymentId?: string }) => void;
  onCancel: () => void;
  onError?: (error: string) => void;
  successUrl?: string;
  cancelUrl?: string;
}

export default function PaymentWebView({
  payUrl,
  onSuccess,
  onCancel,
  onError,
  successUrl = 'waselrider://',
  cancelUrl,
}: PaymentWebViewProps) {
  const { width } = useWindowDimensions();
  const s = width / BASE_W;

  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const extractParams = (url: string): Record<string, string> => {
    const params: Record<string, string> = {};
    try {
      const queryString = url.split('?')[1];
      if (queryString) {
        queryString.split('&').forEach((param) => {
          const [key, value] = param.split('=');
          if (key && value) {
            params[key] = decodeURIComponent(value);
          }
        });
      }
    } catch (e) {
      console.log('[PaymentWebView] Error parsing URL params:', e);
    }
    return params;
  };

  const extractPaymentData = (url: string): { orderId?: string; paymentId?: string } => {
    const params = extractParams(url);
    const paymentId = params.paymentId || params.id;
    const orderId =
      params.orderId ||
      (params.transId?.startsWith('order_') ? params.transId.split('_')[1] : undefined);
    return { orderId, paymentId };
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    const { url } = navState;

    if (url.includes('/skipcash/return')) {
      const params = extractParams(url);
      if (params.status === 'Paid' || params.statusId === '2') {
        onSuccess(extractPaymentData(url));
      } else {
        onCancel();
      }
      return;
    }

    if (
      url.startsWith('waselrider://payment-complete') ||
      url.startsWith('waselrider://payment-success')
    ) {
      onSuccess(extractPaymentData(url));
      return;
    }

    if (
      url.startsWith('waselrider://payment-failed') ||
      url.startsWith('waselrider://payment-cancelled')
    ) {
      onCancel();
      return;
    }

    if (successUrl && url.startsWith(successUrl)) {
      onSuccess(extractPaymentData(url));
      return;
    }

    if (cancelUrl && url.startsWith(cancelUrl)) {
      onCancel();
      return;
    }
  };

  const handleShouldStartLoad = (request: { url: string }) => {
    const { url } = request;
    if (url.startsWith('waselrider://')) {
      if (url.includes('payment-complete') || url.includes('payment-success')) {
        onSuccess(extractPaymentData(url));
      } else if (url.includes('payment-failed') || url.includes('payment-cancelled')) {
        onCancel();
      }
      return false;
    }
    return true;
  };

  const handleError = (syntheticEvent: { nativeEvent: { description: string } }) => {
    const { description } = syntheticEvent.nativeEvent;
    setError(description);
    onError?.(description);
  };

  const handleRefresh = () => {
    setError(null);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24 * s,
          backgroundColor: '#FFFFFF',
        }}
      >
        <Ionicons name="alert-circle-outline" size={64 * s} color="#ED4557" />
        <Text
          style={{
            color: '#111111',
            fontSize: 18 * s,
            fontWeight: '700',
            marginTop: 16 * s,
            textAlign: 'center',
          }}
        >
          Payment Error
        </Text>
        <Text
          style={{
            color: '#6B7380',
            fontSize: 14 * s,
            textAlign: 'center',
            marginTop: 8 * s,
          }}
        >
          {error}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 * s, marginTop: 24 * s }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleRefresh}
            style={{
              paddingHorizontal: 24 * s,
              paddingVertical: 14 * s,
              borderRadius: 14 * s,
              backgroundColor: '#101969',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 15 * s, fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onCancel}
            style={{
              paddingHorizontal: 24 * s,
              paddingVertical: 14 * s,
              borderRadius: 14 * s,
              backgroundColor: '#F5F7FC',
              borderWidth: 1,
              borderColor: '#E5EBF2',
            }}
          >
            <Text style={{ color: '#111111', fontSize: 15 * s, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {isLoading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          <View
            style={{
              width: `${loadingProgress * 100}%`,
              height: 3,
              backgroundColor: '#101969',
            }}
          />
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: payUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onError={handleError}
        onLoadProgress={({ nativeEvent }) => setLoadingProgress(nativeEvent.progress)}
        onLoadEnd={() => setIsLoading(false)}
        startInLoadingState={true}
        renderLoading={() => (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFFFF',
            }}
          >
            <ActivityIndicator size="large" color="#101969" />
            <Text style={{ color: '#6B7380', fontSize: 14 * s, marginTop: 16 * s }}>
              Loading payment page...
            </Text>
          </View>
        )}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsApplePay
        originWhitelist={['https://*', 'http://*', 'waselrider://*']}
        mixedContentMode="compatibility"
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
      />

      {isLoading && loadingProgress < 0.1 && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
          }}
        >
          <ActivityIndicator size="large" color="#101969" />
          <Text style={{ color: '#6B7380', fontSize: 14 * s, marginTop: 16 * s }}>
            Connecting to payment gateway...
          </Text>
        </View>
      )}
    </View>
  );
}
