import { useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Switch, Platform } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { router, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import { useDriverStore } from '@/stores/driver-store';
import { getColors } from '@/constants/Colors';
import { socketService } from '@/lib/socket';

function CustomDrawerContent(props: any) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { resolvedTheme, mode, setMode } = useThemeStore();
  const { user, logout } = useAuthStore();
  const { reset: resetDriverStore } = useDriverStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const handleLogout = async () => {
    resetDriverStore();
    socketService.disconnect();
    await logout();
    router.replace('/(auth)/welcome');
  };

  const toggleDarkMode = () => {
    setMode(isDark ? 'light' : 'dark');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: insets.top }}>
        {/* User Profile Header */}
        <View className="px-4 pb-6 border-b" style={{ borderColor: colors.border }}>
          <View className="flex-row items-center">
            <View
              className="w-16 h-16 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.secondary }}
            >
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} className="w-16 h-16 rounded-full" />
              ) : (
                <Ionicons name="person" size={32} color={colors.mutedForeground} />
              )}
            </View>
            <View className="ml-4 flex-1">
              <Text style={{ color: colors.foreground }} className="text-lg font-semibold">
                {user?.firstName} {user?.lastName}
              </Text>
              <View className="flex-row items-center mt-1">
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={{ color: colors.mutedForeground }} className="ml-1 text-sm">
                  {user?.rating?.toFixed(1) || '5.0'} Rating
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <DrawerItemList {...props} />

        {/* Dark Mode Toggle */}
        <View
          className="flex-row items-center justify-between px-4 py-3 mx-3 mt-2 rounded-lg"
          style={{ backgroundColor: colors.secondary }}
        >
          <View className="flex-row items-center">
            <Ionicons name="moon-outline" size={22} color={colors.foreground} />
            <Text style={{ color: colors.foreground }} className="ml-3 text-base">
              {t('drawer.darkMode')}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleDarkMode}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.background}
          />
        </View>
      </DrawerContentScrollView>

      {/* Logout Button */}
      <View className="p-4 border-t" style={{ borderColor: colors.border, paddingBottom: insets.bottom + 16 }}>
        <TouchableOpacity
          onPress={handleLogout}
          className="flex-row items-center px-4 py-3 rounded-lg"
          style={{ backgroundColor: colors.destructive + '10' }}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.destructive} />
          <Text style={{ color: colors.destructive }} className="ml-3 text-base font-medium">
            {t('drawer.logout')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MainLayout() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { isAuthenticated } = useAuthStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  useEffect(() => {
    // Connect socket when entering main
    if (isAuthenticated) {
      socketService.connect();
    }

    return () => {
      // Don't disconnect on unmount - keep connected while in app
    };
  }, [isAuthenticated]);

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: colors.background,
          width: 280,
        },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.mutedForeground,
        drawerLabelStyle: {
          marginLeft: -16,
          fontSize: 15,
        },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: t('drawer.home'),
          drawerIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="earnings"
        options={{
          drawerLabel: t('drawer.earnings'),
          drawerIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="history"
        options={{
          drawerLabel: t('drawer.history'),
          drawerIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="documents"
        options={{
          drawerLabel: t('drawer.documents'),
          drawerIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="vehicle"
        options={{
          drawerLabel: t('drawer.vehicle'),
          drawerIcon: ({ color, size }) => <Ionicons name="car-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="withdrawals"
        options={{
          drawerLabel: t('drawer.withdrawals'),
          drawerIcon: ({ color, size }) => <Ionicons name="cash-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="support"
        options={{
          drawerLabel: t('drawer.support'),
          drawerIcon: ({ color, size }) => <Ionicons name="help-circle-outline" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: t('drawer.settings'),
          drawerIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
      {/* Hidden screens */}
      <Drawer.Screen name="incoming-order" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="active-ride" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="ride-complete" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="chat" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="profile" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="notifications" options={{ drawerItemStyle: { display: 'none' } }} />
    </Drawer>
  );
}
