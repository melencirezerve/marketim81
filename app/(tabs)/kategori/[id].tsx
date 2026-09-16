import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductCard } from '@/components/ProductCard';
import { useCart } from '@/context/cart-context';
import { categories, products } from '@/data/products';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 20 * 2 - 12) / 2;
const BANNER_WIDTH = width - 40;
const TUM_ALT_KATEGORILER = 'Tümü';

const KATEGORI_SLOGAN: Record<string, string> = {
  tumu: 'TÜM İHTİYAÇLARINIZ\nBURADA',
  firin: 'FIRINDAN SICACIK\nLEZZETLER',
  sut: 'GÜNE TAZE SÜT\nÜRÜNLERİYLE BAŞLA',
  icecek: 'SERİNLETEN\nİÇECEKLER BURADA',
  atistirmalik: 'KEYFİNİZE KEYİF KATAN\nATIŞTIRMALIKLAR',
  temizlik: 'EVİNİZ İÇİN\nTEMİZLİK ÇÖZÜMLERİ',
  'meyve-sebze': 'TAPTAZE MEYVE\nVE SEBZELER',
  kahvaltilik: 'GÜNE GÜZEL BİR\nKAHVALTIYLA BAŞLAYIN',
  dondurulmus: 'PRATİK VE LEZZETLİ\nDONDURULMUŞ ÜRÜNLER',
  dondurma: 'SERİNLETEN\nDONDURMA ÇEŞİTLERİ',
  'kisisel-bakim': 'KENDİNİZE\nİYİ BAKIN',
  'kagit-urunleri': 'EVİNİZİN\nVAZGEÇİLMEZLERİ',
};

export default function KategoriDetayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [aktifId, setAktifId] = useState(id ?? 'tumu');
  const [aktifAltKategori, setAktifAltKategori] = useState(TUM_ALT_KATEGORILER);
  const [aramaKelimesi, setAramaKelimesi] = useState('');
  const { items, addToCart, increase, decrease } = useCart();

  const aktifKategori = categories.find((k) => k.id === aktifId);

  useEffect(() => {
    setAktifAltKategori(TUM_ALT_KATEGORILER);
  }, [aktifId]);

  useEffect(() => {
    if (id) setAktifId(id);
  }, [id]);

  const altKategoriler = useMemo(() => {
    if (aktifId === 'tumu') return [];
    const kategoriUrunleri = products.filter((urun) => urun.kategori === aktifKategori?.ad);
    const benzersiz = Array.from(new Set(kategoriUrunleri.map((urun) => urun.altKategori)));
    return [TUM_ALT_KATEGORILER, ...benzersiz];
  }, [aktifId, aktifKategori]);

  const urunler = useMemo(() => {
    return products.filter((urun) => {
      const kategoriUyum = aktifId === 'tumu' || urun.kategori === aktifKategori?.ad;
      const altKategoriUyum =
        aktifAltKategori === TUM_ALT_KATEGORILER || urun.altKategori === aktifAltKategori;
      const isimUyum = urun.ad.toLocaleLowerCase('tr').includes(aramaKelimesi.toLocaleLowerCase('tr'));
      return kategoriUyum && altKategoriUyum && isimUyum;
    });
  }, [aktifId, aktifKategori, aktifAltKategori, aramaKelimesi]);

  const miktarBul = (productId: string) => items.find((item) => item.product.id === productId)?.miktar ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="bg-white px-5 pb-3 pt-2 shadow-sm">
        <View className="mb-3 flex-row items-center" style={{ gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface">
            <Ionicons name="arrow-back" size={20} color="#1e293b" />
          </Pressable>
          <Text className="flex-1 text-lg font-extrabold text-gray-900" numberOfLines={1}>
            {aktifKategori?.ad ?? 'Tüm Ürünler'}
          </Text>
          <Pressable
            onPress={() => router.push('/cart')}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface">
            <Ionicons name="cart-outline" size={20} color="#1e293b" />
          </Pressable>
        </View>

        <View className="flex-row items-center rounded-2xl bg-surface px-4 py-3">
          <Ionicons name="search-outline" size={20} color="#94a3b8" />
          <TextInput
            placeholder="Ürün ara..."
            placeholderTextColor="#94a3b8"
            className="ml-3 flex-1 text-sm font-medium text-gray-900"
            value={aramaKelimesi}
            onChangeText={setAramaKelimesi}
          />
        </View>
      </View>

      <View className="bg-white pb-3 shadow-sm">
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
          renderItem={({ item }) => {
            const aktifMi = aktifId === item.id;
            return (
              <Pressable
                onPress={() => setAktifId(item.id)}
                className={`rounded-2xl border px-4 py-2 ${
                  aktifMi ? 'border-primary-500 bg-primary-500' : 'border-surface bg-surface'
                }`}>
                <Text className={`text-xs font-semibold ${aktifMi ? 'text-white' : 'text-gray-600'}`}>
                  {item.ad}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {altKategoriler.length > 0 && (
        <View className="border-t border-surface bg-white pb-3 pt-3 shadow-sm">
          <FlatList
            horizontal
            data={altKategoriler}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            renderItem={({ item }) => {
              const aktifMi = aktifAltKategori === item;
              return (
                <Pressable
                  onPress={() => setAktifAltKategori(item)}
                  className={`rounded-xl border px-3 py-1.5 ${
                    aktifMi ? 'border-primary-600 bg-primary-50' : 'border-surface bg-white'
                  }`}>
                  <Text className={`text-[11px] font-semibold ${aktifMi ? 'text-primary-700' : 'text-gray-500'}`}>
                    {item}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      )}

      <FlatList
        className="flex-1"
        data={urunler}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
        contentContainerStyle={{ gap: 14, paddingTop: 16, paddingBottom: 24 }}
        ListHeaderComponent={
          aktifKategori ? (
            <View className="mb-2 px-5">
              <View
                style={{ width: BANNER_WIDTH, height: BANNER_WIDTH / 2.6 }}
                className="overflow-hidden rounded-3xl">
                <Image
                  source={aktifKategori.gorsel}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
                <View className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} />
                <View className="absolute inset-0 items-start justify-center px-5">
                  <Text className="text-xl font-extrabold uppercase leading-7 text-white">
                    {KATEGORI_SLOGAN[aktifId] ?? aktifKategori.ad}
                  </Text>
                </View>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View className="mt-20 items-center px-10">
            <Ionicons name="search-outline" size={40} color="#cbd5e1" />
            <Text className="mt-3 text-center text-sm text-gray-400">
              Bu kategoride ürün bulunamadı.
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
