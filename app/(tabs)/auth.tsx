import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';

// "0532 123 45 67", "532 123 4567", "+90 532..." → "+905321234567"
// Geçerli bir Türkiye cep numarası değilse null.
function telefonNormalize(girdi: string): string | null {
  let rakam = girdi.replace(/\D/g, '');
  if (rakam.startsWith('90')) rakam = rakam.slice(2);
  if (rakam.startsWith('0')) rakam = rakam.slice(1);
  return /^5\d{9}$/.test(rakam) ? `+90${rakam}` : null;
}

type Adim = 'telefon' | 'kod' | 'ad';

export default function AuthScreen() {
  const { sendOtp, verifyOtp, setAd } = useAuth();
  const [adim, setAdim] = useState<Adim>('telefon');
  const [telefon, setTelefon] = useState('');
  const [kod, setKod] = useState('');
  const [ad, setAdGirdi] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  // Sekme ekranı kapanınca unmount olmuyor; her açılışta akışı baştan başlat,
  // yoksa önceki oturumdan kalan adım (ör. "ad") ve girdiler geri gelir.
  useFocusEffect(
    useCallback(() => {
      setAdim('telefon');
      setTelefon('');
      setKod('');
      setAdGirdi('');
      setHata(null);
    }, [])
  );

  const kapat = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

  const kodGonder = async () => {
    setHata(null);
    const numara = telefonNormalize(telefon);
    if (!numara) {
      setHata('Geçerli bir cep telefonu numarası girin (5xx xxx xx xx).');
      return;
    }
    setGonderiliyor(true);
    const hataMesaji = await sendOtp(numara);
    setGonderiliyor(false);
    if (hataMesaji) {
      setHata(hataMesaji);
      return;
    }
    setKod('');
    setAdim('kod');
  };

  const kodDogrula = async () => {
    setHata(null);
    if (!/^\d{6}$/.test(kod)) {
      setHata('SMS ile gelen 6 haneli kodu girin.');
      return;
    }
    setGonderiliyor(true);
    const sonuc = await verifyOtp(telefonNormalize(telefon)!, kod);
    setGonderiliyor(false);
    if (sonuc.error) {
      setHata(sonuc.error);
      return;
    }
    if (sonuc.adGerekli) setAdim('ad');
    else kapat();
  };

  const adKaydet = async () => {
    setHata(null);
    if (!ad.trim()) {
      setHata('Ad soyad gerekli.');
      return;
    }
    setGonderiliyor(true);
    const hataMesaji = await setAd(ad.trim());
    setGonderiliyor(false);
    if (hataMesaji) setHata(hataMesaji);
    else kapat();
  };

  const baslik = { telefon: 'Giriş Yap', kod: 'Kodu Doğrula', ad: 'Hoş Geldiniz' }[adim];

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center bg-white px-5 pb-3 pt-2 shadow-sm" style={{ gap: 12 }}>
        <Pressable
          onPress={() => (adim === 'kod' ? setAdim('telefon') : kapat())}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface">
          <Ionicons name="arrow-back" size={20} color="#1e293b" />
        </Pressable>
        <Text className="text-lg font-extrabold text-gray-900">{baslik}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
        {adim === 'telefon' && (
          <>
            <Text className="text-sm text-gray-500">
              Telefon numaranıza bir doğrulama kodu göndereceğiz. Hesabınız yoksa otomatik oluşturulur.
            </Text>
            <View className="flex-row items-center rounded-2xl bg-white px-4 shadow-sm">
              <Text className="text-sm font-semibold text-gray-500">+90</Text>
              <TextInput
                value={telefon}
                onChangeText={setTelefon}
                placeholder="5xx xxx xx xx"
                placeholderTextColor="#9aa5b1"
                keyboardType="phone-pad"
                autoFocus
                maxLength={14}
                className="flex-1 px-3 py-3 text-sm text-gray-900"
              />
            </View>
          </>
        )}

        {adim === 'kod' && (
          <>
            <Text className="text-sm text-gray-500">
              {telefonNormalize(telefon)} numarasına gönderilen 6 haneli kodu girin.
            </Text>
            <TextInput
              value={kod}
              onChangeText={(t) => setKod(t.replace(/\D/g, ''))}
              placeholder="••••••"
              placeholderTextColor="#9aa5b1"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              autoFocus
              maxLength={6}
              className="rounded-2xl bg-white px-4 py-3 text-center text-lg font-bold tracking-[8px] text-gray-900 shadow-sm"
            />
          </>
        )}

        {adim === 'ad' && (
          <>
            <Text className="text-sm text-gray-500">Siparişlerinizde görünecek adınızı girin.</Text>
            <TextInput
              value={ad}
              onChangeText={setAdGirdi}
              placeholder="Ad Soyad"
              placeholderTextColor="#9aa5b1"
              autoFocus
              className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-900 shadow-sm"
            />
          </>
        )}

        {hata && <Text className="text-sm text-red-500">{hata}</Text>}

        <Pressable
          onPress={{ telefon: kodGonder, kod: kodDogrula, ad: adKaydet }[adim]}
          disabled={gonderiliyor}
          className="mt-2 items-center rounded-2xl bg-primary-500 py-4">
          {gonderiliyor ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-bold text-white">
              {{ telefon: 'Kod Gönder', kod: 'Doğrula', ad: 'Kaydet' }[adim]}
            </Text>
          )}
        </Pressable>

        {adim === 'kod' && (
          <Pressable onPress={kodGonder} disabled={gonderiliyor} className="items-center py-3">
            <Text className="text-sm font-semibold text-gray-500">Kodu tekrar gönder</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
