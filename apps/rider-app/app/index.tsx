import { useEffect } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Polygon } from 'react-native-svg';
import { useAuthStore } from '@/stores/auth-store';

const SPLASH_DURATION_MS = 2000;

// Figma frame baseline: 393 x 852
const BASE_W = 393;
const BASE_H = 852;

export default function SplashScreen() {
  const { isLoading, isAuthenticated } = useAuthStore();
  const { width, height } = useWindowDimensions();

  // Scale UI proportionally to the Figma baseline
  const scaleX = width / BASE_W;
  const scaleY = height / BASE_H;
  const s = Math.min(scaleX, scaleY);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    scale.value = withSpring(1, { damping: 12, stiffness: 90 });
    taglineOpacity.value = withDelay(700, withTiming(0.5, { duration: 500 }));
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const t = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 250 });
      scale.value = withDelay(50, withTiming(0.94, { duration: 250 }));
      taglineOpacity.value = withTiming(0, { duration: 200 });
      setTimeout(() => {
        router.replace(isAuthenticated ? '/(main)' : '/(auth)/welcome');
      }, 280);
    }, SPLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, [isLoading, isAuthenticated]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const wordmarkStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));

  // Figma positions (393 x 852)
  // Logo: top 323.56, left 126.5, size 140 x 122.889
  // "WaselGo" text: top 470.44, left 96, font 48 Bold, tracking -1.5
  // Tagline: top 788, left 136.5, font 13 Medium, tracking 0.4, white@50%
  const logoTop = 323.56 * scaleY;
  const logoW = 140 * s;
  const logoH = 122.889 * s;
  const wordmarkTop = 470.44 * scaleY;
  const wordmarkSize = 48 * s;
  const taglineTop = 788 * scaleY;
  const taglineSize = 13 * s;

  return (
    <View style={{ flex: 1, backgroundColor: '#101969' }}>
      {/* Logo */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: logoTop,
            width: logoW,
            height: logoH,
            left: (width - logoW) / 2,
          },
          logoStyle,
        ]}
      >
        <Svg width={logoW} height={logoH} viewBox="180 140 185 135">
          <Polygon
            fill="#0366FB"
            points="246.8,162.8 231.4,147.3 187.9,190.9 231.2,234.2 246.7,218.8 218.8,190.9"
          />
          <Path
            fill="#FFFFFF"
            d="M359.4,211c-2.2,1.3-5.3,2.5-9.7,3.3c-1.5-6-3.8-12.5-6.9-19.4c-9-20.1-18.7-33.5-29.5-41
            c-10.3-7.1-21.9-8.8-32.8-4.8c-9.4,3.5-16.7,10.7-19.9,19.9c-3.3,9.4-2.1,19.8,3.3,28.6c9.3,14.8,28.9,37,64.3,40
            c-1.1,8.2-5.1,14.2-11.8,17.4c-16.8,8-38.9-3.4-52.3-19.6l-15,17.5c9.3,10.1,20.5,17.9,32.5,22.4c16,6,32.7,5.8,45.8-0.4
            c3.5-1.7,6.8-3.8,9.9-6.4c8.1-7,14-17.6,14.9-31.8c0.2,0,0.4-0.1,0.6-0.1c5-0.7,9.2-1.9,12.9-3.3L359.4,211z M284.1,186.5
            c-1.9-3.1-2.4-6.8-1.2-10.2c0.4-1.2,1.3-3,3.1-4.6c0.9-0.8,2-1.5,3.4-2c12.9-4.7,26.4,21.8,31.7,33.4c1.8,4,3.3,7.9,4.4,11.6
            C304.4,211.5,291.6,198.4,284.1,186.5z"
          />
        </Svg>
      </Animated.View>

      {/* Wordmark */}
      <Animated.Text
        style={[
          {
            position: 'absolute',
            top: wordmarkTop,
            width,
            textAlign: 'center',
            color: '#FFFFFF',
            fontSize: wordmarkSize,
            fontWeight: '700',
            letterSpacing: -1.5 * s,
          },
          wordmarkStyle,
        ]}
      >
        WaselGo
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text
        style={[
          {
            position: 'absolute',
            top: taglineTop,
            width,
            textAlign: 'center',
            color: '#FFFFFF',
            fontSize: taglineSize,
            fontWeight: '500',
            letterSpacing: 0.4 * s,
          },
          taglineStyle,
        ]}
      >
        Your ride, anytime
      </Animated.Text>
    </View>
  );
}
