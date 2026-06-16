import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { socketService } from '@/lib/socket';

export default function MainLayout() {
  useEffect(() => {
    socketService.connect();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="(drawer)" />
      <Stack.Screen name="search" />
      <Stack.Screen name="confirm-location" />
      <Stack.Screen name="route-preview" />
      <Stack.Screen name="finding-driver" />
      <Stack.Screen name="ride-active" />
      <Stack.Screen name="ride-complete" />
      <Stack.Screen name="rate-driver" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="add-place" />
    </Stack>
  );
}
