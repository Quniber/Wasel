import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const BASE_W = 393;

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
  rightColor?: string;
}

/** Reusable top-bar: light-gray rounded back button + bold title + optional right text link. */
export default function ScreenHeader({
  title,
  onBack,
  rightLabel,
  onRightPress,
  rightColor = '#101969',
}: ScreenHeaderProps) {
  const { i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;
  const isRTL = i18n.language === 'ar';

  return (
    <View
      style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 12 * s,
        paddingLeft: 12 * s,
        paddingRight: 16 * s,
        height: 64 * s,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onBack ? onBack : () => router.back()}
        style={{
          width: 40 * s,
          height: 40 * s,
          borderRadius: 12 * s,
          backgroundColor: '#F5F7FC',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name={isRTL ? 'chevron-forward' : 'chevron-back'}
          size={20 * s}
          color="#111111"
        />
      </TouchableOpacity>
      <Text
        style={{
          flex: 1,
          color: '#111111',
          fontSize: 22 * s,
          fontWeight: '700',
          letterSpacing: -0.4,
          textAlign: isRTL ? 'right' : 'left',
        }}
      >
        {title}
      </Text>
      {!!rightLabel && !!onRightPress && (
        <TouchableOpacity activeOpacity={0.7} onPress={onRightPress} hitSlop={8}>
          <Text style={{ color: rightColor, fontSize: 15 * s, fontWeight: '600' }}>
            {rightLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
