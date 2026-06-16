import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/auth-store';
import { changeLanguage } from '@/i18n';
import { socketService } from '@/lib/socket';
import { orderApi, couponApi } from '@/lib/api';
import AlertModal from '@/components/AlertModal';

const BASE_W = 393;

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: number;
  onPress: () => void;
  s: number;
  isRTL: boolean;
}
function MenuItem({ icon, label, badge, onPress, s, isRTL }: MenuItemProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 14 * s,
        paddingHorizontal: 24 * s,
        paddingVertical: 12 * s,
      }}
    >
      <Ionicons name={icon} size={22 * s} color="#0366FB" />
      <Text
        style={{
          flex: 1,
          color: '#111111',
          fontSize: 16 * s,
          fontWeight: '600',
          textAlign: isRTL ? 'right' : 'left',
        }}
      >
        {label}
      </Text>
      {!!badge && badge > 0 && (
        <View
          style={{
            backgroundColor: '#ED4557',
            borderRadius: 999,
            paddingHorizontal: 8 * s,
            paddingVertical: 2 * s,
            minWidth: 22 * s,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 11 * s, fontWeight: '700' }}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;
  const isRTL = i18n.language === 'ar';

  const [scheduledCount, setScheduledCount] = useState(0);
  const [promoCount, setPromoCount] = useState(0);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);

  const closeDrawer = () => props.navigation.dispatch(DrawerActions.closeDrawer());

  useEffect(() => {
    (async () => {
      try {
        const [sched, promos] = await Promise.allSettled([
          orderApi.getScheduledOrders(),
          couponApi.getAvailableCoupons(),
        ]);
        if (sched.status === 'fulfilled') {
          setScheduledCount((sched.value.data || []).length);
        }
        if (promos.status === 'fulfilled') {
          setPromoCount((promos.value.data || []).length);
        }
      } catch {}
    })();
  }, []);

  const goTo = (route: string) => {
    closeDrawer();
    setTimeout(() => router.push(route as any), 50);
  };

  const handleLogout = async () => {
    await logout();
    socketService.disconnect();
    router.replace('/(auth)/welcome');
  };

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    await changeLanguage(newLang);
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    t('drawer.guest', 'Guest');
  const walletBalance = (user as any)?.walletBalance ?? 0;
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber =
    (Constants.expoConfig?.ios?.buildNumber as string) ||
    String(Constants.expoConfig?.android?.versionCode || '');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Close button (top-right) */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: isRTL ? 'flex-start' : 'flex-end',
            paddingHorizontal: 16 * s,
            paddingTop: 6 * s,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={closeDrawer}
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
        </View>

        {/* Profile row */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => goTo('/(main)/profile')}
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 14 * s,
            paddingHorizontal: 24 * s,
            paddingVertical: 14 * s,
          }}
        >
          <View
            style={{
              width: 56 * s,
              height: 56 * s,
              borderRadius: 28 * s,
              backgroundColor: '#101969',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {(user as any)?.avatar ? (
              <Image
                source={{ uri: (user as any).avatar }}
                style={{ width: 56 * s, height: 56 * s }}
              />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 20 * s, fontWeight: '700' }}>
                {initials || 'U'}
              </Text>
            )}
          </View>
          <View style={{ flex: 1, gap: 2 * s }}>
            <Text
              numberOfLines={1}
              style={{
                color: '#111111',
                fontSize: 17 * s,
                fontWeight: '700',
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {fullName}
            </Text>
            <Text
              style={{
                color: '#0366FB',
                fontSize: 13 * s,
                fontWeight: '500',
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {t('drawer.viewProfile', 'View profile')}
            </Text>
          </View>
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={18 * s}
            color="#6B7380"
          />
        </TouchableOpacity>

        {/* Wallet pill */}
        <View
          style={{
            paddingHorizontal: 24 * s,
            marginTop: 4 * s,
            flexDirection: 'row',
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => goTo('/(main)/(drawer)/wallet')}
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 6 * s,
              paddingHorizontal: 12 * s,
              paddingVertical: 6 * s,
              borderRadius: 999,
              backgroundColor: '#E0F0FF',
            }}
          >
            <Text style={{ color: '#6B7380', fontSize: 12 * s, fontWeight: '500' }}>
              {t('drawer.wallet', 'Wallet')} ·{' '}
            </Text>
            <Text style={{ color: '#101969', fontSize: 13 * s, fontWeight: '700' }}>
              QAR {Number(walletBalance).toFixed(2)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: '#E5EBF2',
            marginHorizontal: 24 * s,
            marginVertical: 16 * s,
          }}
        />

        {/* Menu */}
        <MenuItem
          icon="home-outline"
          label={t('drawer.home')}
          onPress={() => goTo('/(main)/(drawer)')}
          s={s}
          isRTL={isRTL}
        />
        <MenuItem
          icon="time-outline"
          label={t('drawer.myRides')}
          onPress={() => goTo('/(main)/(drawer)/history')}
          s={s}
          isRTL={isRTL}
        />
        <MenuItem
          icon="calendar-outline"
          label={t('drawer.scheduledRides')}
          badge={scheduledCount}
          onPress={() => goTo('/(main)/(drawer)/scheduled')}
          s={s}
          isRTL={isRTL}
        />
        <MenuItem
          icon="star-outline"
          label={t('drawer.savedPlaces')}
          onPress={() => goTo('/(main)/(drawer)/places')}
          s={s}
          isRTL={isRTL}
        />
        <MenuItem
          icon="pricetag-outline"
          label={t('drawer.promotions')}
          badge={promoCount}
          onPress={() => goTo('/(main)/(drawer)/promotions')}
          s={s}
          isRTL={isRTL}
        />
        <MenuItem
          icon="chatbubble-outline"
          label={t('drawer.support')}
          onPress={() => goTo('/(main)/(drawer)/support')}
          s={s}
          isRTL={isRTL}
        />
        <MenuItem
          icon="settings-outline"
          label={t('drawer.settings')}
          onPress={() => goTo('/(main)/(drawer)/settings')}
          s={s}
          isRTL={isRTL}
        />

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: '#E5EBF2',
            marginHorizontal: 24 * s,
            marginVertical: 14 * s,
          }}
        />

        {/* Language */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={toggleLanguage}
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            paddingHorizontal: 24 * s,
            paddingVertical: 12 * s,
          }}
        >
          <Text
            style={{
              flex: 1,
              color: '#111111',
              fontSize: 15 * s,
              fontWeight: '600',
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            {t('drawer.language', 'Language')}
          </Text>
          <View
            style={{
              paddingHorizontal: 12 * s,
              paddingVertical: 6 * s,
              borderRadius: 999,
              backgroundColor: '#F5F7FC',
              borderWidth: 1,
              borderColor: '#E5EBF2',
            }}
          >
            <Text style={{ color: '#101969', fontSize: 12 * s, fontWeight: '600' }}>
              {i18n.language === 'en' ? 'العربية' : 'English'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setSignOutModalVisible(true)}
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 14 * s,
            paddingHorizontal: 24 * s,
            paddingVertical: 14 * s,
          }}
        >
          <Ionicons name="log-out-outline" size={22 * s} color="#ED4557" />
          <Text
            style={{
              color: '#ED4557',
              fontSize: 16 * s,
              fontWeight: '600',
            }}
          >
            {t('drawer.logout', 'Sign out')}
          </Text>
        </TouchableOpacity>

        {/* Version */}
        <View style={{ alignItems: 'center', paddingVertical: 12 * s }}>
          <Text style={{ color: '#6B7380', fontSize: 11 * s, fontWeight: '500' }}>
            WaselGo · v{appVersion}
            {buildNumber ? ` (${buildNumber})` : ''}
          </Text>
        </View>
      </ScrollView>

      {/* Sign out confirmation */}
      <AlertModal
        visible={signOutModalVisible}
        variant="warning"
        title={t('drawer.logoutTitle', 'Sign out?')}
        message={t('drawer.logoutMsg', 'You will need to sign in again to use the app.')}
        primaryLabel={t('drawer.logout', 'Sign out')}
        onPrimaryPress={() => {
          setSignOutModalVisible(false);
          handleLogout();
        }}
        secondaryLabel={t('common.cancel', 'Cancel')}
        onSecondaryPress={() => setSignOutModalVisible(false)}
        onRequestClose={() => setSignOutModalVisible(false)}
      />
    </SafeAreaView>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: '#FFFFFF',
          width: 320,
        },
        drawerType: 'front',
        swipeEnabled: true,
      }}
    >
      <Drawer.Screen name="index" options={{ headerShown: false }} />
      <Drawer.Screen name="history" options={{ headerShown: false }} />
      <Drawer.Screen name="wallet" options={{ headerShown: false }} />
      <Drawer.Screen name="scheduled" options={{ headerShown: false }} />
      <Drawer.Screen name="places" options={{ headerShown: false }} />
      <Drawer.Screen name="promotions" options={{ headerShown: false }} />
      <Drawer.Screen name="support" options={{ headerShown: false }} />
      <Drawer.Screen name="settings" options={{ headerShown: false }} />
    </Drawer>
  );
}
