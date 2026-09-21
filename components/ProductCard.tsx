import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, Text, View } from 'react-native';

import type { Product } from '@/context/catalog-context';

export function ProductCard({
  product,
  width: cardWidth,
  miktar,
  onAdd,
  onIncrease,
  onDecrease,
}: {
  product: Product;
  width: number;
  miktar: number;
  onAdd: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  return (
    <View
      style={{ width: cardWidth }}
      className="overflow-hidden rounded-3xl border border-surface bg-white p-3">
      <View className="mb-3 h-28 items-center justify-center overflow-hidden rounded-2xl bg-surface">
        <Image source={{ uri: product.gorsel }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        {product.stok <= 15 && (
          <View className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5">
            <Text className="text-[10px] font-bold text-white">Son {product.stok} adet</Text>
          </View>
        )}
      </View>

      <Text className="text-[11px] font-medium text-gray-400">{product.altKategori}</Text>
      <Text className="mt-0.5 h-10 text-sm font-bold text-gray-900" numberOfLines={2}>
        {product.ad}
      </Text>
      <Text className="mt-1 text-base font-extrabold text-primary-600">{product.fiyat} TL</Text>

      {miktar === 0 ? (
        <Pressable
          onPress={onAdd}
          className="mt-2 flex-row items-center justify-center rounded-xl bg-primary-500 py-2.5">
          <Text className="mr-1 text-xs font-bold text-white">Sepete Ekle</Text>
          <Ionicons name="add-circle" size={16} color="#ffffff" />
        </Pressable>
      ) : (
        <View className="mt-2 flex-row items-center justify-between rounded-xl bg-primary-50 px-1 py-1">
          <Pressable onPress={onDecrease} className="h-8 w-8 items-center justify-center">
            <Ionicons name="remove" size={16} color="#10995a" />
          </Pressable>
          <Text className="text-sm font-bold text-gray-900">{miktar}</Text>
          <Pressable onPress={onIncrease} className="h-8 w-8 items-center justify-center">
            <Ionicons name="add" size={16} color="#10995a" />
          </Pressable>
        </View>
      )}
    </View>
  );
}
