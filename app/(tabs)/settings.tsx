import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';

type SettingsRow = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
};

export default function SettingsScreen() {
  const { user, deleteAccount } = useAuth();
  const [siliniyor, setSiliniyor] = useState(false);

  const yakindaUyar = (ozellik: string) =>
    Alert.alert(ozellik, 'Bu özellik yakında eklenecek.');

  const rows: SettingsRow[] = [
    {
      icon: 'notifications-outline',
      label: 'Bildirim İzinleri',
      onPress: () => router.push('/notifications'),
    },
    {
      icon: 'language-outline',
      label: 'Dil',
      value: 'Türkçe',
      onPress: () => yakindaUyar('Dil Seçenekleri'),
    },
    {
      icon: 'shield-checkmark-outline',
      label: 'Gizlilik Politikası',
      onPress: () => router.push({ pathname: '/yasal/[sayfa]', params: { sayfa: 'gizlilik' } }),
    },
    {
      icon: 'finger-print-outline',
      label: 'KVKK Aydınlatma Metni',
      onPress: () => router.push({ pathname: '/yasal/[sayfa]', params: { sayfa: 'kvkk' } }),
    },
    {
      icon: 'document-text-outline',
      label: 'Kullanım Şartları',
      onPress: () => router.push({ pathname: '/yasal/[sayfa]', params: { sayfa: 'kullanim' } }),
    },
    {
      icon: 'receipt-outline',
      label: 'Mesafeli Satış Sözleşmesi',
      onPress: () => router.push({ pathname: '/yasal/[sayfa]', params: { sayfa: 'mesafeli-satis' } }),
    },
  ];

  const hesabiSil = () =>
    Alert.alert(
      'Hesabımı Sil',
      'Hesabınız, adınız, telefon numaranız ve kayıtlı adresleriniz kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Hesabı Sil',
          style: 'destructive',
          onPress: async () => {
            setSiliniyor(true);
            const hata = await deleteAccount();
            setSiliniyor(false);
            if (hata) {
              Alert.alert('Hesap silinemedi', hata);
              return;
            }
            Alert.alert('Hesabınız silindi', 'Kişisel bilgileriniz silindi.');
            router.replace('/profile');
          },
        },
      ]
    );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center bg-white px-5 pb-3 pt-2 shadow-sm" style={{ gap: 12 }}>
        <Pressable
          onPress={() => router.replace('/profile')}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface">
          <Ionicons name="arrow-back" size={20} color="#1e293b" />
        </Pressable>
        <Text className="text-lg font-extrabold text-gray-900">Ayarlar</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <View className="rounded-3xl bg-white shadow-sm">
          {rows.map((row, index) => (
            <Pressable
              key={row.label}
              onPress={row.onPress}
              className={`flex-row items-center px-4 py-4 ${
                index !== rows.length - 1 ? 'border-b border-gray-100' : ''
              }`}>
              <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-50">
                <Ionicons name={row.icon} size={18} color="#1abc6e" />
              </View>
              <Text className="ml-3 flex-1 text-base font-medium text-gray-800">{row.label}</Text>
              {row.value && <Text className="mr-2 text-sm text-gray-400">{row.value}</Text>}
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </Pressable>
          ))}
        </View>

        {user && (
          <Pressable
            onPress={hesabiSil}
            disabled={siliniyor}
            className="mt-6 flex-row items-center justify-center rounded-3xl bg-white py-4 shadow-sm"
            style={{ gap: 8 }}>
            {siliniyor ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                <Text className="text-base font-semibold text-red-500">Hesabımı Sil</Text>
              </>
            )}
          </Pressable>
        )}

        <View className="mt-6 items-center">
          <Text className="text-xs text-gray-400">Siparis81 · Sürüm {Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
