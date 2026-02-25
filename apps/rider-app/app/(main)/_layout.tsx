import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useThemeStore } from '@/stores/theme-store';
import { socketService } from '@/lib/socket';

export default function MainLayout() {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    socketService.connect();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: isDark ? '#121212' : '#FFFFFF',
        },
      }}
    >
      <Stack.Screen name="(drawer)" />
      <Stack.Screen name="search" />
      <Stack.Screen name="confirm-location" />
      <Stack.Screen name="select-service" />
      <Stack.Screen name="route-preview" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="finding-driver" />
      <Stack.Screen name="ride-active" />
      <Stack.Screen name="ride-complete" />
      <Stack.Screen name="rate-driver" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="payment" />
    </Stack>
  );
}
