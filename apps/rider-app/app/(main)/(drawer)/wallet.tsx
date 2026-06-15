import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useThemeStore } from '@/stores/theme-store';
import { walletApi } from '@/lib/api';
import PaymentWebView from '@/components/PaymentWebView';

const PRESET_AMOUNTS = [20, 50, 100, 200];

interface WalletTransaction {
  id: number;
  type: 'credit' | 'debit';
  action: string;
  amount: number;
  description?: string;
  createdAt: string;
}

export default function WalletScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState('QAR');
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [payUrl, setPayUrl] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    try {
      const [balanceRes, txnRes] = await Promise.all([
        walletApi.getBalance(),
        walletApi.getTransactions(20, 0),
      ]);
      setBalance(balanceRes.data.balance);
      setCurrency(balanceRes.data.currency || 'QAR');
      setTransactions(txnRes.data.transactions || []);
    } catch {
      // leave previous state on transient errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const handleTopUp = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      Alert.alert(t('common.error'), t('wallet.invalidAmount'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await walletApi.createTopup(value);
      if (res.data.success && res.data.payUrl) {
        setPayUrl(res.data.payUrl);
      } else {
        Alert.alert(t('common.error'), t('wallet.topupFailed'));
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.response?.data?.message || t('wallet.topupFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPayUrl(null);
    setAmount('');
    setLoading(true);
    loadWallet();
    Alert.alert(t('wallet.topupSuccessTitle'), t('wallet.topupSuccessMessage'));
  };

  if (payUrl) {
    return (
      <PaymentWebView
        payUrl={payUrl}
        onSuccess={handlePaymentSuccess}
        onCancel={() => setPayUrl(null)}
        onError={() => {
          setPayUrl(null);
          Alert.alert(t('common.error'), t('wallet.topupFailed'));
        }}
        successUrl="waselrider://wallet-topup-complete"
        cancelUrl="waselrider://wallet-topup-failed"
      />
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4">
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          className="w-10 h-10 items-center justify-center"
        >
          <Ionicons name="menu" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
        </TouchableOpacity>
        <Text className={`flex-1 text-xl font-semibold text-center mr-10 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
          {t('wallet.title')}
        </Text>
      </View>

      <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
        {/* Balance card */}
        <View className="rounded-2xl bg-primary p-6 mt-2">
          <Text className="text-white/80 text-sm">{t('wallet.balance')}</Text>
          {loading ? (
            <ActivityIndicator color="#fff" className="mt-3 self-start" />
          ) : (
            <Text className="text-white text-4xl font-bold mt-1">
              {currency} {(balance ?? 0).toFixed(2)}
            </Text>
          )}
        </View>

        {/* Top up */}
        <Text className="text-muted-foreground text-sm font-semibold mb-2 mt-6">
          {t('wallet.topUp')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {PRESET_AMOUNTS.map((preset) => {
            const selected = amount === String(preset);
            return (
              <TouchableOpacity
                key={preset}
                onPress={() => setAmount(String(preset))}
                className={`px-5 py-3 rounded-xl ${
                  selected ? 'bg-primary' : isDark ? 'bg-card-dark' : 'bg-card'
                }`}
              >
                <Text className={selected ? 'text-white font-semibold' : isDark ? 'text-foreground-dark' : 'text-foreground'}>
                  {currency} {preset}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className={`flex-row items-center rounded-xl px-4 mt-3 ${isDark ? 'bg-card-dark' : 'bg-card'}`}>
          <Text className="text-muted-foreground mr-2">{currency}</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder={t('wallet.customAmount')}
            placeholderTextColor={isDark ? '#9CA3AF' : '#9CA3AF'}
            className={`flex-1 py-4 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}
          />
        </View>

        <TouchableOpacity
          onPress={handleTopUp}
          disabled={submitting}
          className={`rounded-xl py-4 items-center mt-4 ${submitting ? 'bg-primary/60' : 'bg-primary'}`}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">{t('wallet.topUpNow')}</Text>
          )}
        </TouchableOpacity>

        {/* Transactions */}
        <Text className="text-muted-foreground text-sm font-semibold mb-2 mt-8">
          {t('wallet.recentActivity')}
        </Text>
        <View className={`rounded-xl overflow-hidden mb-8 ${isDark ? 'bg-card-dark' : 'bg-card'}`}>
          {transactions.length === 0 ? (
            <Text className="text-muted-foreground text-center py-6">
              {t('wallet.noTransactions')}
            </Text>
          ) : (
            transactions.map((txn, index) => (
              <View
                key={txn.id}
                className={`flex-row items-center justify-between px-4 py-3 ${
                  index < transactions.length - 1 ? (isDark ? 'border-b border-border-dark' : 'border-b border-border') : ''
                }`}
              >
                <View className="flex-1 pr-3">
                  <Text className={`font-medium ${isDark ? 'text-foreground-dark' : 'text-foreground'}`} numberOfLines={1}>
                    {txn.description || txn.action.replace('_', ' ')}
                  </Text>
                  <Text className="text-muted-foreground text-xs mt-0.5">
                    {new Date(txn.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text className={txn.type === 'credit' ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                  {txn.type === 'credit' ? '+' : '-'}{currency} {txn.amount.toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
