import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, Switch, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCart, type NotificationPreferenceKey } from '@/context/cart-context';

type Bildirim = {
  key: NotificationPreferenceKey;
  icon: keyof typeof Ionicons.glyphMap;
  baslik: string;
  aciklama: string;
};

const bildirimTurleri: Bildirim[] = [
  {
    key: 'siparis',
    icon: 'receipt-outline',
    baslik: 'Sipariş Bildirimleri',
    aciklama: 'Sipariş durumu ve teslimat güncellemeleri',
  },
  {
    key: 'kampanya',
    icon: 'pricetag-outline',
    baslik: 'Kampanya ve İndirimler',
    aciklama: 'Fırsatlar ve özel indirimlerden haberdar olun',
  },
  {
    key: 'urun',
    icon: 'sparkles-outline',
    baslik: 'Yeni Ürünler',
    aciklama: 'Markete eklenen yeni ürünler',
  },
  {
    key: 'uygulama',
    icon: 'phone-portrait-outline',
    baslik: 'Uygulama Güncellemeleri',
    aciklama: 'Yeni özellikler ve iyileştirmeler',
  },
];

export default function NotificationsScreen() {
  const { notificationPreferences, setNotificationPreference } = useCart();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center bg-white px-5 pb-3 pt-2 shadow-sm" style={{ gap: 12 }}>
        <Pressable
          onPress={() => router.replace('/profile')}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface">
          <Ionicons name="arrow-back" size={20} color="#1e293b" />
        </Pressable>
        <Text className="text-lg font-extrabold text-gray-900">Bildirimler</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <View className="rounded-3xl bg-white shadow-sm">
          {bildirimTurleri.map((b, index) => (
            <View
              key={b.key}
              className={`flex-row items-center px-4 py-4 ${
                index !== bildirimTurleri.length - 1 ? 'border-b border-gray-100' : ''
              }`}>
              <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-50">
                <Ionicons name={b.icon} size={18} color="#1abc6e" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-bold text-gray-900">{b.baslik}</Text>
                <Text className="mt-0.5 text-xs text-gray-400">{b.aciklama}</Text>
              </View>
              <Switch
                value={notificationPreferences[b.key]}
                onValueChange={(value) => setNotificationPreference(b.key, value)}
                trackColor={{ false: '#e2e8f0', true: '#7ce8ac' }}
                thumbColor={notificationPreferences[b.key] ? '#1abc6e' : '#f4f4f5'}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
