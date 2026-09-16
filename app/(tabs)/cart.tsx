import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCart, type CartItem } from '@/context/cart-context';

export default function CartScreen() {
  const { items, increase, decrease, removeFromCart, totalPrice, totalCount, placeOrder } = useCart();

  const handleSiparisTamamla = () => {
    const orderId = placeOrder();
    router.push({ pathname: '/order-confirmation', params: { orderId } });
  };

  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface px-10" edges={['top']}>
        <View className="h-24 w-24 items-center justify-center rounded-full bg-primary-50">
          <Ionicons name="cart-outline" size={44} color="#1abc6e" />
        </View>
        <Text className="mt-6 text-lg font-bold text-gray-900">Sepetiniz boş</Text>
        <Text className="mt-2 text-center text-sm text-gray-500">
          Marketten ürünler ekleyerek alışverişe başlayabilirsiniz.
        </Text>
        <Pressable
          onPress={() => router.navigate('/')}
          className="mt-6 rounded-2xl bg-primary-500 px-6 py-3">
          <Text className="font-semibold text-white">Alışverişe Başla</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-5 pb-2 pt-2">
        <Text className="text-2xl font-bold text-gray-900">Sepetim</Text>
        <Text className="mt-1 text-sm text-gray-500">{totalCount} ürün sepetinizde</Text>
      </View>

      <FlatList
        className="flex-1"
        data={items}
        keyExtractor={(item) => item.product.id}
        contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 4 }}
        renderItem={({ item }) => (
          <CartRow item={item} onIncrease={increase} onDecrease={decrease} onRemove={removeFromCart} />
        )}
      />

      <View className="border-t border-gray-100 bg-white px-5 pb-6 pt-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-base text-gray-500">Toplam</Text>
          <Text className="text-2xl font-extrabold text-gray-900">{totalPrice} ₺</Text>
        </View>
        <Pressable
          onPress={handleSiparisTamamla}
          className="mt-4 items-center rounded-2xl bg-primary-500 py-4">
          <Text className="text-base font-bold text-white">Siparişi Tamamla</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function CartRow({
  item,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  item: CartItem;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { product, miktar } = item;

  return (
    <View className="flex-row items-center rounded-3xl bg-white p-3 shadow-sm">
      <View className="h-16 w-16 overflow-hidden rounded-2xl bg-primary-50">
        <Image source={{ uri: product.gorsel }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
          {product.ad}
        </Text>
        <Text className="mt-0.5 text-xs text-gray-400">{product.kategori}</Text>
        <Text className="mt-1 text-sm font-semibold text-primary-600">{product.fiyat} ₺</Text>
      </View>

      <View className="items-end">
        <Pressable onPress={() => onRemove(product.id)} className="mb-2 p-1">
          <Ionicons name="trash-outline" size={18} color="#cbd5e1" />
        </Pressable>
        <View className="flex-row items-center rounded-full bg-surface px-1">
          <Pressable
            onPress={() => onDecrease(product.id)}
            className="h-8 w-8 items-center justify-center rounded-full bg-white">
            <Ionicons name="remove" size={16} color="#1abc6e" />
          </Pressable>
          <Text className="mx-3 text-sm font-bold text-gray-900">{miktar}</Text>
          <Pressable
            onPress={() => onIncrease(product.id)}
            className="h-8 w-8 items-center justify-center rounded-full bg-white">
            <Ionicons name="add" size={16} color="#1abc6e" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
