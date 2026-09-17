import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const sss = [
  {
    soru: 'Siparişim ne zaman teslim edilir?',
    cevap: 'Siparişleriniz genellikle 30-60 dakika içinde adresinize teslim edilir. Teslimat süresi yoğunluğa göre değişebilir.',
  },
  {
    soru: 'Siparişimi nasıl iptal edebilirim?',
    cevap: 'Siparişiniz hazırlanmaya başlamadan önce "Siparişlerim" ekranından iptal edebilirsiniz. Hazırlanmaya başladıysa destek hattımızla iletişime geçin.',
  },
  {
    soru: 'Ödeme yöntemlerim güvende mi?',
    cevap: 'Evet, kart bilgileriniz güvenli şekilde saklanır ve hiçbir zaman üçüncü taraflarla paylaşılmaz.',
  },
  {
    soru: 'Hasarlı veya eksik ürün gelirse ne yapmalıyım?',
    cevap: 'Sipariş detayından ilgili ürünü seçip destek talebi oluşturabilir veya doğrudan bizimle iletişime geçebilirsiniz.',
  },
];

export default function HelpScreen() {
  const [acikIndex, setAcikIndex] = useState<number | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center bg-white px-5 pb-3 pt-2 shadow-sm" style={{ gap: 12 }}>
        <Pressable
          onPress={() => router.replace('/profile')}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface">
          <Ionicons name="arrow-back" size={20} color="#1e293b" />
        </Pressable>
        <Text className="text-lg font-extrabold text-gray-900">Yardım & Destek</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <Text className="mb-3 text-sm font-bold text-gray-500">SIKÇA SORULAN SORULAR</Text>
        <View className="rounded-3xl bg-white shadow-sm">
          {sss.map((item, index) => {
            const acik = acikIndex === index;
            return (
              <View
                key={item.soru}
                className={index !== sss.length - 1 ? 'border-b border-gray-100' : ''}>
                <Pressable
                  onPress={() => setAcikIndex(acik ? null : index)}
                  className="flex-row items-center px-4 py-4">
                  <Text className="flex-1 text-sm font-semibold text-gray-800">{item.soru}</Text>
                  <Ionicons name={acik ? 'chevron-up' : 'chevron-down'} size={18} color="#cbd5e1" />
                </Pressable>
                {acik && (
                  <Text className="px-4 pb-4 text-sm leading-5 text-gray-500">{item.cevap}</Text>
                )}
              </View>
            );
          })}
        </View>

        <Text className="mb-3 mt-6 text-sm font-bold text-gray-500">BİZE ULAŞIN</Text>
        <View className="rounded-3xl bg-white shadow-sm">
          <Pressable
            onPress={() => Linking.openURL('mailto:destek@siparis81.com')}
            className="flex-row items-center border-b border-gray-100 px-4 py-4">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-50">
              <Ionicons name="mail-outline" size={18} color="#1abc6e" />
            </View>
            <Text className="ml-3 flex-1 text-base font-medium text-gray-800">destek@siparis81.com</Text>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL('tel:+908502552081')}
            className="flex-row items-center px-4 py-4">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-50">
              <Ionicons name="call-outline" size={18} color="#1abc6e" />
            </View>
            <Text className="ml-3 flex-1 text-base font-medium text-gray-800">0850 255 20 81</Text>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
