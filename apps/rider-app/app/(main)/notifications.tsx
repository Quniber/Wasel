import { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';

interface Notification {
  id: string;
  type: 'ride' | 'promo' | 'system';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'ride',
      title: t('notifications.driverAssigned'),
      message: 'Ahmed is on his way in Toyota Camry (ABC 123)',
      timestamp: '2 min ago',
      isRead: false,
    },
    {
      id: '2',
      type: 'ride',
      title: t('notifications.tripCompleted'),
      message: 'Thanks for riding with us! Your fare was $12.50',
      timestamp: 'Yesterday',
      isRead: true,
    },
    {
      id: '3',
      type: 'promo',
      title: t('notifications.newPromo'),
      message: 'Use code HOLIDAY25 for $5 off your next ride!',
      timestamp: '2 days ago',
      isRead: true,
    },
    {
      id: '4',
      type: 'system',
      title: t('notifications.appUpdate'),
      message: 'A new version of the app is available. Update now for the best experience.',
      timestamp: '1 week ago',
      isRead: true,
    },
  ]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    // Fetch notifications from API
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ride':
        return 'car';
      case 'promo':
        return 'ticket';
      case 'system':
        return 'settings';
      default:
        return 'notifications';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'ride':
        return '#4CAF50';
      case 'promo':
        return '#FFB300';
      case 'system':
        return '#2196F3';
      default:
        return '#757575';
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => markAsRead(item.id)}
      className={`mx-4 mb-3 p-4 rounded-xl ${isDark ? 'bg-card-dark' : 'bg-card'} ${
        !item.isRead ? 'border-l-4 border-primary' : ''
      }`}
    >
      <View className="flex-row">
        <View
          className={`w-10 h-10 rounded-full items-center justify-center`}
          style={{ backgroundColor: `${getIconColor(item.type)}20` }}
        >
          <Ionicons name={getIcon(item.type) as any} size={20} color={getIconColor(item.type)} />
        </View>
        <View className="flex-1 ml-3">
          <View className="flex-row items-center justify-between">
            <Text className={`font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {item.title}
            </Text>
            {!item.isRead && <View className="w-2 h-2 rounded-full bg-primary" />}
          </View>
          <Text className="text-muted-foreground text-sm mt-1" numberOfLines={2}>
            {item.message}
          </Text>
          <Text className="text-muted-foreground text-xs mt-2">{item.timestamp}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
        </TouchableOpacity>
        <Text className={`flex-1 text-xl font-semibold text-center ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
          {t('notifications.title')}
        </Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllAsRead} className="px-3">
            <Text className="text-primary text-sm font-medium">{t('notifications.markAllRead')}</Text>
          </TouchableOpacity>
        ) : (
          <View className="w-10" />
        )}
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 8 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#4CAF50" />
        }
        ListEmptyComponent={() => (
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="notifications-off" size={64} color={isDark ? '#333' : '#E0E0E0'} />
            <Text className={`text-lg font-semibold mt-4 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {t('notifications.empty')}
            </Text>
            <Text className="text-muted-foreground mt-2 text-center px-8">
              {t('notifications.emptySubtitle')}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
