import { Modal, View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BASE_W = 393;

type Variant = 'success' | 'warning' | 'error' | 'info';

const VARIANT: Record<Variant, { tint: string; halo: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { tint: '#33BF73', halo: 'rgba(51, 191, 115, 0.18)', icon: 'checkmark' },
  warning: { tint: '#F59E0B', halo: 'rgba(245, 158, 11, 0.18)', icon: 'alert' },
  error: { tint: '#DC2626', halo: 'rgba(220, 38, 38, 0.18)', icon: 'close' },
  info: { tint: '#0366FB', halo: 'rgba(3, 102, 251, 0.18)', icon: 'information' },
};

export interface AlertModalProps {
  visible: boolean;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  primaryLabel: string;
  /** Override the primary button color. Default navy (#101969). */
  primaryColor?: string;
  onPrimaryPress: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  onRequestClose?: () => void;
}

export default function AlertModal({
  visible,
  variant = 'info',
  icon,
  title,
  message,
  primaryLabel,
  primaryColor,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  onRequestClose,
}: AlertModalProps) {
  const { width } = useWindowDimensions();
  const s = width / BASE_W;

  const v = VARIANT[variant];
  const iconName = icon ?? v.icon;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24 * s,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 345 * s,
            backgroundColor: '#FFFFFF',
            borderRadius: 24 * s,
            paddingTop: 32 * s,
            paddingBottom: 24 * s,
            paddingHorizontal: 28 * s,
            alignItems: 'center',
            gap: 16 * s,
          }}
        >
          {/* Icon halo (3 concentric circles) */}
          <View
            style={{
              width: 120 * s,
              height: 120 * s,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                position: 'absolute',
                width: 120 * s,
                height: 120 * s,
                borderRadius: 60 * s,
                backgroundColor: v.halo,
                opacity: 0.4,
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: 96 * s,
                height: 96 * s,
                borderRadius: 48 * s,
                backgroundColor: v.halo,
                opacity: 0.7,
              }}
            />
            <View
              style={{
                width: 72 * s,
                height: 72 * s,
                borderRadius: 36 * s,
                backgroundColor: v.tint,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={iconName} size={34 * s} color="#FFFFFF" />
            </View>
          </View>

          {/* Title */}
          <Text
            style={{
              color: '#111111',
              fontSize: 22 * s,
              fontWeight: '700',
              letterSpacing: -0.4,
              textAlign: 'center',
            }}
          >
            {title}
          </Text>

          {/* Message */}
          {!!message && (
            <Text
              style={{
                color: '#6B7380',
                fontSize: 14 * s,
                lineHeight: 21 * s,
                textAlign: 'center',
              }}
            >
              {message}
            </Text>
          )}

          {/* Primary button */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onPrimaryPress}
            style={{
              width: '100%',
              height: 52 * s,
              borderRadius: 14 * s,
              backgroundColor: primaryColor || '#101969',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 4 * s,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16 * s, fontWeight: '600' }}>
              {primaryLabel}
            </Text>
          </TouchableOpacity>

          {/* Optional secondary */}
          {!!secondaryLabel && !!onSecondaryPress && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onSecondaryPress}
              style={{
                width: '100%',
                paddingVertical: 8 * s,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#101969', fontSize: 15 * s, fontWeight: '600' }}>
                {secondaryLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
