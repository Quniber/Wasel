import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { getColors } from '@/constants/Colors';

interface PaymentWebViewProps {
  payUrl: string;
  onSuccess: () => void;
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
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    const { url } = navState;
    console.log('[PaymentWebView] Navigation:', url);

    // Check for success redirect (app deep link or return URL)
    if (url.startsWith('waselrider://payment-complete') || url.includes('/skipcash/return')) {
      console.log('[PaymentWebView] Payment success detected');
      onSuccess();
      return;
    }

    // Check for cancel/failure redirect
    if (url.startsWith('waselrider://payment-failed') || url.startsWith('waselrider://payment-cancelled')) {
      console.log('[PaymentWebView] Payment cancelled/failed');
      onCancel();
      return;
    }

    // Check for custom success URL
    if (successUrl && url.startsWith(successUrl)) {
      onSuccess();
      return;
    }

    // Check for custom cancel URL
    if (cancelUrl && url.startsWith(cancelUrl)) {
      onCancel();
      return;
    }
  };

  const handleShouldStartLoad = (request: { url: string }) => {
    const { url } = request;

    // Handle deep links - don't load them in WebView, trigger callbacks instead
    if (url.startsWith('waselrider://')) {
      if (url.includes('payment-complete')) {
        onSuccess();
      } else if (url.includes('payment-failed') || url.includes('payment-cancelled')) {
        onCancel();
      }
      return false; // Don't load deep links in WebView
    }

    return true; // Allow all other URLs
  };

  const handleError = (syntheticEvent: { nativeEvent: { description: string } }) => {
    const { description } = syntheticEvent.nativeEvent;
    console.error('[PaymentWebView] Error:', description);
    setError(description);
    onError?.(description);
  };

  const handleLoadProgress = ({ nativeEvent }: { nativeEvent: { progress: number } }) => {
    setLoadingProgress(nativeEvent.progress);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleRefresh = () => {
    setError(null);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: colors.background }}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.destructive} />
        <Text style={{ color: colors.foreground }} className="text-lg font-semibold mt-4 text-center">
          Payment Error
        </Text>
        <Text style={{ color: colors.mutedForeground }} className="text-center mt-2">
          {error}
        </Text>
        <View className="flex-row gap-3 mt-6">
          <TouchableOpacity
            onPress={handleRefresh}
            className="px-6 py-3 rounded-xl bg-primary"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onCancel}
            className="px-6 py-3 rounded-xl"
            style={{ backgroundColor: colors.muted }}
          >
            <Text style={{ color: colors.foreground }} className="font-semibold">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Loading indicator */}
      {isLoading && (
        <View className="absolute top-0 left-0 right-0 z-10">
          <View
            style={{
              width: `${loadingProgress * 100}%`,
              height: 3,
              backgroundColor: colors.primary
            }}
          />
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: payUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onError={handleError}
        onLoadProgress={handleLoadProgress}
        onLoadEnd={handleLoadEnd}
        startInLoadingState={true}
        renderLoading={() => (
          <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: colors.background }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.mutedForeground }} className="mt-4">
              Loading payment page...
            </Text>
          </View>
        )}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        // Enable Apple Pay support
        allowsApplePay={true}
        // Security settings
        originWhitelist={['https://*', 'http://*', 'waselrider://*']}
        mixedContentMode="compatibility"
        // iOS specific
        allowsBackForwardNavigationGestures={true}
        // Android specific
        setSupportMultipleWindows={false}
      />

      {/* Loading overlay for initial load */}
      {isLoading && loadingProgress < 0.1 && (
        <View
          className="absolute inset-0 items-center justify-center"
          style={{ backgroundColor: colors.background }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.mutedForeground }} className="mt-4">
            Connecting to payment gateway...
          </Text>
        </View>
      )}
    </View>
  );
}
