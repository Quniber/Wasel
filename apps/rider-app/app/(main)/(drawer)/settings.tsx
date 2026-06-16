import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '@/components/ScreenHeader';
import AlertModal from '@/components/AlertModal';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api';
import { changeLanguage } from '@/i18n';

const BASE_W = 393;

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { logout } = useAuthStore();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;
  const isRTL = i18n.language === 'ar';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);

  const doLogout = async () => {
    setLogoutOpen(false);
    await logout();
    router.replace('/(auth)/welcome');
  };

  const doDelete = async () => {
    setDeleteOpen(false);
    try {
      await authApi.deleteAccount();
      await logout();
      router.replace('/(auth)/welcome');
    } catch {
      setErrorOpen(true);
    }
  };

  const languages: Array<{ code: 'en' | 'ar'; label: string }> = [
    { code: 'en', label: t('settings.english', 'English') },
    { code: 'ar', label: t('settings.arabic', 'العربية') },
  ];

  const SectionLabel = ({ children }: { children: string }) => (
    <Text
      style={{
        color: '#6B7380',
        fontSize: 11 * s,
        fontWeight: '600',
        letterSpacing: 1,
        marginTop: 18 * s,
        marginBottom: 10 * s,
        paddingHorizontal: 4 * s,
        textAlign,
      }}
    >
      {children.toUpperCase()}
    </Text>
  );

  const Card = ({ children }: { children: React.ReactNode }) => (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16 * s,
        borderWidth: 1,
        borderColor: '#E5EBF2',
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );

  const Row = ({
    label,
    onPress,
    right,
    danger,
    showDivider,
  }: {
    label: string;
    onPress?: () => void;
    right?: React.ReactNode;
    danger?: boolean;
    showDivider?: boolean;
  }) => (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        paddingHorizontal: 16 * s,
        paddingVertical: 16 * s,
        borderBottomWidth: showDivider ? 1 : 0,
        borderBottomColor: '#E5EBF2',
      }}
    >
      <Text
        style={{
          flex: 1,
          color: danger ? '#ED4557' : '#111111',
          fontSize: 15 * s,
          fontWeight: danger ? '600' : '500',
          textAlign,
        }}
      >
        {label}
      </Text>
      {right ?? (
        onPress && (
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={18 * s}
            color="#6B7380"
          />
        )
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <ScreenHeader title={t('settings.title', 'Settings')} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20 * s,
          paddingTop: 4 * s,
          paddingBottom: 32 * s,
        }}
      >
        <SectionLabel>{t('settings.language', 'Language')}</SectionLabel>
        <Card>
          {languages.map((lang, idx) => {
            const sel = i18n.language === lang.code;
            return (
              <Row
                key={lang.code}
                label={lang.label}
                onPress={() => changeLanguage(lang.code)}
                showDivider={idx < languages.length - 1}
                right={
                  sel ? (
                    <Ionicons name="checkmark" size={20 * s} color="#101969" />
                  ) : null
                }
              />
            );
          })}
        </Card>

        <SectionLabel>{t('settings.account', 'Account')}</SectionLabel>
        <Card>
          <Row
            label={t('settings.changePassword', 'Change password')}
            onPress={() => router.push('/(auth)/forgot-password' as any)}
            showDivider
          />
          <Row
            label={t('settings.deleteAccount', 'Delete account')}
            onPress={() => setDeleteOpen(true)}
            danger
          />
        </Card>

        <SectionLabel>{t('settings.about', 'About')}</SectionLabel>
        <Card>
          <Row
            label={t('settings.version', 'Version')}
            right={
              <Text style={{ color: '#6B7380', fontSize: 14 * s, fontWeight: '500' }}>
                1.0.0
              </Text>
            }
            showDivider
          />
          <Row
            label={t('settings.terms', 'Terms of Service')}
            onPress={() => {}}
            showDivider
          />
          <Row label={t('settings.privacy', 'Privacy Policy')} onPress={() => {}} />
        </Card>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setLogoutOpen(true)}
          style={{
            marginTop: 24 * s,
            height: 56 * s,
            borderRadius: 14 * s,
            backgroundColor: '#FFEBED',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#ED4557', fontSize: 16 * s, fontWeight: '600' }}>
            {t('settings.logout', 'Log out')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <AlertModal
        visible={logoutOpen}
        variant="warning"
        title={t('settings.logout', 'Log out')}
        message={t('settings.logoutConfirm', 'Are you sure you want to log out?')}
        primaryLabel={t('settings.logout', 'Log out')}
        secondaryLabel={t('common.cancel', 'Cancel')}
        primaryColor="#ED4557"
        onPrimaryPress={doLogout}
        onSecondaryPress={() => setLogoutOpen(false)}
        onRequestClose={() => setLogoutOpen(false)}
      />

      <AlertModal
        visible={deleteOpen}
        variant="error"
        title={t('settings.deleteAccount', 'Delete account')}
        message={t('settings.deleteAccountConfirm', 'This action cannot be undone. Are you sure?')}
        primaryLabel={t('settings.deleteAccount', 'Delete account')}
        secondaryLabel={t('common.cancel', 'Cancel')}
        primaryColor="#ED4557"
        onPrimaryPress={doDelete}
        onSecondaryPress={() => setDeleteOpen(false)}
        onRequestClose={() => setDeleteOpen(false)}
      />

      <AlertModal
        visible={errorOpen}
        variant="error"
        title={t('common.error', 'Error')}
        message={t('settings.deleteAccountError', 'Could not delete account. Please try again.')}
        primaryLabel={t('common.ok', 'OK')}
        onPrimaryPress={() => setErrorOpen(false)}
        onRequestClose={() => setErrorOpen(false)}
      />
    </SafeAreaView>
  );
}
