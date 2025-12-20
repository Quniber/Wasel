import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { getColors } from '@/constants/Colors';

interface Notification {
  id: string;
  type: 'order' | 'payment' | 'document' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    // Simulated data - would come from API
    setTimeout(() => {
      setNotifications([
        {
          id: '1',
          type: 'payment',
          title: 'Payment Received',
          message: 'You received QAR 25.00 for your last trip',
          read: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'document',
          title: 'Document Approved',
          message: 'Your driver license has been verified',
          read: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '3',
          type: 'system',
          title: 'Weekly Summary',
          message: 'You completed 45 trips this week. Great job!',
          read: true,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
      setIsLoading(false);
    }, 1000);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return { icon: 'car-outline' as const, color: colors.primary };
      case 'payment':
        return { icon: 'wallet-outline' as const, color: colors.success };
      case 'document':
        return { icon: 'document-text-outline' as const, color: '#f59e0b' };
      default:
        return { icon: 'notifications-outline' as const, color: colors.mutedForeground };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const iconInfo = getNotificationIcon(item.type);
    return (
      <TouchableOpacity
        onPress={() => markAsRead(item.id)}
        className="flex-row items-start p-4 mx-4 mb-3 rounded-xl"
        style={{
          backgroundColor: item.read ? colors.card : colors.primary + '10',
          borderColor: colors.border,
          borderWidth: 1,
        }}
      >
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: iconInfo.color + '20' }}
        >
          <Ionicons name={iconInfo.icon} size={20} color={iconInfo.color} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text style={{ color: colors.foreground }} className="text-base font-medium">
              {item.title}
            </Text>
            {!item.read && (
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }} />
            )}
          </View>
          <Text style={{ color: colors.mutedForeground }} className="text-sm mt-1">
            {item.message}
          </Text>
          <Text style={{ color: colors.mutedForeground }} className="text-xs mt-2">
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.secondary }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={{ color: colors.foreground }} className="text-xl font-bold ml-4">
            {t('notifications.title')}
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
          >
            <Text style={{ color: colors.primary }} className="font-medium">
              {t('notifications.markAllRead')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="notifications-off-outline" size={64} color={colors.muted} />
          <Text style={{ color: colors.foreground }} className="text-xl font-semibold mt-4">
            {t('notifications.noNotifications')}
          </Text>
          <Text style={{ color: colors.mutedForeground }} className="text-base text-center mt-2">
            {t('notifications.noNotificationsSubtitle')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
}
