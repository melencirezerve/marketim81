import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const menuItems: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = [
  { icon: 'receipt-outline', label: 'Siparişlerim', onPress: () => router.push('/orders') },
  { icon: 'location-outline', label: 'Adreslerim', onPress: () => router.push('/addresses') },
  { icon: 'card-outline', label: 'Ödeme Yöntemlerim', onPress: () => router.push('/payment-methods') },
  { icon: 'notifications-outline', label: 'Bildirimler', onPress: () => router.push('/notifications') },
  { icon: 'settings-outline', label: 'Ayarlar', onPress: () => router.push('/settings') },
  { icon: 'help-circle-outline', label: 'Yardım & Destek', onPress: () => router.push('/help') },
];

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <Text className="text-2xl font-bold text-gray-900">Profil</Text>

        <View className="mt-5 flex-row items-center rounded-3xl bg-white p-4 shadow-sm">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-500">
            <Text className="text-xl font-bold text-white">S81</Text>
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-lg font-bold text-gray-900">Siparis81 Kullanıcısı</Text>
            <Text className="mt-0.5 text-sm text-gray-400">melenraftingtesisi@gmail.com</Text>
          </View>
          <Pressable
            onPress={() => Alert.alert('Profili Düzenle', 'Bu özellik yakında eklenecek.')}
            className="h-9 w-9 items-center justify-center rounded-full bg-primary-50">
            <Ionicons name="create-outline" size={18} color="#1abc6e" />
          </Pressable>
        </View>

        <View className="mt-6 rounded-3xl bg-white shadow-sm">
          {menuItems.map((item, index) => (
            <Pressable
              key={item.label}
              onPress={item.onPress}
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

        <Pressable
          onPress={() =>
            Alert.alert('Çıkış Yap', 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?', [
              { text: 'Vazgeç', style: 'cancel' },
              { text: 'Çıkış Yap', style: 'destructive', onPress: () => router.navigate('/') },
            ])
          }
          className="mt-6 flex-row items-center justify-center rounded-2xl bg-white py-4 shadow-sm">
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text className="ml-2 text-base font-semibold text-red-500">Çıkış Yap</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
