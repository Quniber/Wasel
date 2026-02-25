import { useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, Image, Platform, ScrollView } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/stores/theme-store';
import { useAuthStore } from '@/stores/auth-store';
import { changeLanguage } from '@/i18n';
import { socketService } from '@/lib/socket';

function CustomDrawerContent(props: any) {
  const { t, i18n } = useTranslation();
  const { resolvedTheme, mode, setMode } = useThemeStore();
  const { user, logout } = useAuthStore();
  const isDark = resolvedTheme === 'dark';

  const handleLogout = async () => {
    await logout();
    socketService.disconnect();
    router.replace('/(auth)/welcome');
  };

  const toggleDarkMode = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    await changeLanguage(newLang);
  };

  const menuItems = [
    { icon: 'home', label: t('drawer.home'), route: '/(main)' },
    { icon: 'time', label: t('drawer.myRides'), route: '/(main)/history' },
    { icon: 'calendar', label: t('drawer.scheduledRides'), route: '/(main)/scheduled' },
    { icon: 'location', label: t('drawer.savedPlaces'), route: '/(main)/places' },
    { icon: 'pricetag', label: t('drawer.promotions'), route: '/(main)/promotions' },
    { icon: 'chatbubbles', label: t('drawer.support'), route: '/(main)/support' },
    { icon: 'settings', label: t('drawer.settings'), route: '/(main)/settings' },
  ];

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ flex: 1 }}
      style={{ backgroundColor: isDark ? '#121212' : '#FFFFFF' }}
    >
      {/* User Profile Header */}
      <TouchableOpacity
        onPress={() => router.push('/(main)/profile')}
        className={`px-4 py-6 border-b ${isDark ? 'border-border-dark' : 'border-border'}`}
      >
        <View className="flex-row items-center">
          <View className="w-16 h-16 rounded-full bg-primary items-center justify-center">
            <Text className="text-white text-2xl font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </Text>
          </View>
          <View className="ml-4 flex-1">
            <Text className={`text-lg font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text className="text-muted-foreground text-sm">
              {user?.mobileNumber}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isDark ? '#757575' : '#9E9E9E'}
          />
        </View>
      </TouchableOpacity>

      {/* Menu Items */}
      <View className="flex-1 py-2">
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => router.push(item.route as any)}
            className={`flex-row items-center px-4 py-4 ${
              props.state.index === index ? (isDark ? 'bg-muted-dark' : 'bg-muted') : ''
            }`}
          >
            <Ionicons
              name={item.icon as any}
              size={24}
              color={props.state.index === index ? (isDark ? '#60a5fa' : '#3b82f6') : (isDark ? '#FAFAFA' : '#212121')}
            />
            <Text
              className={`ml-4 text-base ${
                props.state.index === index
                  ? 'text-primary font-semibold'
                  : isDark
                  ? 'text-foreground-dark'
                  : 'text-foreground'
              }`}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Theme & Language Toggles */}
      <View className={`border-t ${isDark ? 'border-border-dark' : 'border-border'} py-2`}>
        {/* Dark Mode Toggle */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="flex-row items-center">
            <Ionicons
              name="moon"
              size={24}
              color={isDark ? '#FAFAFA' : '#212121'}
            />
            <Text className={`ml-4 text-base ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {t('drawer.darkMode')}
            </Text>
          </View>
          <Switch
            value={mode === 'dark'}
            onValueChange={toggleDarkMode}
            trackColor={{ false: '#E0E0E0', true: isDark ? '#60a5fa' : '#3b82f6' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Language Toggle */}
        <TouchableOpacity
          onPress={toggleLanguage}
          className="flex-row items-center justify-between px-4 py-3"
        >
          <View className="flex-row items-center">
            <Ionicons
              name="globe"
              size={24}
              color={isDark ? '#FAFAFA' : '#212121'}
            />
            <Text className={`ml-4 text-base ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {i18n.language === 'en' ? 'العربية' : 'English'}
            </Text>
          </View>
          <Text className="text-primary font-medium">
            {i18n.language.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity
        onPress={handleLogout}
        className={`flex-row items-center px-4 py-4 border-t ${isDark ? 'border-border-dark' : 'border-border'}`}
      >
        <Ionicons name="log-out" size={24} color="#F44336" />
        <Text className="ml-4 text-base text-destructive font-medium">
          {t('drawer.logout')}
        </Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

export default function MainLayout() {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    // Connect to socket when entering main app
    socketService.connect();

    return () => {
      // Cleanup handled on logout
    };
  }, []);

  // Use Stack navigator on web for better compatibility
  if (Platform.OS === 'web') {
    return (
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: isDark ? '#121212' : '#FFFFFF',
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="search" />
        <Stack.Screen name="confirm-location" />
        <Stack.Screen name="select-service" />
        <Stack.Screen name="schedule" />
        <Stack.Screen name="finding-driver" />
        <Stack.Screen name="ride-active" />
        <Stack.Screen name="ride-complete" />
        <Stack.Screen name="rate-driver" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="history" />
        <Stack.Screen name="scheduled" />
        <Stack.Screen name="places" />
        <Stack.Screen name="promotions" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="support" />
        <Stack.Screen name="notifications" />
      </Stack>
    );
  }

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: isDark ? '#121212' : '#FFFFFF',
          width: 300,
        },
        drawerType: 'front',
        swipeEnabled: true,
      }}
    >
      <Drawer.Screen name="index" options={{ headerShown: false }} />
      <Drawer.Screen name="search" options={{ headerShown: false }} />
      <Drawer.Screen name="confirm-location" options={{ headerShown: false }} />
      <Drawer.Screen name="select-service" options={{ headerShown: false }} />
      <Drawer.Screen name="schedule" options={{ headerShown: false }} />
      <Drawer.Screen name="finding-driver" options={{ headerShown: false }} />
      <Drawer.Screen name="ride-active" options={{ headerShown: false }} />
      <Drawer.Screen name="ride-complete" options={{ headerShown: false }} />
      <Drawer.Screen name="rate-driver" options={{ headerShown: false }} />
      <Drawer.Screen name="chat" options={{ headerShown: false }} />
      <Drawer.Screen name="history" options={{ headerShown: false }} />
      <Drawer.Screen name="scheduled" options={{ headerShown: false }} />
      <Drawer.Screen name="places" options={{ headerShown: false }} />
      <Drawer.Screen name="promotions" options={{ headerShown: false }} />
      <Drawer.Screen name="profile" options={{ headerShown: false }} />
      <Drawer.Screen name="settings" options={{ headerShown: false }} />
      <Drawer.Screen name="support" options={{ headerShown: false }} />
      <Drawer.Screen name="notifications" options={{ headerShown: false }} />
    </Drawer>
  );
}
