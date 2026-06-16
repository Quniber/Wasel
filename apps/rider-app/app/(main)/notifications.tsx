import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { notificationApi } from '@/lib/api';

const BASE_W = 393;

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: Date;
  isRead: boolean;
}

interface Section {
  title: string;
  data: Notification[];
}

// Maps a notification type to a Figma-style badge (icon + tint).
const styleForType = (
  type: string
): { icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string } => {
  const t = (type || '').toLowerCase();
  if (t.includes('complete') || t.includes('finished') || t === 'success') {
    return { icon: 'checkmark', bg: '#DBF5E3', fg: '#33BF73' };
  }
  if (t.includes('payment_fail') || t.includes('failed') || t === 'error') {
    return { icon: 'alert-circle', bg: '#FFEBED', fg: '#ED4557' };
  }
  if (t.includes('promo') || t.includes('coupon') || t.includes('discount')) {
    return { icon: 'pricetag', bg: '#FFF0D9', fg: '#F28C0D' };
  }
  if (t.includes('schedule')) {
    return { icon: 'calendar', bg: '#E0F0FF', fg: '#0366FB' };
  }
  // Default: ride / driver / generic
  return { icon: 'car', bg: '#E0F0FF', fg: '#0366FB' };
};

// Returns "Just now", "12 min ago", "2 h ago", "Yesterday", "5 days ago"
const formatTimeAgo = (d: Date, t: (k: string, def?: string) => string) => {
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  const hr = Math.floor(diffMs / 3600000);
  const day = Math.floor(diffMs / 86400000);
  if (min < 1) return t('notifications.justNow', 'Just now');
  if (min < 60) return `${min} ${t('notifications.minAgo', 'min ago')}`;
  if (hr < 24) return `${hr} ${t('notifications.hAgo', 'h ago')}`;
  if (day === 1) return t('notifications.yesterday', 'Yesterday');
  if (day < 7) return `${day} ${t('notifications.daysAgo', 'days ago')}`;
  return d.toLocaleDateString();
};

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export default function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;

  const isRTL = i18n.language === 'ar';
  const writingDirection: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await notificationApi.getNotifications();
      const data = response.data || [];
      setNotifications(
        data.map((n: any) => ({
          id: n.id?.toString() || String(Math.random()),
          type: n.type || 'system',
          title: n.title || '',
          message: n.message || n.body || '',
          createdAt: new Date(n.createdAt || Date.now()),
          isRead: !!n.isRead,
        }))
      );
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadNotifications();
    setIsRefreshing(false);
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {}
  };

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  // Group into Today / Yesterday / Earlier
  const sections: Section[] = useMemo(() => {
    const today = startOfDay(new Date()).getTime();
    const yesterday = today - 86400000;
    const buckets: Record<string, Notification[]> = {
      today: [],
      yesterday: [],
      earlier: [],
    };
    for (const n of notifications) {
      const d = startOfDay(n.createdAt).getTime();
      if (d === today) buckets.today.push(n);
      else if (d === yesterday) buckets.yesterday.push(n);
      else buckets.earlier.push(n);
    }
    const result: Section[] = [];
    if (buckets.today.length)
      result.push({ title: t('notifications.today', 'TODAY'), data: buckets.today });
    if (buckets.yesterday.length)
      result.push({
        title: t('notifications.yesterdayLabel', 'YESTERDAY'),
        data: buckets.yesterday,
      });
    if (buckets.earlier.length)
      result.push({ title: t('notifications.earlier', 'EARLIER'), data: buckets.earlier });
    return result;
  }, [notifications, t]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderItem = ({ item }: { item: Notification }) => {
    const sty = styleForType(item.type);
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => !item.isRead && markAsRead(item.id)}
        style={{
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          gap: 14 * s,
          paddingHorizontal: 20 * s,
          paddingVertical: 14 * s,
          backgroundColor: item.isRead ? '#FFFFFF' : '#F7FAFF',
        }}
      >
        {/* Icon badge */}
        <View
          style={{
            width: 44 * s,
            height: 44 * s,
            borderRadius: 22 * s,
            backgroundColor: sty.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={sty.icon} size={22 * s} color={sty.fg} />
        </View>

        {/* Body */}
        <View style={{ flex: 1, gap: 4 * s }}>
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 8 * s,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: '#111111',
                fontSize: 15 * s,
                fontWeight: item.isRead ? '600' : '700',
                textAlign,
                writingDirection,
              }}
            >
              {item.title}
            </Text>
            <Text
              style={{
                color: '#6B7380',
                fontSize: 12 * s,
                fontWeight: '500',
              }}
            >
              {formatTimeAgo(item.createdAt, t as any)}
            </Text>
          </View>
          {!!item.message && (
            <Text
              numberOfLines={2}
              style={{
                color: '#6B7380',
                fontSize: 13 * s,
                lineHeight: 18 * s,
                textAlign,
                writingDirection,
              }}
            >
              {item.message}
            </Text>
          )}
        </View>

        {/* Unread blue dot */}
        {!item.isRead && (
          <View
            style={{
              width: 8 * s,
              height: 8 * s,
              borderRadius: 4 * s,
              backgroundColor: '#0366FB',
              marginTop: 8 * s,
            }}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View
      style={{
        backgroundColor: '#F5F7FC',
        paddingHorizontal: 20 * s,
        paddingTop: 16 * s,
        paddingBottom: 8 * s,
      }}
    >
      <Text
        style={{
          color: '#6B7380',
          fontSize: 11 * s,
          fontWeight: '600',
          letterSpacing: 1.2,
          textAlign,
          writingDirection,
        }}
      >
        {section.title}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      {/* Header */}
      <View
        style={{
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: 12 * s,
          paddingLeft: 12 * s,
          paddingRight: 16 * s,
          height: 64 * s,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={{
            width: 40 * s,
            height: 40 * s,
            borderRadius: 12 * s,
            backgroundColor: '#F5F7FC',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={isRTL ? 'chevron-forward' : 'chevron-back'}
            size={20 * s}
            color="#111111"
          />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            color: '#111111',
            fontSize: 20 * s,
            fontWeight: '700',
            letterSpacing: -0.4,
            textAlign,
            writingDirection,
          }}
        >
          {t('notifications.title', 'Notifications')}
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity activeOpacity={0.7} onPress={markAllAsRead} hitSlop={8}>
            <Text style={{ color: '#101969', fontSize: 13 * s, fontWeight: '600' }}>
              {t('notifications.markAllRead', 'Mark all read')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#101969" />
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#101969"
            />
          }
          ListEmptyComponent={
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: 80 * s,
                paddingHorizontal: 32 * s,
              }}
            >
              <Ionicons name="notifications-off-outline" size={48 * s} color="#6B7380" />
              <Text
                style={{
                  marginTop: 16 * s,
                  color: '#111111',
                  fontSize: 16 * s,
                  fontWeight: '600',
                  textAlign: 'center',
                }}
              >
                {t('notifications.empty', "You're all caught up")}
              </Text>
              <Text
                style={{
                  marginTop: 6 * s,
                  color: '#6B7380',
                  fontSize: 13 * s,
                  textAlign: 'center',
                }}
              >
                {t(
                  'notifications.emptySubtitle',
                  'New ride updates and promotions will show up here.'
                )}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
