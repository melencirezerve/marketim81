import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCart, type Order, type OrderStatus } from '@/context/cart-context';

const DURUM_META: Record<OrderStatus, { label: string; bg: string; color: string }> = {
  alindi: { label: 'Sipariş Alındı', bg: '#e0edff', color: '#2563eb' },
  hazirlaniyor: { label: 'Hazırlanıyor', bg: '#fff3e0', color: '#e67e22' },
  yolda: { label: 'Yolda', bg: '#fdf2ff', color: '#a21caf' },
  kapinda: { label: 'Kapında', bg: '#eefdf3', color: '#10995a' },
};

export default function OrdersScreen() {
  const { orders } = useCart();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center bg-white px-5 pb-3 pt-2 shadow-sm" style={{ gap: 12 }}>
        <Pressable
          onPress={() => router.replace('/profile')}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface">
          <Ionicons name="arrow-back" size={20} color="#1e293b" />
        </Pressable>
        <Text className="text-lg font-extrabold text-gray-900">Siparişlerim</Text>
      </View>

      {orders.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-primary-50">
            <Ionicons name="receipt-outline" size={44} color="#1abc6e" />
          </View>
          <Text className="mt-6 text-lg font-bold text-gray-900">Henüz siparişiniz yok</Text>
          <Text className="mt-2 text-center text-sm text-gray-500">
            Market&apos;ten alışveriş yaparak ilk siparişinizi oluşturabilirsiniz.
          </Text>
          <Pressable
            onPress={() => router.navigate('/')}
            className="mt-6 rounded-2xl bg-primary-500 px-6 py-3">
            <Text className="font-semibold text-white">Alışverişe Başla</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          className="flex-1"
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 12 }}
          renderItem={({ item }) => <OrderCard order={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function OrderCard({ order }: { order: Order }) {
  const tarih = new Date(order.tarih).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const urunSayisi = order.items.reduce((sum, item) => sum + item.miktar, 0);
  const durumMeta = DURUM_META[order.durum];

  return (
    <View className="rounded-3xl bg-white p-4 shadow-sm">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-bold text-gray-900">{order.id}</Text>
        <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: durumMeta.bg }}>
          <Text className="text-[11px] font-bold" style={{ color: durumMeta.color }}>
            {durumMeta.label}
          </Text>
        </View>
      </View>

      <Text className="mt-1 text-xs text-gray-400">{tarih}</Text>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {order.items.slice(0, 4).map((item) => (
          <View key={item.product.id} className="rounded-full bg-primary-50 px-2.5 py-1">
            <Text className="text-xs font-medium text-primary-700" numberOfLines={1}>
              {item.product.ad} x{item.miktar}
            </Text>
          </View>
        ))}
        {order.items.length > 4 && (
          <View className="rounded-full bg-primary-50 px-2.5 py-1">
            <Text className="text-xs font-medium text-primary-700">+{order.items.length - 4}</Text>
          </View>
        )}
      </View>

      <View className="mt-3 flex-row items-center justify-between border-t border-surface pt-3">
        <Text className="text-xs text-gray-400">{urunSayisi} ürün</Text>
        <Text className="text-base font-extrabold text-primary-600">{order.toplam} ₺</Text>
      </View>
    </View>
  );
}
