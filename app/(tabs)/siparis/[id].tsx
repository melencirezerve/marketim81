import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCart, type OrderStatus } from '@/context/cart-context';
import { odemeYontemiLabel } from '@/lib/odeme-yontemleri';
import { DURUM_META, tarihSaat } from '@/lib/siparis-durumu';
import { supabase } from '@/lib/supabase';

const ADIMLAR: OrderStatus[] = ['alindi', 'hazirlaniyor', 'yolda', 'kapinda'];

const tl = (n: number) => `${n.toFixed(2).replace(/\.00$/, '')} ₺`;

export default function SiparisDetayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders, cancelOrder, reorder } = useCart();
  const [gecmis, setGecmis] = useState<{ durum: OrderStatus; created_at: string }[]>([]);
  const [iptalEdiliyor, setIptalEdiliyor] = useState(false);

  const order = orders.find((o) => o.id === id);

  // Durum Realtime ile değişince zaman damgaları da gelsin diye durum deps'te.
  useEffect(() => {
    if (!id) return;
    supabase
      .from('order_status_history')
      .select('durum, created_at')
      .eq('order_id', id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setGecmis((data as typeof gecmis) ?? []));
  }, [id, order?.durum]);

  const geri = () => router.replace('/orders');

  if (!order) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface px-10">
        <Text className="text-sm text-gray-500">Sipariş bulunamadı.</Text>
        <Pressable onPress={geri} className="mt-6 rounded-2xl bg-primary-500 px-6 py-3">
          <Text className="font-semibold text-white">Siparişlerime Dön</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const durumMeta = DURUM_META[order.durum];
  const iptal = order.durum === 'iptal';
  const aktifAdim = ADIMLAR.indexOf(order.durum);
  const zaman = (durum: OrderStatus) => gecmis.find((g) => g.durum === durum)?.created_at;

  const iptalEt = () =>
    Alert.alert('Siparişi iptal et', `${order.id} numaralı siparişi iptal etmek istiyor musunuz?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal Et',
        style: 'destructive',
        onPress: async () => {
          setIptalEdiliyor(true);
          try {
            await cancelOrder(order.id);
          } catch (e) {
            Alert.alert('İptal edilemedi', e instanceof Error ? e.message : 'Bilinmeyen bir hata oluştu.');
          } finally {
            setIptalEdiliyor(false);
          }
        },
      },
    ]);

  const tekrarSiparis = () => {
    const eksik = reorder(order);
    if (eksik === order.items.length) {
      Alert.alert('Ürünler eklenemedi', 'Bu siparişteki ürünlerin hiçbiri şu an stokta yok.');
      return;
    }
    if (eksik > 0) {
      Alert.alert('Sepete eklendi', `${eksik} ürün stokta olmadığı için eksik eklendi veya eklenemedi.`, [
        { text: 'Sepete Git', onPress: () => router.navigate('/cart') },
      ]);
      return;
    }
    router.navigate('/cart');
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center bg-white px-5 pb-3 pt-2 shadow-sm" style={{ gap: 12 }}>
        <Pressable onPress={geri} className="h-10 w-10 items-center justify-center rounded-full bg-surface">
          <Ionicons name="arrow-back" size={20} color="#1e293b" />
        </Pressable>
        <Text className="flex-1 text-lg font-extrabold text-gray-900">{order.id}</Text>
        <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: durumMeta.bg }}>
          <Text className="text-[11px] font-bold" style={{ color: durumMeta.color }}>
            {durumMeta.label}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 32 }}>
        <View className="rounded-3xl bg-white p-4 shadow-sm">
          <Text className="mb-3 text-sm font-bold text-gray-500">SİPARİŞ DURUMU</Text>
          {iptal ? (
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <Ionicons name="close-circle" size={22} color="#64748b" />
              <View>
                <Text className="text-sm font-semibold text-gray-800">Sipariş iptal edildi</Text>
                {zaman('iptal') && <Text className="text-xs text-gray-400">{tarihSaat(zaman('iptal')!)}</Text>}
              </View>
            </View>
          ) : (
            ADIMLAR.map((adim, i) => {
              const tamam = i <= aktifAdim;
              const t = zaman(adim);
              return (
                <View key={adim} className="flex-row" style={{ gap: 10 }}>
                  <View className="items-center">
                    <Ionicons
                      name={tamam ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={tamam ? '#1abc6e' : '#cbd5e1'}
                    />
                    {i < ADIMLAR.length - 1 && (
                      <View className={`w-0.5 flex-1 ${i < aktifAdim ? 'bg-primary-500' : 'bg-gray-200'}`} />
                    )}
                  </View>
                  <View className="pb-4">
                    <Text className={`text-sm font-semibold ${tamam ? 'text-gray-800' : 'text-gray-400'}`}>
                      {DURUM_META[adim].label}
                    </Text>
                    {tamam && t && <Text className="text-xs text-gray-400">{tarihSaat(t)}</Text>}
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View className="rounded-3xl bg-white p-4 shadow-sm">
          <Text className="mb-3 text-sm font-bold text-gray-500">ÜRÜNLER</Text>
          {order.items.map((item, i) => (
            <View
              key={`${item.productId}-${i}`}
              className={`flex-row items-center py-2 ${i > 0 ? 'border-t border-gray-100' : ''}`}
              style={{ gap: 12 }}>
              <Image source={{ uri: item.gorsel }} style={{ width: 44, height: 44, borderRadius: 12 }} />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-800" numberOfLines={1}>
                  {item.ad}
                </Text>
                <Text className="text-xs text-gray-400">
                  {item.miktar} x {tl(item.fiyat)}
                </Text>
              </View>
              <Text className="text-sm font-bold text-gray-800">{tl(item.fiyat * item.miktar)}</Text>
            </View>
          ))}
          <View className="mt-2 border-t border-gray-100 pt-3" style={{ gap: 4 }}>
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-500">Ara Toplam</Text>
              <Text className="text-sm text-gray-700">{tl(order.araToplam)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-gray-500">Teslimat Ücreti</Text>
              <Text className="text-sm text-gray-700">
                {order.teslimatUcreti === 0 ? 'Ücretsiz' : tl(order.teslimatUcreti)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-base font-bold text-gray-800">Toplam</Text>
              <Text className="text-base font-extrabold text-primary-600">{tl(order.toplam)}</Text>
            </View>
          </View>
        </View>

        <View className="rounded-3xl bg-white p-4 shadow-sm" style={{ gap: 10 }}>
          <View>
            <Text className="text-xs font-semibold text-gray-400">Sipariş Tarihi</Text>
            <Text className="text-sm text-gray-800">{tarihSaat(order.tarih)}</Text>
          </View>
          <View>
            <Text className="text-xs font-semibold text-gray-400">Ödeme</Text>
            <Text className="text-sm text-gray-800">{odemeYontemiLabel(order.odemeYontemi)}</Text>
          </View>
          {order.teslimatAdresi && (
            <View>
              <Text className="text-xs font-semibold text-gray-400">Teslimat Adresi</Text>
              <Text className="text-sm text-gray-800">{order.teslimatAdresi}</Text>
            </View>
          )}
        </View>

        <Pressable onPress={tekrarSiparis} className="items-center rounded-2xl bg-primary-500 py-4">
          <Text className="text-base font-bold text-white">Tekrar Sipariş Ver</Text>
        </Pressable>

        {order.durum === 'alindi' && (
          <Pressable
            onPress={iptalEt}
            disabled={iptalEdiliyor}
            className="items-center rounded-2xl border border-red-200 bg-white py-4">
            {iptalEdiliyor ? (
              <ActivityIndicator color="#ef4444" />
            ) : (
              <Text className="text-base font-bold text-red-500">Siparişi İptal Et</Text>
            )}
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
