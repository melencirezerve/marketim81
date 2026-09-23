import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
  const tukendi = product.stok <= 0;
  const stokDoldu = miktar >= product.stok;

  return (
    <View
      style={{ width: cardWidth }}
      className="overflow-hidden rounded-3xl border border-surface bg-white p-3">
      <Pressable onPress={() => router.push({ pathname: '/urun/[id]', params: { id: product.id } })}>
        <View className="mb-3 h-28 items-center justify-center overflow-hidden rounded-2xl bg-surface">
          <Image
            source={{ uri: product.gorsel }}
            style={{ width: '100%', height: '100%', opacity: tukendi ? 0.4 : 1 }}
            resizeMode="cover"
          />
          {tukendi ? (
            <View className="absolute left-2 top-2 rounded-full bg-gray-700 px-2 py-0.5">
              <Text className="text-[10px] font-bold text-white">Tükendi</Text>
            </View>
          ) : (
            product.stok <= 15 && (
              <View className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5">
                <Text className="text-[10px] font-bold text-white">Son {product.stok} adet</Text>
              </View>
            )
          )}
        </View>

        <Text className="text-[11px] font-medium text-gray-400">{product.altKategori}</Text>
        <Text className="mt-0.5 h-10 text-sm font-bold text-gray-900" numberOfLines={2}>
          {product.ad}
        </Text>
        <Text className="mt-1 text-base font-extrabold text-primary-600">{product.fiyat} TL</Text>
      </Pressable>

      {tukendi && miktar === 0 ? (
        <View className="mt-2 flex-row items-center justify-center rounded-xl bg-gray-100 py-2.5">
          <Text className="text-xs font-bold text-gray-400">Stokta Yok</Text>
        </View>
      ) : miktar === 0 ? (
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
          <Pressable onPress={onIncrease} disabled={stokDoldu} className="h-8 w-8 items-center justify-center">
            <Ionicons name="add" size={16} color={stokDoldu ? '#cbd5e1' : '#10995a'} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
