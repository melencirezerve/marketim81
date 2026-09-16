import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/ProductCard';
import { useCart } from '@/context/cart-context';
import { categories, products } from '@/data/products';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 20 * 2 - 12) / 2;
const BANNER_WIDTH = width - 40;
const BANNER_HEIGHT = BANNER_WIDTH / 3.2;
const BANNER_GAP = 12;

const KATEGORI_GAP = 12;
const KATEGORI_TILE_WIDTH = (width - 40 - KATEGORI_GAP * 3) / 4;
const KATEGORI_CIRCLE = KATEGORI_TILE_WIDTH * 0.72;

const BANNER_GORSELLERI = [
  require('../../assets/images/banner-1.png'),
  require('../../assets/images/banner-2.png'),
  require('../../assets/images/banner-3.png'),
  require('../../assets/images/banner-4.png'),
];

export default function MarketScreen() {
  const [aramaKelimesi, setAramaKelimesi] = useState('');
  const { items, addToCart, increase, decrease } = useCart();

  const filtrelenmisUrunler = useMemo(() => {
    return products.filter((urun) =>
      urun.ad.toLocaleLowerCase('tr').includes(aramaKelimesi.toLocaleLowerCase('tr'))
    );
  }, [aramaKelimesi]);

  const miktarBul = (productId: string) => items.find((item) => item.product.id === productId)?.miktar ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="rounded-b-3xl bg-white px-5 pb-4 pt-2 shadow-sm">
        <View className="mb-3 flex-row items-center justify-between">
          <Pressable
            onPress={() => router.push('/profile')}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface">
            <Ionicons name="menu" size={22} color="#1e293b" />
          </Pressable>

          <Image
            source={require('../../assets/images/marketim81-logo.png')}
            style={{ width: 116, height: 45 }}
            resizeMode="contain"
          />

          <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-surface">
            <Ionicons name="notifications-outline" size={20} color="#1e293b" />
          </Pressable>
        </View>

        <View className="mb-4 flex-row items-center">
          <Ionicons name="location" size={14} color="#ef4444" />
          <Text className="ml-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Teslimat Adresi
          </Text>
          <Text className="ml-1 text-xs font-bold text-gray-900">Cumayeri, Merkez...</Text>
          <Ionicons name="chevron-down" size={12} color="#1e293b" style={{ marginLeft: 2 }} />
        </View>

        <View className="flex-row items-center rounded-2xl bg-surface px-4 py-3">
          <Ionicons name="search-outline" size={20} color="#94a3b8" />
          <TextInput
            placeholder="Ürün veya kategori ara..."
            placeholderTextColor="#94a3b8"
            className="ml-3 flex-1 text-sm font-medium text-gray-900"
            value={aramaKelimesi}
            onChangeText={setAramaKelimesi}
          />
        </View>
      </View>

      <FlatList
        className="flex-1"
        data={filtrelenmisUrunler}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
        contentContainerStyle={{ gap: 14, paddingBottom: 24 }}
        ListHeaderComponent={
          <View>
            <BannerSlider />

            <KategoriIzgara />
          </View>
        }
        ListEmptyComponent={
          <View className="mt-20 items-center px-10">
            <Ionicons name="search-outline" size={40} color="#cbd5e1" />
            <Text className="mt-3 text-center text-sm text-gray-400">
              Aramanızla eşleşen ürün bulunamadı.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            width={CARD_WIDTH}
            miktar={miktarBul(item.id)}
            onAdd={() => addToCart(item)}
            onIncrease={() => increase(item.id)}
            onDecrease={() => decrease(item.id)}
          />
        )}
      />
    </SafeAreaView>
  );
}

function KategoriIzgara() {
  const satir1 = categories.slice(0, 4);
  const satir2 = categories.slice(4, 8);
  const satir3 = categories.slice(8, 12);

  const satirRender = (satir: typeof categories, key: string) => (
    <View key={key} className="flex-row px-5" style={{ gap: KATEGORI_GAP }}>
      {satir.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => router.push({ pathname: '/kategori/[id]', params: { id: item.id } })}
          style={{ width: KATEGORI_TILE_WIDTH }}
          className="items-center rounded-2xl bg-white py-3 shadow-sm">
          <View
            style={{
              width: KATEGORI_CIRCLE,
              height: KATEGORI_CIRCLE,
              borderRadius: 14,
              overflow: 'hidden',
            }}>
            <Image source={item.gorsel} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </View>
          <Text
            numberOfLines={1}
            className="mt-1.5 text-center text-[10px] font-semibold text-gray-600">
            {item.ad}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View className="mb-5 px-0">
      <Text className="mb-3 px-5 text-lg font-extrabold text-gray-900">Kategoriler</Text>
      <View style={{ gap: 16 }}>
        {satirRender(satir1, 'r1')}
        {satirRender(satir2, 'r2')}
        {satirRender(satir3, 'r3')}
      </View>
    </View>
  );
}

function BannerSlider() {
  const [aktifIndex, setAktifIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const indexRef = useRef(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / (BANNER_WIDTH + BANNER_GAP));
    indexRef.current = index;
    setAktifIndex(index);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (indexRef.current + 1) % BANNER_GORSELLERI.length;
      indexRef.current = next;
      listRef.current?.scrollToOffset({ offset: next * (BANNER_WIDTH + BANNER_GAP), animated: true });
      setAktifIndex(next);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View className="mb-5">
      <FlatList
        ref={listRef}
        horizontal
        data={BANNER_GORSELLERI}
        keyExtractor={(_, index) => `banner-${index}`}
        showsHorizontalScrollIndicator={false}
        pagingEnabled={false}
        snapToInterval={BANNER_WIDTH + BANNER_GAP}
        decelerationRate="fast"
        onMomentumScrollEnd={onScroll}
        contentContainerStyle={{ paddingHorizontal: 20, gap: BANNER_GAP }}
        renderItem={({ item }) => (
          <Image
            source={item}
            style={{ width: BANNER_WIDTH, height: BANNER_HEIGHT, borderRadius: 20 }}
            resizeMode="cover"
          />
        )}
      />

      <View className="mt-3 flex-row justify-center" style={{ gap: 6 }}>
        {BANNER_GORSELLERI.map((_, index) => (
          <View
            key={index}
            style={{
              width: aktifIndex === index ? 18 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: aktifIndex === index ? '#10995a' : '#d1d5db',
            }}
          />
        ))}
      </View>
    </View>
  );
}
