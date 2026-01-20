import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { getColors } from '@/constants/Colors';
import Svg, { Path, Polygon } from 'react-native-svg';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(main)');
      } else {
        router.replace('/(auth)/welcome');
      }
    }
  }, [isAuthenticated, isLoading]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
      <View style={{ alignItems: 'center' }}>
        {/* Wasel Logo */}
        <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Svg width="160" height="120" viewBox="0 0 569.4 426.4">
            <Polygon
              fill="#0366FB"
              points="246.8,162.8 231.4,147.3 187.9,190.9 231.2,234.2 246.7,218.8 218.8,190.9"
            />
            <Path
              fill="#101969"
              d="M359.4,211c-2.2,1.3-5.3,2.5-9.7,3.3c-1.5-6-3.8-12.5-6.9-19.4c-9-20.1-18.7-33.5-29.5-41
              c-10.3-7.1-21.9-8.8-32.8-4.8c-9.4,3.5-16.7,10.7-19.9,19.9c-3.3,9.4-2.1,19.8,3.3,28.6c9.3,14.8,28.9,37,64.3,40
              c-1.1,8.2-5.1,14.2-11.8,17.4c-16.8,8-38.9-3.4-52.3-19.6l-15,17.5c9.3,10.1,20.5,17.9,32.5,22.4c16,6,32.7,5.8,45.8-0.4
              c3.5-1.7,6.8-3.8,9.9-6.4c8.1-7,14-17.6,14.9-31.8c0.2,0,0.4-0.1,0.6-0.1c5-0.7,9.2-1.9,12.9-3.3L359.4,211z M284.1,186.5
              c-1.9-3.1-2.4-6.8-1.2-10.2c0.4-1.2,1.3-3,3.1-4.6c0.9-0.8,2-1.5,3.4-2c12.9-4.7,26.4,21.8,31.7,33.4c1.8,4,3.3,7.9,4.4,11.6
              C304.4,211.5,291.6,198.4,284.1,186.5z"
            />
          </Svg>
        </View>
        <ActivityIndicator size="large" color="#0366FB" style={{ marginTop: 16 }} />
      </View>
    </View>
  );
}
