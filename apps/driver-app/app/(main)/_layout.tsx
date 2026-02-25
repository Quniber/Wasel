import { useEffect } from 'react';
import { Stack, router, usePathname } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useDriverStore } from '@/stores/driver-store';
import { socketService } from '@/lib/socket';

export default function MainLayout() {
  const { isAuthenticated } = useAuthStore();
  const { setIncomingOrder } = useDriverStore();
  const pathname = usePathname();

  useEffect(() => {
    if (isAuthenticated) {
      socketService.connect();
    }
  }, [isAuthenticated]);

  // Global listener for incoming orders
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = socketService.on('order:new', (order: any) => {
      console.log('[Layout] Received new order:', order.orderId);
      setIncomingOrder(order);

      if (!pathname.includes('incoming-order')) {
        router.push('/(main)/incoming-order');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, pathname]);

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="(drawer)" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="incoming-order" />
      <Stack.Screen name="active-ride" />
      <Stack.Screen name="ride-complete" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}
