import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from '@/context/auth-context';
import { useCatalog, type Category } from '@/context/catalog-context';
import { kampanyaKosullari, kampanyaSurdeMi } from '@/lib/kampanya';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 20 * 2 - 12) / 2;
const BANNER_WIDTH = width - 40;
const BANNER_HEIGHT = BANNER_WIDTH / 3.2;
const BANNER_GAP = 12;

const KATEGORI_GAP = 12;
const KATEGORI_TILE_WIDTH = (width - 40 - KATEGORI_GAP * 3) / 4;
const KATEGORI_CIRCLE = KATEGORI_TILE_WIDTH * 0.72;

export default function MarketScreen() {
  const [aramaKelimesi, setAramaKelimesi] = useState('');
  const { items, addToCart, increase, decrease, unreadNotificationCount } = useCart();
  const { categories, products, loading, error, refresh } = useCatalog();

  const filtrelenmisUrunler = useMemo(() => {
    return products.filter((urun) =>
      urun.ad.toLocaleLowerCase('tr').includes(aramaKelimesi.toLocaleLowerCase('tr'))
    );
  }, [products, aramaKelimesi]);

  const miktarBul = (productId: string) => items.find((item) => item.product.id === productId)?.miktar ?? 0;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface" edges={['top']}>
        <ActivityIndicator size="large" color="#10995a" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface px-10" edges={['top']}>
        <Text className="text-center text-sm text-gray-500">{error}</Text>
        <Pressable onPress={refresh} className="mt-4 rounded-xl bg-primary-500 px-4 py-2">
          <Text className="text-xs font-bold text-white">Tekrar Dene</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

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

          <Pressable
            onPress={() => router.push('/notification-center')}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface">
            <Ionicons name="notifications-outline" size={20} color="#1e293b" />
            {unreadNotificationCount > 0 && (
              <View className="absolute -right-1 -top-1 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 py-[1px]">
                <Text className="text-[10px] font-bold text-white">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </Text>
              </View>
            )}
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

            <KategoriIzgara categories={categories} />
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

function KategoriIzgara({ categories }: { categories: Category[] }) {
  const satir1 = categories.slice(0, 4);
  const satir2 = categories.slice(4, 8);
  const satir3 = categories.slice(8, 12);

  const satirRender = (satir: Category[], key: string) => (
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
            <Image source={{ uri: item.gorsel }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
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

// Afişler kampanyalardan gelir (admin panel → Kampanyalar): kampanya aktif ve
// tarih aralığındayken görünür, bitince kalkar. İlk sipariş kampanyası, daha önce
// sipariş vermiş müşteriye gösterilmez (asıl kontrol sunucuda, bu yalnızca görünüm).
function BannerSlider() {
  const { kampanyaAfisleri } = useCatalog();
  const { user } = useAuth();
  const { orders } = useCart();
  const [aktifIndex, setAktifIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const indexRef = useRef(0);

  const oncekiSiparisVar = !!user && orders.some((o) => o.durum !== 'iptal');
  const afisler = kampanyaAfisleri.filter(
    (k) => kampanyaSurdeMi(k) && !(k.sadeceIlkSiparis && oncekiSiparisVar)
  );
  const afisSayisi = afisler.length;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / (BANNER_WIDTH + BANNER_GAP));
    indexRef.current = index;
    setAktifIndex(index);
  };

  useEffect(() => {
    if (afisSayisi < 2) return;
    const timer = setInterval(() => {
      const next = (indexRef.current + 1) % afisSayisi;
      indexRef.current = next;
      listRef.current?.scrollToOffset({ offset: next * (BANNER_WIDTH + BANNER_GAP), animated: true });
      setAktifIndex(next);
    }, 3000);
    return () => clearInterval(timer);
  }, [afisSayisi]);

  if (afisSayisi === 0) return null;

  return (
    <View className="mb-5">
      <FlatList
        ref={listRef}
        horizontal
        data={afisler}
        keyExtractor={(k) => k.id}
        showsHorizontalScrollIndicator={false}
        pagingEnabled={false}
        snapToInterval={BANNER_WIDTH + BANNER_GAP}
        decelerationRate="fast"
        onMomentumScrollEnd={onScroll}
        contentContainerStyle={{ paddingHorizontal: 20, gap: BANNER_GAP }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => Alert.alert(item.ad, kampanyaKosullari(item))}
            accessibilityLabel={item.ad}>
            <Image
              source={{ uri: item.afisUrl }}
              style={{ width: BANNER_WIDTH, height: BANNER_HEIGHT, borderRadius: 20 }}
              resizeMode="cover"
            />
          </Pressable>
        )}
      />

      {afisSayisi > 1 && (
        <View className="mt-3 flex-row justify-center" style={{ gap: 6 }}>
          {afisler.map((k, index) => (
            <View
              key={k.id}
              style={{
                width: aktifIndex === index ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: aktifIndex === index ? '#10995a' : '#d1d5db',
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
