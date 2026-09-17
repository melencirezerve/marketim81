import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Uygulama yalnızca Cumayeri (Düzce) sınırları içinde hizmet veriyor.
// Mahalle serbest metin değil, ilçenin 5 merkez mahallesiyle sınırlı bir
// seçim listesi olduğu için hizmet alanı dışında adres kaydı mümkün değil.
const IL = 'Düzce';
const ILCE = 'Cumayeri';
const MAHALLELER = ['Orta', 'Çevrik', 'Yeni', 'Yaka', 'Mehmet Akif'] as const;

type Address = {
  id: string;
  baslik: string;
  mahalle: (typeof MAHALLELER)[number];
  sokak: string;
  binaNo: string;
  daireNo: string;
  varsayilan: boolean;
};

function formatAdres(a: Address) {
  const daire = a.daireNo ? ` D:${a.daireNo}` : '';
  return `${a.sokak} No:${a.binaNo}${daire}, ${a.mahalle} Mah., ${ILCE}/${IL}`;
}

const baslangicAdresleri: Address[] = [
  {
    id: '1',
    baslik: 'Ev',
    mahalle: 'Orta',
    sokak: 'Cumhuriyet Cad.',
    binaNo: '12',
    daireNo: '4',
    varsayilan: true,
  },
  {
    id: '2',
    baslik: 'İş',
    mahalle: 'Yeni',
    sokak: 'Begonya Sok.',
    binaNo: '7',
    daireNo: '',
    varsayilan: false,
  },
];

export default function AddressesScreen() {
  const [addresses, setAddresses] = useState<Address[]>(baslangicAdresleri);
  const [formAcik, setFormAcik] = useState(false);
  const [baslik, setBaslik] = useState('');
  const [mahalle, setMahalle] = useState<(typeof MAHALLELER)[number] | null>(null);
  const [sokak, setSokak] = useState('');
  const [binaNo, setBinaNo] = useState('');
  const [daireNo, setDaireNo] = useState('');

  const formuTemizle = () => {
    setBaslik('');
    setMahalle(null);
    setSokak('');
    setBinaNo('');
    setDaireNo('');
  };

  const ekle = () => {
    if (!baslik.trim() || !mahalle || !sokak.trim() || !binaNo.trim()) return;
    const yeni: Address = {
      id: Date.now().toString(),
      baslik: baslik.trim(),
      mahalle,
      sokak: sokak.trim(),
      binaNo: binaNo.trim(),
      daireNo: daireNo.trim(),
      varsayilan: addresses.length === 0,
    };
    setAddresses((prev) => [...prev, yeni]);
    formuTemizle();
    setFormAcik(false);
  };

  const sil = (id: string) => {
    setAddresses((prev) => {
      const kalan = prev.filter((a) => a.id !== id);
      if (kalan.length > 0 && !kalan.some((a) => a.varsayilan)) {
        kalan[0] = { ...kalan[0], varsayilan: true };
      }
      return kalan;
    });
  };

  const varsayilanYap = (id: string) => {
    setAddresses((prev) => prev.map((a) => ({ ...a, varsayilan: a.id === id })));
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center bg-white px-5 pb-3 pt-2 shadow-sm" style={{ gap: 12 }}>
        <Pressable
          onPress={() => router.replace('/profile')}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface">
          <Ionicons name="arrow-back" size={20} color="#1e293b" />
        </Pressable>
        <Text className="text-lg font-extrabold text-gray-900">Adreslerim</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 32 }}>
        <View className="flex-row items-center rounded-2xl bg-primary-50 px-4 py-3" style={{ gap: 8 }}>
          <Ionicons name="information-circle-outline" size={18} color="#10995a" />
          <Text className="flex-1 text-xs text-primary-700">
            Şu an yalnızca {ILCE}/{IL} sınırları içinde teslimat yapıyoruz.
          </Text>
        </View>

        {addresses.length === 0 && (
          <View className="items-center justify-center rounded-3xl bg-white py-10">
            <Ionicons name="location-outline" size={40} color="#1abc6e" />
            <Text className="mt-3 text-sm text-gray-500">Henüz kayıtlı adresiniz yok</Text>
          </View>
        )}

        {addresses.map((a) => (
          <View key={a.id} className="rounded-3xl bg-white p-4 shadow-sm">
            <View className="flex-row items-start justify-between">
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-50">
                  <Ionicons name="location-outline" size={18} color="#1abc6e" />
                </View>
                <Text className="text-base font-bold text-gray-900">{a.baslik}</Text>
                {a.varsayilan && (
                  <View className="rounded-full bg-primary-50 px-2 py-0.5">
                    <Text className="text-[10px] font-bold text-primary-700">Varsayılan</Text>
                  </View>
                )}
              </View>
              <Pressable onPress={() => sil(a.id)} className="p-1">
                <Ionicons name="trash-outline" size={18} color="#cbd5e1" />
              </Pressable>
            </View>
            <Text className="ml-11 mt-1 text-sm text-gray-500">{formatAdres(a)}</Text>
            {!a.varsayilan && (
              <Pressable onPress={() => varsayilanYap(a.id)} className="ml-11 mt-2 self-start">
                <Text className="text-xs font-semibold text-primary-600">Varsayılan Yap</Text>
              </Pressable>
            )}
          </View>
        ))}

        {formAcik ? (
          <View className="rounded-3xl bg-white p-4 shadow-sm">
            <TextInput
              value={baslik}
              onChangeText={setBaslik}
              placeholder="Adres başlığı (ör. Ev, İş)"
              placeholderTextColor="#9aa5b1"
              className="rounded-2xl bg-surface px-4 py-3 text-sm text-gray-900"
            />

            <View className="mt-3 flex-row" style={{ gap: 10 }}>
              <View className="flex-1 rounded-2xl bg-surface px-4 py-3">
                <Text className="text-[10px] font-semibold uppercase text-gray-400">İl</Text>
                <Text className="text-sm font-medium text-gray-500">{IL}</Text>
              </View>
              <View className="flex-1 rounded-2xl bg-surface px-4 py-3">
                <Text className="text-[10px] font-semibold uppercase text-gray-400">İlçe</Text>
                <Text className="text-sm font-medium text-gray-500">{ILCE}</Text>
              </View>
            </View>

            <Text className="mb-2 mt-3 text-xs font-semibold text-gray-500">Mahalle</Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {MAHALLELER.map((m) => {
                const secili = mahalle === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setMahalle(m)}
                    className={`rounded-xl border px-3 py-2 ${
                      secili ? 'border-primary-500 bg-primary-500' : 'border-surface bg-surface'
                    }`}>
                    <Text className={`text-xs font-semibold ${secili ? 'text-white' : 'text-gray-600'}`}>
                      {m} Mah.
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={sokak}
              onChangeText={setSokak}
              placeholder="Sokak / Cadde"
              placeholderTextColor="#9aa5b1"
              className="mt-3 rounded-2xl bg-surface px-4 py-3 text-sm text-gray-900"
            />

            <View className="mt-3 flex-row" style={{ gap: 10 }}>
              <TextInput
                value={binaNo}
                onChangeText={setBinaNo}
                placeholder="Bina No"
                placeholderTextColor="#9aa5b1"
                keyboardType="number-pad"
                className="flex-1 rounded-2xl bg-surface px-4 py-3 text-sm text-gray-900"
              />
              <TextInput
                value={daireNo}
                onChangeText={setDaireNo}
                placeholder="Daire No (opsiyonel)"
                placeholderTextColor="#9aa5b1"
                keyboardType="number-pad"
                className="flex-1 rounded-2xl bg-surface px-4 py-3 text-sm text-gray-900"
              />
            </View>

            <View className="mt-3 flex-row" style={{ gap: 10 }}>
              <Pressable
                onPress={() => {
                  setFormAcik(false);
                  formuTemizle();
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
            <Text className="ml-2 text-base font-semibold text-primary-600">Yeni Adres Ekle</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
