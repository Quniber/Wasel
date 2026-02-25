import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();

  const menuItems = [
    { icon: 'card-outline', label: t('profile.paymentMethods') || 'Payment Methods', route: '/(main)/payments' },
    { icon: 'location-outline', label: t('profile.savedPlaces') || 'Saved Places', route: '/(main)/(drawer)/places' },
    { icon: 'notifications-outline', label: t('profile.notifications') || 'Notifications', route: '/(main)/notifications' },
    { icon: 'shield-checkmark-outline', label: t('profile.safety') || 'Safety', route: '/(main)/safety' },
    { icon: 'help-circle-outline', label: t('profile.support') || 'Help & Support', route: '/(main)/(drawer)/support' },
    { icon: 'settings-outline', label: t('profile.settings') || 'Settings', route: '/(main)/(drawer)/settings' },
  ];

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/welcome');
  };

  const userInitials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || '?';

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{userInitials}</Text>
            </View>
          )}
        </View>
        <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.userEmail}>{user?.email || user?.mobileNumber}</Text>
        <TouchableOpacity style={styles.editButton} onPress={() => router.push('/(main)/profile')}>
          <Text style={styles.editButtonText}>{t('profile.edit') || 'Edit Profile'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => router.push(item.route as any)}
          >
            <Ionicons name={item.icon as any} size={24} color={Colors.text} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color={Colors.error} />
        <Text style={styles.logoutText}>{t('profile.logout') || 'Log Out'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundMuted,
  },
  profileHeader: {
    backgroundColor: Colors.background,
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 4,
  },
  editButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  editButtonText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  menuContainer: {
    backgroundColor: Colors.background,
    marginTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 16,
    backgroundColor: Colors.background,
  },
  logoutText: {
    fontSize: 16,
    color: Colors.error,
    marginLeft: 8,
    fontWeight: '600',
  },
});
