import { useEffect } from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';

export default function SplashScreen() {
  const { isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      // Small delay for splash effect
      setTimeout(() => {
        router.replace('/(auth)/welcome');
      }, 1000);
    }
  }, [isLoading]);

  return (
    <View className="flex-1 items-center justify-center bg-primary">
      <View className="items-center">
        {/* Logo placeholder - replace with actual logo */}
        <View className="w-24 h-24 rounded-full bg-white items-center justify-center mb-4">
          <View className="w-16 h-16 rounded-full bg-primary items-center justify-center">
            <View className="w-8 h-8 bg-white rounded" />
          </View>
        </View>
        <ActivityIndicator color="#FFFFFF" size="small" className="mt-8" />
      </View>
    </View>
  );
}
