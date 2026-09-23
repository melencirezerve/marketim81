import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SON_GUNCELLEME, YASAL_METINLER, type YasalSayfa } from '@/lib/yasal-metinler';

export default function YasalMetinScreen() {
  const { sayfa } = useLocalSearchParams<{ sayfa: YasalSayfa }>();
  const metin = YASAL_METINLER[sayfa] ?? YASAL_METINLER.kullanim;
  const geri = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-center bg-white px-5 pb-3 pt-2 shadow-sm" style={{ gap: 12 }}>
        <Pressable onPress={geri} className="h-10 w-10 items-center justify-center rounded-full bg-surface">
          <Ionicons name="arrow-back" size={20} color="#1e293b" />
        </Pressable>
        <Text className="flex-1 text-lg font-extrabold text-gray-900" numberOfLines={1}>
          {metin.baslik}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text className="mb-4 text-xs text-gray-400">Son güncelleme: {SON_GUNCELLEME}</Text>
        {metin.bolumler.map((b) => (
          <View key={b.baslik} className="mb-5">
            <Text className="mb-1.5 text-base font-bold text-gray-900">{b.baslik}</Text>
            <Text className="text-sm leading-6 text-gray-600">{b.metin}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
