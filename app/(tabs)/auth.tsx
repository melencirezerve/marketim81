import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'giris' | 'kayit'>('giris');
  const [ad, setAd] = useState('');
  const [telefon, setTelefon] = useState('');
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const gonder = async () => {
    setHata(null);
    setBilgi(null);
    if (!email.trim() || !sifre) {
      setHata('E-posta ve şifre gerekli.');
      return;
    }
    if (mode === 'kayit' && !ad.trim()) {
      setHata('Ad soyad gerekli.');
      return;
    }
    setGonderiliyor(true);

    if (mode === 'giris') {
      const hataMesaji = await signIn(email.trim(), sifre);
      setGonderiliyor(false);
      if (hataMesaji) {
        setHata(hataMesaji);
        return;
      }
      if (router.canGoBack()) router.back();
      else router.replace('/profile');
      return;
    }

    const sonuc = await signUp(email.trim(), sifre, ad.trim(), telefon.trim());
    setGonderiliyor(false);
    if (sonuc.error) {
      setHata(sonuc.error);
      return;
    }
    if (sonuc.needsConfirmation) {
      setBilgi('Hesabınız oluşturuldu. E-postanıza gönderilen bağlantıyla doğruladıktan sonra giriş yapabilirsiniz.');
      setMode('giris');
      setSifre('');
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center bg-white px-5 pb-3 pt-2 shadow-sm" style={{ gap: 12 }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface">
          <Ionicons name="arrow-back" size={20} color="#1e293b" />
        </Pressable>
        <Text className="text-lg font-extrabold text-gray-900">
          {mode === 'giris' ? 'Giriş Yap' : 'Hesap Oluştur'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        {mode === 'kayit' && (
          <>
            <TextInput
              value={ad}
              onChangeText={setAd}
              placeholder="Ad Soyad"
              placeholderTextColor="#9aa5b1"
              className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-900 shadow-sm"
            />
            <TextInput
              value={telefon}
              onChangeText={setTelefon}
              placeholder="Telefon (opsiyonel)"
              placeholderTextColor="#9aa5b1"
              keyboardType="phone-pad"
              className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-900 shadow-sm"
            />
          </>
        )}

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="E-posta"
          placeholderTextColor="#9aa5b1"
          autoCapitalize="none"
          keyboardType="email-address"
          className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-900 shadow-sm"
        />
        <TextInput
          value={sifre}
          onChangeText={setSifre}
          placeholder="Şifre"
          placeholderTextColor="#9aa5b1"
          secureTextEntry
          className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-900 shadow-sm"
        />

        {bilgi && <Text className="text-sm text-primary-600">{bilgi}</Text>}
        {hata && <Text className="text-sm text-red-500">{hata}</Text>}

        <Pressable
          onPress={gonder}
          disabled={gonderiliyor}
          className="mt-2 items-center rounded-2xl bg-primary-500 py-4">
          {gonderiliyor ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-bold text-white">
              {mode === 'giris' ? 'Giriş Yap' : 'Hesap Oluştur'}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setHata(null);
            setMode((m) => (m === 'giris' ? 'kayit' : 'giris'));
          }}
          className="items-center py-3">
          <Text className="text-sm font-semibold text-gray-500">
            {mode === 'giris' ? 'Hesabınız yok mu? Kayıt olun' : 'Zaten hesabınız var mı? Giriş yapın'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
