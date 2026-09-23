import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCart } from '@/context/cart-context';
import { useCatalog } from '@/context/catalog-context';

export default function UrunDetayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, categories } = useCatalog();
  const { items, addToCart } = useCart();
  const [adet, setAdet] = useState(1);

  const product = products.find((p) => p.id === id);
  const geri = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!product) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface px-10">
        <Ionicons name="alert-circle-outline" size={44} color="#cbd5e1" />
        <Text className="mt-3 text-center text-sm text-gray-500">Bu ürün artık satışta değil.</Text>
        <Pressable onPress={geri} className="mt-6 rounded-2xl bg-primary-500 px-6 py-3">
          <Text className="font-semibold text-white">Geri Dön</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const sepettekiMiktar = items.find((item) => item.product.id === product.id)?.miktar ?? 0;
  const eklenebilir = Math.max(product.stok - sepettekiMiktar, 0);
  const secilenAdet = Math.min(adet, Math.max(eklenebilir, 1));
  const kategoriAdlari = categories
    .filter((c) => product.categoryIds.includes(c.id))
    .map((c) => c.ad)
    .join(', ');

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center bg-white px-5 pb-3 pt-2 shadow-sm" style={{ gap: 12 }}>
        <Pressable onPress={geri} className="h-10 w-10 items-center justify-center rounded-full bg-surface">
          <Ionicons name="arrow-back" size={20} color="#1e293b" />
        </Pressable>
        <Text className="flex-1 text-lg font-extrabold text-gray-900" numberOfLines={1}>
          {product.ad}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="h-72 bg-white">
          <Image source={{ uri: product.gorsel }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>

        <View className="px-5 pt-5">
          {!!kategoriAdlari && <Text className="text-xs font-medium text-gray-400">{kategoriAdlari}</Text>}
          <Text className="mt-1 text-2xl font-extrabold text-gray-900">{product.ad}</Text>
          <Text className="mt-2 text-2xl font-extrabold text-primary-600">{product.fiyat} TL</Text>

          <View className="mt-3 flex-row">
            {product.stok <= 0 ? (
              <View className="rounded-full bg-gray-200 px-3 py-1">
                <Text className="text-xs font-bold text-gray-600">Stokta yok</Text>
              </View>
            ) : product.stok <= 15 ? (
              <View className="rounded-full bg-accent px-3 py-1">
                <Text className="text-xs font-bold text-white">Son {product.stok} adet</Text>
              </View>
            ) : (
              <View className="rounded-full bg-primary-50 px-3 py-1">
                <Text className="text-xs font-bold text-primary-700">Stokta var</Text>
              </View>
            )}
          </View>

          <Text className="mb-2 mt-6 text-sm font-bold text-gray-500">ÜRÜN AÇIKLAMASI</Text>
          <Text className="text-sm leading-6 text-gray-600">
            {product.aciklama.trim() || 'Bu ürün için henüz açıklama eklenmedi.'}
          </Text>
          {!!product.barkod && <Text className="mt-4 text-xs text-gray-400">Barkod: {product.barkod}</Text>}
        </View>
      </ScrollView>

      <View className="flex-row items-center border-t border-gray-100 bg-white px-5 pb-6 pt-4" style={{ gap: 12 }}>
        {eklenebilir > 0 ? (
          <>
            <View className="flex-row items-center rounded-2xl bg-surface px-1 py-1">
              <Pressable
                onPress={() => setAdet(Math.max(secilenAdet - 1, 1))}
                className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                <Ionicons name="remove" size={18} color="#1abc6e" />
              </Pressable>
              <Text className="mx-4 text-base font-bold text-gray-900">{secilenAdet}</Text>
              <Pressable
                onPress={() => setAdet(Math.min(secilenAdet + 1, eklenebilir))}
                disabled={secilenAdet >= eklenebilir}
                className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                <Ionicons name="add" size={18} color={secilenAdet >= eklenebilir ? '#cbd5e1' : '#1abc6e'} />
              </Pressable>
            </View>
            <Pressable
              onPress={() => {
                addToCart(product, secilenAdet);
                setAdet(1);
              }}
              className="flex-1 items-center rounded-2xl bg-primary-500 py-4">
              <Text className="text-base font-bold text-white">
                Sepete Ekle · {(product.fiyat * secilenAdet).toFixed(2).replace(/\.00$/, '')} TL
              </Text>
            </Pressable>
          </>
        ) : (
          <View className="flex-1 items-center rounded-2xl bg-gray-100 py-4">
            <Text className="text-base font-bold text-gray-400">
              {product.stok <= 0 ? 'Stokta Yok' : 'Stoktaki tüm ürünler sepetinizde'}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
