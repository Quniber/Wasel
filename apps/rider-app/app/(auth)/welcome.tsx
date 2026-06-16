import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Polygon, Circle, Ellipse, Rect } from 'react-native-svg';
import { changeLanguage } from '@/i18n';

// Figma frame: 393 × 852
const BASE_W = 393;

function HeaderLogo({ size = 56 }: { size?: number }) {
  const h = size * (49.156 / 56);
  return (
    <Svg width={size} height={h} viewBox="180 140 185 135">
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
  );
}

function CarArt({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 154">
      <Ellipse cx="140" cy="138" rx="110" ry="6" fill="#101969" opacity={0.08} />
      <Path
        d="M30 110 C30 102, 36 94, 46 92 L62 88 L84 60 C92 50, 104 44, 118 42 L172 42 C186 44, 198 50, 206 60 L226 88 L246 94 C254 96, 258 102, 258 110 L258 122 C258 128, 254 132, 248 132 L40 132 C34 132, 30 128, 30 122 Z"
        fill="#101969"
      />
      <Path
        d="M86 64 C92 56, 102 50, 116 48 L172 48 C184 50, 192 56, 198 64 L218 88 L70 88 Z"
        fill="#101969"
      />
      <Path
        d="M94 68 C98 62, 106 58, 116 56 L139 56 L139 86 L78 86 Z"
        fill="#0366FB"
        opacity={0.85}
      />
      <Path
        d="M141 56 L172 56 C182 58, 188 62, 192 68 L208 86 L141 86 Z"
        fill="#0366FB"
        opacity={0.85}
      />
      <Rect x="92" y="104" width="16" height="3" rx="1.5" fill="#0366FB" />
      <Rect x="180" y="104" width="16" height="3" rx="1.5" fill="#0366FB" />
      <Path d="M250 100 L258 102 L258 112 L250 110 Z" fill="#FFD24D" />
      <Path d="M30 100 L38 102 L38 112 L30 110 Z" fill="#E63946" />
      <Circle cx="80" cy="128" r="22" fill="#101969" />
      <Circle cx="208" cy="128" r="22" fill="#101969" />
      <Circle cx="80" cy="128" r="18" fill="#0A0F3D" />
      <Circle cx="208" cy="128" r="18" fill="#0A0F3D" />
      <Circle cx="80" cy="128" r="9" fill="#0366FB" />
      <Circle cx="208" cy="128" r="9" fill="#0366FB" />
      <Circle cx="80" cy="128" r="3" fill="#FFFFFF" opacity={0.9} />
      <Circle cx="208" cy="128" r="3" fill="#FFFFFF" opacity={0.9} />
    </Svg>
  );
}

export default function WelcomeScreen() {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;

  const isRTL = i18n.language === 'ar';
  const writingDirection: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    await changeLanguage(newLang);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, paddingHorizontal: 24 * s }}>
        {/* Header: logo + language */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 6 * s,
          }}
        >
          <HeaderLogo size={56 * s} />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={toggleLanguage}
            style={{
              width: 44 * s,
              height: 44 * s,
              borderRadius: 12 * s,
              backgroundColor: '#F5F7FC',
              borderWidth: 1,
              borderColor: '#E5EBF2',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="globe-outline" size={22 * s} color="#101969" />
          </TouchableOpacity>
        </View>

        {/* Hero card */}
        <View
          style={{
            marginTop: 24 * s,
            width: 345 * s,
            height: 212 * s,
            backgroundColor: '#F5F7FC',
            borderRadius: 28 * s,
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'center',
          }}
        >
          <CarArt width={280 * s} height={154 * s} />
        </View>

        {/* Title + subtitle (centered) */}
        <View style={{ marginTop: 60 * s, alignItems: 'center' }}>
          <Text
            style={{
              color: '#111111',
              fontSize: 36 * s,
              fontWeight: '700',
              letterSpacing: -1,
              lineHeight: 42 * s,
              textAlign: 'center',
              writingDirection,
            }}
          >
            {t('auth.welcome.titleLine1')}
          </Text>
          <Text
            style={{
              color: '#101969',
              fontSize: 36 * s,
              fontWeight: '700',
              letterSpacing: -1,
              lineHeight: 42 * s,
              textAlign: 'center',
              writingDirection,
            }}
          >
            {t('auth.welcome.brand')}
          </Text>
          <Text
            style={{
              marginTop: 12 * s,
              color: '#6B7380',
              fontSize: 16 * s,
              lineHeight: 24 * s,
              textAlign: 'center',
              writingDirection,
            }}
          >
            {t('auth.welcome.subtitle')}
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        {/* Buttons */}
        <View style={{ paddingBottom: 24 * s, width: '100%' }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push({ pathname: '/(auth)/phone', params: { intent: 'signup' } })}
            style={{
              width: '100%',
              height: 56 * s,
              borderRadius: 14 * s,
              backgroundColor: '#101969',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 17 * s,
                fontWeight: '600',
              }}
            >
              {t('auth.welcome.signUp')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push({ pathname: '/(auth)/phone', params: { intent: 'signin' } })}
            style={{
              width: '100%',
              marginTop: 12 * s,
              height: 56 * s,
              borderRadius: 14 * s,
              backgroundColor: '#FFFFFF',
              borderWidth: 1.5,
              borderColor: '#E5EBF2',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: '#111111',
                fontSize: 17 * s,
                fontWeight: '600',
              }}
            >
              {t('auth.welcome.signIn')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
