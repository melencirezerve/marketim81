import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PaymentMethod = {
  id: string;
  sahip: string;
  son4: string;
  sonKullanma: string;
  varsayilan: boolean;
};

const baslangicKartlar: PaymentMethod[] = [
  {
    id: '1',
    sahip: 'Siparis81 Kullanıcısı',
    son4: '4242',
    sonKullanma: '12/27',
    varsayilan: true,
  },
];

export default function PaymentMethodsScreen() {
  const [kartlar, setKartlar] = useState<PaymentMethod[]>(baslangicKartlar);
  const [formAcik, setFormAcik] = useState(false);
  const [sahip, setSahip] = useState('');
  const [numara, setNumara] = useState('');
  const [sonKullanma, setSonKullanma] = useState('');

  const ekle = () => {
    const son4 = numara.replace(/\D/g, '').slice(-4);
    if (!sahip.trim() || son4.length !== 4 || !sonKullanma.trim()) return;
    const yeni: PaymentMethod = {
      id: Date.now().toString(),
      sahip: sahip.trim(),
      son4,
      sonKullanma: sonKullanma.trim(),
      varsayilan: kartlar.length === 0,
    };
    setKartlar((prev) => [...prev, yeni]);
    setSahip('');
    setNumara('');
    setSonKullanma('');
    setFormAcik(false);
  };

  const sil = (id: string) => {
    setKartlar((prev) => {
      const kalan = prev.filter((k) => k.id !== id);
      if (kalan.length > 0 && !kalan.some((k) => k.varsayilan)) {
        kalan[0] = { ...kalan[0], varsayilan: true };
      }
      return kalan;
    });
  };

  const varsayilanYap = (id: string) => {
    setKartlar((prev) => prev.map((k) => ({ ...k, varsayilan: k.id === id })));
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

      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 32 }}>
        {kartlar.length === 0 && (
          <View className="items-center justify-center rounded-3xl bg-white py-10">
            <Ionicons name="card-outline" size={40} color="#1abc6e" />
            <Text className="mt-3 text-sm text-gray-500">Henüz kayıtlı kartınız yok</Text>
          </View>
        )}

        {kartlar.map((k) => (
          <View key={k.id} className="rounded-3xl bg-white p-4 shadow-sm">
            <View className="flex-row items-start justify-between">
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-50">
                  <Ionicons name="card-outline" size={18} color="#1abc6e" />
                </View>
                <Text className="text-base font-bold text-gray-900">•••• {k.son4}</Text>
                {k.varsayilan && (
                  <View className="rounded-full bg-primary-50 px-2 py-0.5">
                    <Text className="text-[10px] font-bold text-primary-700">Varsayılan</Text>
                  </View>
                )}
              </View>
              <Pressable onPress={() => sil(k.id)} className="p-1">
                <Ionicons name="trash-outline" size={18} color="#cbd5e1" />
              </Pressable>
            </View>
            <Text className="ml-11 mt-1 text-sm text-gray-500">
              {k.sahip} · SKT {k.sonKullanma}
            </Text>
            {!k.varsayilan && (
              <Pressable onPress={() => varsayilanYap(k.id)} className="ml-11 mt-2 self-start">
                <Text className="text-xs font-semibold text-primary-600">Varsayılan Yap</Text>
              </Pressable>
            )}
          </View>
        ))}

        {formAcik ? (
          <View className="rounded-3xl bg-white p-4 shadow-sm">
            <TextInput
              value={sahip}
              onChangeText={setSahip}
              placeholder="Kart üzerindeki isim"
              placeholderTextColor="#9aa5b1"
              className="rounded-2xl bg-surface px-4 py-3 text-sm text-gray-900"
            />
            <TextInput
              value={numara}
              onChangeText={setNumara}
              placeholder="Kart numarası"
              placeholderTextColor="#9aa5b1"
              keyboardType="number-pad"
              maxLength={19}
              className="mt-3 rounded-2xl bg-surface px-4 py-3 text-sm text-gray-900"
            />
            <TextInput
              value={sonKullanma}
              onChangeText={setSonKullanma}
              placeholder="Son kullanma (AA/YY)"
              placeholderTextColor="#9aa5b1"
              maxLength={5}
              className="mt-3 rounded-2xl bg-surface px-4 py-3 text-sm text-gray-900"
            />
            <View className="mt-3 flex-row" style={{ gap: 10 }}>
              <Pressable
                onPress={() => {
                  setFormAcik(false);
                  setSahip('');
                  setNumara('');
                  setSonKullanma('');
                }}
                className="flex-1 items-center rounded-2xl bg-surface py-3">
                <Text className="text-sm font-semibold text-gray-600">Vazgeç</Text>
              </Pressable>
              <Pressable onPress={ekle} className="flex-1 items-center rounded-2xl bg-primary-500 py-3">
                <Text className="text-sm font-semibold text-white">Kaydet</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setFormAcik(true)}
            className="flex-row items-center justify-center rounded-2xl bg-white py-4 shadow-sm">
            <Ionicons name="add" size={20} color="#1abc6e" />
            <Text className="ml-2 text-base font-semibold text-primary-600">Yeni Kart Ekle</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
