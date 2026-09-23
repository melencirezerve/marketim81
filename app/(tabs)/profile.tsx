import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';

const menuItems: { icon: keyof typeof Ionicons.glyphMap; label: string; href: string; needsAuth?: boolean }[] = [
  { icon: 'receipt-outline', label: 'Siparişlerim', href: '/orders', needsAuth: true },
  { icon: 'location-outline', label: 'Adreslerim', href: '/addresses', needsAuth: true },
  { icon: 'card-outline', label: 'Ödeme Yöntemlerim', href: '/payment-methods' },
  { icon: 'notifications-outline', label: 'Bildirimler', href: '/notifications' },
  { icon: 'settings-outline', label: 'Ayarlar', href: '/settings' },
  { icon: 'help-circle-outline', label: 'Yardım & Destek', href: '/help' },
];

function baslarHarfler(ad: string) {
  const parcalar = ad.trim().split(/\s+/).filter(Boolean);
  if (parcalar.length === 0) return 'S81';
  return parcalar
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase('tr'))
    .join('');
}

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuth();

  const menuePress = (item: (typeof menuItems)[number]) => {
    if (item.needsAuth && !user) {
      router.push('/auth');
      return;
    }
    router.push(item.href as never);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <Text className="text-2xl font-bold text-gray-900">Profil</Text>

        {user ? (
          <View className="mt-5 flex-row items-center rounded-3xl bg-white p-4 shadow-sm">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-500">
              <Text className="text-xl font-bold text-white">{baslarHarfler(profile?.ad ?? '')}</Text>
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-lg font-bold text-gray-900">
                {profile?.ad?.trim() || 'Siparis81 Kullanıcısı'}
              </Text>
              <Text className="mt-0.5 text-sm text-gray-400">{profile?.telefon || user.email}</Text>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => router.push('/auth')}
            className="mt-5 flex-row items-center rounded-3xl bg-white p-4 shadow-sm">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-50">
              <Ionicons name="person-outline" size={28} color="#1abc6e" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-lg font-bold text-gray-900">Giriş Yap</Text>
              <Text className="mt-0.5 text-sm text-gray-400">Siparişleriniz ve adresleriniz için giriş yapın</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </Pressable>
        )}

        <View className="mt-6 rounded-3xl bg-white shadow-sm">
          {menuItems.map((item, index) => (
            <Pressable
              key={item.label}
              onPress={() => menuePress(item)}
              className={`flex-row items-center px-4 py-4 ${
                index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
              }`}>
              <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-50">
                <Ionicons name={item.icon} size={18} color="#1abc6e" />
              </View>
              <Text className="ml-3 flex-1 text-base font-medium text-gray-800">{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </Pressable>
          ))}
        </View>

        {user && (
          <Pressable
            onPress={() =>
              Alert.alert('Çıkış Yap', 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?', [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'Çıkış Yap', style: 'destructive', onPress: () => signOut() },
              ])
            }
            className="mt-6 flex-row items-center justify-center rounded-2xl bg-white py-4 shadow-sm">
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text className="ml-2 text-base font-semibold text-red-500">Çıkış Yap</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
