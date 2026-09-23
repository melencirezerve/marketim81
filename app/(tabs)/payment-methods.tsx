import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { ODEME_YONTEMLERI, type OdemeYontemi } from '@/lib/odeme-yontemleri';

export default function PaymentMethodsScreen() {
  const { user, profile, setTercihOdemeYontemi } = useAuth();
  const [kaydedilen, setKaydedilen] = useState<OdemeYontemi | null>(null);
  const secili = profile?.tercih_odeme_yontemi ?? 'kapida_nakit';

  const sec = async (yontem: OdemeYontemi) => {
    if (yontem === secili || kaydedilen) return;
    setKaydedilen(yontem);
    const hata = await setTercihOdemeYontemi(yontem);
    setKaydedilen(null);
    if (hata) Alert.alert('Kaydedilemedi', hata);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center bg-white px-5 pb-3 pt-2 shadow-sm" style={{ gap: 12 }}>
        <Pressable
          onPress={() => router.replace('/profile')}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface">
          <Ionicons name="arrow-back" size={20} color="#1e293b" />
        </Pressable>
        <Text className="text-lg font-extrabold text-gray-900">Ödeme Yöntemlerim</Text>
      </View>

      {!user ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="lock-closed-outline" size={40} color="#1abc6e" />
          <Text className="mt-3 text-center text-sm text-gray-500">
            Varsayılan ödeme yönteminizi seçmek için giriş yapın.
          </Text>
          <Pressable onPress={() => router.push('/auth')} className="mt-5 rounded-2xl bg-primary-500 px-6 py-3">
            <Text className="font-semibold text-white">Giriş Yap</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 32 }}>
          <Text className="text-sm text-gray-500">
            Varsayılan ödeme yönteminiz sepette otomatik seçili gelir; sipariş verirken değiştirebilirsiniz.
          </Text>

          {ODEME_YONTEMLERI.map((o) => {
            const aktif = secili === o.id;
            return (
              <Pressable
                key={o.id}
                onPress={() => sec(o.id)}
                className={`flex-row items-center rounded-3xl border-2 bg-white p-4 shadow-sm ${
                  aktif ? 'border-primary-500' : 'border-transparent'
                }`}
                style={{ gap: 12 }}>
                <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-50">
                  <Ionicons name={o.icon} size={22} color="#1abc6e" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">{o.label}</Text>
                  <Text className="mt-0.5 text-xs text-gray-500">{o.aciklama}</Text>
                </View>
                {kaydedilen === o.id ? (
                  <ActivityIndicator color="#1abc6e" />
                ) : (
                  <Ionicons
                    name={aktif ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={aktif ? '#1abc6e' : '#cbd5e1'}
                  />
                )}
              </Pressable>
            );
          })}

          <View className="mt-2 flex-row items-start rounded-2xl bg-white p-4" style={{ gap: 10 }}>
            <Ionicons name="information-circle-outline" size={18} color="#94a3b8" />
            <Text className="flex-1 text-xs text-gray-500">
              Online kartla ödeme yakında. Güvenliğiniz için kart bilgileriniz uygulamada saklanmaz.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
