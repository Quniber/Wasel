import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { addressApi } from '@/lib/api';
import ScreenHeader from '@/components/ScreenHeader';

const BASE_W = 393;

interface Place {
  id: string;
  type: 'home' | 'work' | 'other';
  title: string;
  address: string;
}

const iconForType = (t: string): keyof typeof Ionicons.glyphMap => {
  if (t === 'home') return 'home';
  if (t === 'work') return 'briefcase';
  return 'star';
};

export default function PlacesScreen() {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;
  const isRTL = i18n.language === 'ar';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    try {
      const res = await addressApi.getAddresses();
      const arr = (res.data || []).map((a: any) => ({
        id: a.id?.toString() || String(Math.random()),
        type: (a.type?.toLowerCase() || 'other') as 'home' | 'work' | 'other',
        title: a.title || a.type || 'Saved place',
        address: a.address || '',
      }));
      setPlaces(arr);
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <ScreenHeader title={t('places.title', 'Saved places')} />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#101969" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 120 * s }}
          showsVerticalScrollIndicator={false}
        >
          {places.length === 0 ? (
            <View
              style={{
                paddingHorizontal: 32 * s,
                paddingVertical: 80 * s,
                alignItems: 'center',
              }}
            >
              <Ionicons name="location-outline" size={48 * s} color="#6B7380" />
              <Text
                style={{
                  marginTop: 16 * s,
                  color: '#111111',
                  fontSize: 16 * s,
                  fontWeight: '600',
                  textAlign: 'center',
                }}
              >
                {t('places.empty', 'No saved places yet')}
              </Text>
              <Text
                style={{
                  marginTop: 6 * s,
                  color: '#6B7380',
                  fontSize: 13 * s,
                  textAlign: 'center',
                }}
              >
                {t(
                  'places.emptySubtitle',
                  'Save your home, work, and favorites for one-tap booking.'
                )}
              </Text>
            </View>
          ) : (
            places.map((p, idx) => (
              <View key={p.id}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({ pathname: '/(main)/add-place' as any, params: { id: p.id } })
                  }
                  style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 14 * s,
                    paddingHorizontal: 20 * s,
                    paddingVertical: 14 * s,
                  }}
                >
                  <View
                    style={{
                      width: 48 * s,
                      height: 48 * s,
                      borderRadius: 24 * s,
                      backgroundColor: '#E0F0FF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={iconForType(p.type)} size={22 * s} color="#0366FB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      numberOfLines={1}
                      style={{ color: '#111111', fontSize: 15 * s, fontWeight: '600', textAlign }}
                    >
                      {p.title}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        marginTop: 4 * s,
                        color: '#6B7380',
                        fontSize: 13 * s,
                        textAlign,
                      }}
                    >
                      {p.address}
                    </Text>
                  </View>
                  <TouchableOpacity activeOpacity={0.7} hitSlop={8}>
                    <Ionicons name="ellipsis-horizontal" size={18 * s} color="#6B7380" />
                  </TouchableOpacity>
                </TouchableOpacity>
                {idx < places.length - 1 && (
                  <View
                    style={{ height: 1, backgroundColor: '#E5EBF2', marginHorizontal: 20 * s }}
                  />
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      <View
        style={{
          position: 'absolute',
          bottom: 40 * s,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/(main)/add-place' as any)}
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 8 * s,
            paddingLeft: 16 * s,
            paddingRight: 18 * s,
            paddingVertical: 14 * s,
            borderRadius: 999,
            backgroundColor: '#101969',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.16,
            shadowRadius: 20,
            elevation: 8,
          }}
        >
          <Ionicons name="add" size={18 * s} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 15 * s, fontWeight: '600' }}>
            {t('places.addNew', 'Add new place')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
