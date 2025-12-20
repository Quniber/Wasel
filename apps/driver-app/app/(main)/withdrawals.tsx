import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { useDriverStore } from '@/stores/driver-store';
import { getColors } from '@/constants/Colors';
import { walletApi } from '@/lib/api';

interface Withdrawal {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
  bankName?: string;
}

export default function WithdrawalsScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { balance, setBalance } = useDriverStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    setIsLoading(true);
    try {
      const [balanceRes, historyRes] = await Promise.all([
        walletApi.getBalance(),
        walletApi.getPayouts(),
      ]);
      setBalance(balanceRes.data.balance || 0);
      setWithdrawals(historyRes.data?.payouts || historyRes.data || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Alert.alert(t('errors.validationError'), t('withdrawals.invalidAmount'));
      return;
    }
    if (numAmount > balance) {
      Alert.alert(t('errors.validationError'), t('withdrawals.insufficientBalance'));
      return;
    }
    if (!bankName || !accountNumber || !iban) {
      Alert.alert(t('errors.validationError'), t('errors.fillAllFields'));
      return;
    }

    setIsSubmitting(true);
    try {
      // Format bank info as a string for the API
      const bankInfo = `${bankName} | ${accountNumber} | ${iban}`;
      await walletApi.requestWithdrawal(numAmount, bankInfo);
      setShowModal(false);
      setAmount('');
      setBankName('');
      setAccountNumber('');
      setIban('');
      fetchWithdrawals();
      Alert.alert(t('withdrawals.success'), t('withdrawals.successMessage'));
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      Alert.alert(t('errors.withdrawalFailed'), t('errors.tryAgain'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: colors.success, label: t('withdrawals.completed') };
      case 'pending':
        return { color: '#f59e0b', label: t('withdrawals.pending') };
      case 'rejected':
        return { color: colors.destructive, label: t('withdrawals.rejected') };
      default:
        return { color: colors.mutedForeground, label: status };
    }
  };

  const quickAmounts = [100, 200, 500, 1000];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.secondary }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ color: colors.foreground }} className="text-xl font-bold ml-4">
          {t('withdrawals.title')}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {/* Balance Card */}
          <View
            className="p-6 rounded-2xl items-center"
            style={{ backgroundColor: colors.primary + '15' }}
          >
            <Text style={{ color: colors.mutedForeground }} className="text-sm uppercase">
              {t('withdrawals.availableBalance')}
            </Text>
            <Text style={{ color: colors.foreground }} className="text-4xl font-bold mt-2">
              QAR {balance.toFixed(0)}
            </Text>
            <TouchableOpacity
              onPress={() => setShowModal(true)}
              disabled={balance <= 0}
              className="mt-4 px-8 py-3 rounded-xl"
              style={{ backgroundColor: balance > 0 ? colors.primary : colors.muted }}
            >
              <Text
                style={{ color: balance > 0 ? colors.primaryForeground : colors.mutedForeground }}
                className="font-semibold"
              >
                {t('withdrawals.requestWithdrawal')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* History */}
          <View className="mt-8">
            <Text style={{ color: colors.foreground }} className="text-lg font-semibold mb-4">
              {t('withdrawals.history')}
            </Text>

            {withdrawals.length === 0 ? (
              <View className="items-center py-8">
                <Ionicons name="wallet-outline" size={48} color={colors.muted} />
                <Text style={{ color: colors.mutedForeground }} className="mt-2">
                  {t('withdrawals.noHistory')}
                </Text>
              </View>
            ) : (
              withdrawals.map((withdrawal) => {
                const statusInfo = getStatusInfo(withdrawal.status);
                return (
                  <View
                    key={withdrawal.id}
                    className="flex-row items-center justify-between p-4 rounded-xl mb-3"
                    style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
                  >
                    <View className="flex-row items-center">
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: statusInfo.color + '20' }}
                      >
                        <Ionicons name="arrow-up-outline" size={20} color={statusInfo.color} />
                      </View>
                      <View>
                        <Text style={{ color: colors.foreground }} className="text-base font-medium">
                          QAR {withdrawal.amount.toFixed(0)}
                        </Text>
                        <Text style={{ color: colors.mutedForeground }} className="text-xs">
                          {new Date(withdrawal.createdAt).toLocaleDateString('en', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                    </View>
                    <View
                      className="px-3 py-1 rounded-full"
                      style={{ backgroundColor: statusInfo.color + '20' }}
                    >
                      <Text style={{ color: statusInfo.color }} className="text-xs font-medium">
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {/* Withdrawal Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="rounded-t-3xl p-6" style={{ backgroundColor: colors.background }}>
            <View className="flex-row items-center justify-between mb-6">
              <Text style={{ color: colors.foreground }} className="text-xl font-bold">
                {t('withdrawals.requestWithdrawal')}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <View className="mb-4">
              <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
                {t('withdrawals.amount')}
              </Text>
              <View
                className="flex-row items-center rounded-xl px-4"
                style={{ backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 }}
              >
                <Text style={{ color: colors.mutedForeground }} className="text-lg mr-2">QAR</Text>
                <TextInput
                  style={{ color: colors.foreground }}
                  className="flex-1 py-3 text-lg"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              <View className="flex-row gap-2 mt-2">
                {quickAmounts.map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    onPress={() => setAmount(amt.toString())}
                    className="flex-1 py-2 rounded-lg items-center"
                    style={{ backgroundColor: colors.muted }}
                  >
                    <Text style={{ color: colors.foreground }} className="text-sm">
                      {amt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Bank Details */}
            <View className="mb-4">
              <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
                {t('withdrawals.bankName')}
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  borderWidth: 1,
                  color: colors.foreground,
                }}
                className="px-4 py-3 rounded-xl text-base"
                value={bankName}
                onChangeText={setBankName}
                placeholder="Qatar National Bank"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View className="mb-4">
              <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
                {t('withdrawals.accountNumber')}
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  borderWidth: 1,
                  color: colors.foreground,
                }}
                className="px-4 py-3 rounded-xl text-base"
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="number-pad"
                placeholder="123456789"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View className="mb-6">
              <Text style={{ color: colors.foreground }} className="mb-2 font-medium">
                {t('withdrawals.iban')}
              </Text>
              <TextInput
                style={{
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  borderWidth: 1,
                  color: colors.foreground,
                }}
                className="px-4 py-3 rounded-xl text-base"
                value={iban}
                onChangeText={setIban}
                autoCapitalize="characters"
                placeholder="QA00..."
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="py-4 rounded-xl items-center"
              style={{ backgroundColor: colors.primary }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-lg font-semibold">{t('withdrawals.submit')}</Text>
              )}
            </TouchableOpacity>

            <View className="h-8" />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
