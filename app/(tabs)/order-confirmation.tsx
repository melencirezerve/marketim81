import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCart } from '@/context/cart-context';

export default function OrderConfirmationScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { orders } = useCart();
  const order = orders.find((o) => o.id === orderId);

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-surface px-8">
      <View className="h-24 w-24 items-center justify-center rounded-full bg-primary-50">
        <Ionicons name="checkmark-circle" size={64} color="#1abc6e" />
      </View>

      <Text className="text-2xl font-bold text-gray-900" style={{ marginTop: 24 }}>
        Siparişiniz Alındı!
      </Text>
      <Text
        className="text-center text-sm text-gray-500"
        style={{ marginTop: 8, marginBottom: 32 }}>
        Siparişiniz hazırlanmaya başladı. En kısa sürede kapınızda olacak.
      </Text>

      <View className="w-full rounded-3xl bg-white p-5 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-500">Sipariş No</Text>
          <Text className="text-sm font-bold text-gray-900">{orderId}</Text>
        </View>
        <View className="mt-3 flex-row items-center justify-between border-t border-surface pt-3">
          <Text className="text-sm text-gray-500">Ürün Sayısı</Text>
          <Text className="text-sm font-bold text-gray-900">
            {order?.items.reduce((sum, item) => sum + item.miktar, 0) ?? 0} ürün
          </Text>
        </View>
        <View className="mt-3 flex-row items-center justify-between border-t border-surface pt-3">
          <Text className="text-sm text-gray-500">Toplam Tutar</Text>
          <Text className="text-lg font-extrabold text-primary-600">{order?.toplam ?? 0} ₺</Text>
        </View>
      </View>

      <Pressable
        onPress={() => router.replace('/orders')}
        className="w-full items-center rounded-2xl bg-primary-500 py-4"
        style={{ marginTop: 32 }}>
        <Text className="text-base font-bold text-white">Siparişlerimi Görüntüle</Text>
      </Pressable>

      <Pressable
        onPress={() => router.replace('/')}
        className="w-full items-center py-3"
        style={{ marginTop: 12 }}>
        <Text className="text-sm font-semibold text-gray-500">Alışverişe Devam Et</Text>
      </Pressable>
    </SafeAreaView>
  );
}
