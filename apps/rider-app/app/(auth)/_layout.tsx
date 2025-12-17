import { Stack } from 'expo-router';
import { useThemeStore } from '@/stores/theme-store';

export default function AuthLayout() {
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: isDark ? '#121212' : '#FFFFFF',
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="phone" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="email-login" />
      <Stack.Screen name="email-register" />
      <Stack.Screen name="profile-setup" />
    </Stack>
  );
}
