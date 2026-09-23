import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { useCart, type CartItem } from '@/context/cart-context';
import { useCatalog } from '@/context/catalog-context';
import { ODEME_YONTEMLERI, type OdemeYontemi } from '@/lib/odeme-yontemleri';
import { tl } from '@/lib/para';
import { supabase } from '@/lib/supabase';

type Adres = { id: string; baslik: string; sokak: string; bina_no: string; daire_no: string; mahalle: string };

// kampanya_onizleme(): uygulanacak kampanya ve "X ₺ daha ekleyin" fırsatı. Asıl
// hesap sipariş anında sunucuda yapılır; bu yalnızca gösterim.
type KampanyaOnizleme = {
  kampanya: { id: string; ad: string; tur: string; indirim: number } | null;
  firsat: { ad: string; eksik: number } | null;
};


export default function CartScreen() {
  const { user, profile } = useAuth();
  const { items, increase, decrease, removeFromCart, totalPrice, totalCount, placeOrder } = useCart();
  const { products, ayarlar } = useCatalog();
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [odemeYontemi, setOdemeYontemi] = useState<OdemeYontemi>('kapida_nakit');
  const [adres, setAdres] = useState<Adres | null>(null);
  const [onizleme, setOnizleme] = useState<KampanyaOnizleme | null>(null);

  // Profildeki varsayılan ödeme yöntemi yüklenince sepette ön-seçili gelsin.
  useEffect(() => {
    if (profile?.tercih_odeme_yontemi) setOdemeYontemi(profile.tercih_odeme_yontemi);
  }, [profile?.tercih_odeme_yontemi]);

  // Adres ekranından dönünce (ekleme / varsayılan değiştirme) güncel adres görünsün.
  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setAdres(null);
        return;
      }
      supabase
        .from('addresses')
        .select('id, baslik, sokak, bina_no, daire_no, mahalle')
        .order('varsayilan', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => setAdres(data));
    }, [user])
  );

  // Sepet ya da adres değişince kampanya önizlemesini yenile (hızlı +/- basışlarında tek istek).
  const kalemAnahtari = items.map((i) => `${i.product.id}:${i.miktar}`).join(',');
  useEffect(() => {
    if (!user || items.length === 0) {
      setOnizleme(null);
      return;
    }
    let iptal = false;
    const zamanlayici = setTimeout(() => {
      supabase
        .rpc('kampanya_onizleme', {
          p_kalemler: items.map((i) => ({ product_id: i.product.id, miktar: i.miktar })),
          p_adres_id: adres?.id ?? null,
        })
        .then(({ data }) => {
          if (!iptal) setOnizleme((data as KampanyaOnizleme) ?? null);
        });
    }, 400);
    return () => {
      iptal = true;
      clearTimeout(zamanlayici);
    };
    // items kalemAnahtari ile temsil ediliyor; nesne kimliği her render'da değişmesin diye.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, kalemAnahtari, adres?.id]);

  // Gösterim için; asıl hesap siparis_olustur() içinde yapılır.
  const { minSepetTutari, teslimatUcreti, ucretsizTeslimatEsigi } = ayarlar;
  const ucretsizTeslimat = ucretsizTeslimatEsigi != null && totalPrice >= ucretsizTeslimatEsigi;
  const teslimat = ucretsizTeslimat ? 0 : teslimatUcreti;
  const minEksik = Math.max(minSepetTutari - totalPrice, 0);
  const ucretsizaKalan = ucretsizTeslimatEsigi != null && !ucretsizTeslimat ? ucretsizTeslimatEsigi - totalPrice : 0;
  const indirim = onizleme?.kampanya?.indirim ?? 0;

  const handleSiparisTamamla = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    if (!adres) {
      Alert.alert('Adres gerekli', 'Sipariş verebilmek için önce bir teslimat adresi eklemelisiniz.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Adres Ekle', onPress: () => router.push('/addresses') },
      ]);
      return;
    }

    setGonderiliyor(true);
    try {
      const orderId = await placeOrder(adres.id, odemeYontemi);
      router.push({ pathname: '/order-confirmation', params: { orderId } });
    } catch (e) {
      Alert.alert('Sipariş oluşturulamadı', e instanceof Error ? e.message : 'Bilinmeyen bir hata oluştu.');
    } finally {
      setGonderiliyor(false);
    }
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
          <CartRow
            item={item}
            stok={products.find((p) => p.id === item.product.id)?.stok ?? item.product.stok}
            onIncrease={increase}
            onDecrease={decrease}
            onRemove={removeFromCart}
          />
        )}
      />

      <View className="border-t border-gray-100 bg-white px-5 pb-6 pt-4">
        {user && (
          <Pressable
            onPress={() => router.push('/addresses')}
            className="mb-3 flex-row items-center rounded-2xl bg-surface px-3 py-3"
            style={{ gap: 10 }}>
            <Ionicons name="location-outline" size={18} color="#1abc6e" />
            <View className="flex-1">
              {adres ? (
                <>
                  <Text className="text-xs font-semibold text-gray-500">Teslimat: {adres.baslik}</Text>
                  <Text className="text-sm text-gray-800" numberOfLines={1}>
                    {adres.sokak} No:{adres.bina_no}
                    {adres.daire_no ? ` D:${adres.daire_no}` : ''}, {adres.mahalle} Mah.
                  </Text>
                </>
              ) : (
                <Text className="text-sm font-semibold text-gray-700">Teslimat adresi ekleyin</Text>
              )}
            </View>
            <Text className="text-xs font-bold text-primary-600">{adres ? 'Değiştir' : 'Ekle'}</Text>
          </Pressable>
        )}
        <Text className="mb-2 text-sm font-semibold text-gray-700">Ödeme Yöntemi</Text>
        <View className="mb-4 flex-row" style={{ gap: 10 }}>
          {ODEME_YONTEMLERI.map((o) => {
            const secili = odemeYontemi === o.id;
            return (
              <Pressable
                key={o.id}
                onPress={() => setOdemeYontemi(o.id)}
                className={`flex-1 flex-row items-center rounded-2xl border px-3 py-3 ${
                  secili ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'
                }`}
                style={{ gap: 8 }}>
                <Ionicons name={o.icon} size={18} color={secili ? '#1abc6e' : '#94a3b8'} />
                <Text className={`text-sm font-semibold ${secili ? 'text-primary-700' : 'text-gray-600'}`}>
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-500">Ara Toplam</Text>
          <Text className="text-sm font-semibold text-gray-700">{tl(totalPrice)}</Text>
        </View>
        <View className="mt-1 flex-row items-center justify-between">
          <Text className="text-sm text-gray-500">Teslimat Ücreti</Text>
          <Text className={`text-sm font-semibold ${teslimat === 0 ? 'text-primary-600' : 'text-gray-700'}`}>
            {teslimat === 0 ? 'Ücretsiz' : tl(teslimat)}
          </Text>
        </View>
        {onizleme?.kampanya && (
          <View className="mt-1 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-primary-600">🎉 {onizleme.kampanya.ad}</Text>
            <Text className="text-sm font-semibold text-primary-600">−{tl(indirim)}</Text>
          </View>
        )}
        {!onizleme?.kampanya && onizleme?.firsat && (
          <Text className="mt-1 text-xs font-semibold text-accent">
            🎁 {tl(onizleme.firsat.eksik)} daha ekleyin: {onizleme.firsat.ad}
          </Text>
        )}
        {ucretsizaKalan > 0 && (
          <Text className="mt-1 text-xs text-primary-600">
            {tl(ucretsizaKalan)} daha ekleyin, teslimat ücretsiz olsun.
          </Text>
        )}
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-base text-gray-500">Toplam</Text>
          <Text className="text-2xl font-extrabold text-gray-900">{tl(totalPrice + teslimat - indirim)}</Text>
        </View>
        {minEksik > 0 && (
          <Text className="mt-2 text-center text-xs font-semibold text-accent">
            Minimum sipariş tutarı {tl(minSepetTutari)}. Sepetinize {tl(minEksik)} daha ekleyin.
          </Text>
        )}
        <Pressable
          onPress={handleSiparisTamamla}
          disabled={gonderiliyor || minEksik > 0}
          className={`mt-4 items-center rounded-2xl py-4 ${minEksik > 0 ? 'bg-gray-300' : 'bg-primary-500'}`}>
          {gonderiliyor ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-bold text-white">Siparişi Tamamla</Text>
          )}
        </Pressable>
        <Text className="mt-2 text-center text-[11px] text-gray-400">
          Siparişi tamamlayarak{' '}
          <Text
            className="font-semibold text-gray-500 underline"
            onPress={() => router.push({ pathname: '/yasal/[sayfa]', params: { sayfa: 'mesafeli-satis' } })}>
            Mesafeli Satış Sözleşmesi
          </Text>
          &apos;ni kabul etmiş olursunuz.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function CartRow({
  item,
  stok,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  item: CartItem;
  stok: number;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { product, miktar } = item;
  const stokDoldu = miktar >= stok;

  return (
    <View className="flex-row items-center rounded-3xl bg-white p-3 shadow-sm">
      <View className="h-16 w-16 overflow-hidden rounded-2xl bg-primary-50">
        <Image source={{ uri: product.gorsel }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
          {product.ad}
        </Text>
        <Text className="mt-0.5 text-xs text-gray-400">{product.altKategori}</Text>
        <Text className="mt-1 text-sm font-semibold text-primary-600">{product.fiyat} ₺</Text>
        {miktar > stok && (
          <Text className="mt-0.5 text-xs font-semibold text-accent">
            {stok <= 0 ? 'Tükendi, sepetten çıkarın' : `Stokta ${stok} adet kaldı`}
          </Text>
        )}
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
            disabled={stokDoldu}
            className="h-8 w-8 items-center justify-center rounded-full bg-white">
            <Ionicons name="add" size={16} color={stokDoldu ? '#cbd5e1' : '#1abc6e'} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
