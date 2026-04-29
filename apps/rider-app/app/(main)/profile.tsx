import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ScreenHeader from '@/components/ScreenHeader';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api';

const BASE_W = 393;

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { user, setUser } = useAuthStore() as any;
  const { width } = useWindowDimensions();
  const s = width / BASE_W;
  const isRTL = i18n.language === 'ar';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUri, setAvatarUri] = useState<string | null>((user as any)?.avatar || null);

  useEffect(() => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setEmail(user?.email || '');
    setAvatarUri((user as any)?.avatar || null);
  }, [user]);

  const handleAvatarPress = async () => {
    if (!editing) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]) setAvatarUri(res.assets[0].uri);
    } catch {}
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = (await (authApi as any).updateProfile?.({ firstName, lastName, email })) || null;
      if (res?.data) setUser?.({ ...user, firstName, lastName, email });
      setEditing(false);
    } catch {
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const memberSince = (user as any)?.createdAt
    ? new Date((user as any).createdAt).getFullYear()
    : new Date().getFullYear();

  const Field = ({
    label,
    value,
    onChange,
    keyboardType,
    autoCapitalize,
    editable = true,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    keyboardType?: any;
    autoCapitalize?: any;
    editable?: boolean;
  }) => (
    <View style={{ gap: 8 * s }}>
      <Text
        style={{
          color: '#6B7380',
          fontSize: 12 * s,
          fontWeight: '600',
          letterSpacing: 0.4,
          textAlign,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          height: 56 * s,
          paddingHorizontal: 16 * s,
          borderRadius: 14 * s,
          borderWidth: 1,
          borderColor: '#E5EBF2',
          backgroundColor: '#F5F7FC',
          justifyContent: 'center',
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChange}
          editable={editing && editable}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={{
            fontSize: 15 * s,
            fontWeight: '600',
            color: '#111111',
            padding: 0,
            textAlign,
          }}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <ScreenHeader
        title={t('profile.title', 'My profile')}
        rightLabel={
          editing
            ? saving
              ? undefined
              : t('common.save', 'Save')
            : t('common.edit', 'Edit')
        }
        onRightPress={editing ? handleSave : () => setEditing(true)}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20 * s, paddingBottom: 24 * s }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', marginTop: 16 * s }}>
          <TouchableOpacity activeOpacity={editing ? 0.85 : 1} onPress={handleAvatarPress}>
            <View
              style={{
                width: 112 * s,
                height: 112 * s,
                borderRadius: 56 * s,
                backgroundColor: '#F5F7FC',
                borderWidth: 1,
                borderColor: '#E5EBF2',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={{ width: 112 * s, height: 112 * s }} />
              ) : (
                <Ionicons name="person" size={48 * s} color="#6B7380" />
              )}
            </View>
            {editing && (
              <View
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: 0,
                  width: 36 * s,
                  height: 36 * s,
                  borderRadius: 18 * s,
                  backgroundColor: '#101969',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 3,
                  borderColor: '#FFFFFF',
                }}
              >
                <Ionicons name="camera" size={18 * s} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          <Text
            style={{
              marginTop: 14 * s,
              color: '#111111',
              fontSize: 22 * s,
              fontWeight: '700',
              letterSpacing: -0.4,
            }}
          >
            {firstName} {lastName}
          </Text>
          <Text
            style={{
              marginTop: 4 * s,
              color: '#6B7380',
              fontSize: 13 * s,
              fontWeight: '500',
            }}
          >
            {user?.mobileNumber || ''} · {t('profile.memberSince', 'Member since')} {memberSince}
          </Text>
        </View>

        {/* Wallet card */}
        <View
          style={{
            marginTop: 18 * s,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 14 * s,
            paddingHorizontal: 18 * s,
            paddingVertical: 16 * s,
            borderRadius: 18 * s,
            backgroundColor: '#101969',
          }}
        >
          <View
            style={{
              width: 40 * s,
              height: 40 * s,
              borderRadius: 20 * s,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="wallet" size={20 * s} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, gap: 2 * s }}>
            <Text
              style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 * s, fontWeight: '500', textAlign }}
            >
              {t('profile.walletBalance', 'Wallet balance')}
            </Text>
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 22 * s,
                fontWeight: '700',
                letterSpacing: -0.4,
                textAlign,
              }}
            >
              QAR {Number((user as any)?.walletBalance || 0).toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {}}
            style={{
              backgroundColor: '#FFFFFF',
              paddingHorizontal: 14 * s,
              paddingVertical: 8 * s,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: '#101969', fontSize: 13 * s, fontWeight: '600' }}>
              {t('profile.topUp', 'Top up')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={{ marginTop: 20 * s, gap: 14 * s }}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12 * s }}>
            <View style={{ flex: 1 }}>
              <Field
                label={t('profile.firstName', 'FIRST NAME')}
                value={firstName}
                onChange={setFirstName}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label={t('profile.lastName', 'LAST NAME')}
                value={lastName}
                onChange={setLastName}
              />
            </View>
          </View>
          <Field
            label={t('profile.email', 'EMAIL')}
            value={email}
            onChange={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label={t('profile.phone', 'PHONE')}
            value={user?.mobileNumber || ''}
            onChange={() => {}}
            editable={false}
          />
        </View>

        {saving && (
          <View style={{ marginTop: 16 * s, alignItems: 'center' }}>
            <ActivityIndicator color="#101969" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
