import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCart, type AppNotification } from '@/context/cart-context';

function goreliZaman(tarih: string) {
  const farkMs = Date.now() - new Date(tarih).getTime();
  const dakika = Math.floor(farkMs / 60000);
  if (dakika < 1) return 'Az önce';
  if (dakika < 60) return `${dakika} dk önce`;
  const saat = Math.floor(dakika / 60);
  if (saat < 24) return `${saat} sa önce`;
  const gun = Math.floor(saat / 24);
  return `${gun} gün önce`;
}

export default function NotificationCenterScreen() {
  const { notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead } =
    useCart();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center justify-between bg-white px-5 pb-3 pt-2 shadow-sm">
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <Pressable
            onPress={() => router.replace('/')}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface">
            <Ionicons name="arrow-back" size={20} color="#1e293b" />
          </Pressable>
          <Text className="text-lg font-extrabold text-gray-900">Bildirimlerim</Text>
        </View>
        {unreadNotificationCount > 0 && (
          <Pressable onPress={markAllNotificationsRead}>
            <Text className="text-xs font-semibold text-primary-600">Tümünü Okundu İşaretle</Text>
          </Pressable>
        )}
      </View>

      {notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-primary-50">
            <Ionicons name="notifications-outline" size={44} color="#1abc6e" />
          </View>
          <Text className="mt-6 text-lg font-bold text-gray-900">Henüz bildiriminiz yok</Text>
          <Text className="mt-2 text-center text-sm text-gray-500">
            Sipariş verdiğinizde durum güncellemelerini burada göreceksiniz.
          </Text>
        </View>
      ) : (
        <FlatList
          className="flex-1"
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          renderItem={({ item }) => (
            <NotificationRow notification={item} onPress={() => markNotificationRead(item.id)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-start rounded-3xl bg-white p-4 shadow-sm"
      style={{ opacity: notification.okundu ? 0.6 : 1 }}>
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-50">
        <Ionicons name="receipt-outline" size={20} color="#1abc6e" />
      </View>
      <View className="ml-3 flex-1">
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Text className="flex-1 text-sm font-bold text-gray-900">{notification.baslik}</Text>
          {!notification.okundu && <View className="h-2 w-2 rounded-full bg-accent" />}
        </View>
        <Text className="mt-1 text-sm text-gray-500">{notification.mesaj}</Text>
        <Text className="mt-1.5 text-xs text-gray-400">{goreliZaman(notification.tarih)}</Text>
      </View>
    </Pressable>
  );
}
