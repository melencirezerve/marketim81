import { router } from 'expo-router';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { categories } from '@/data/products';

export default function KategorilerScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-5 pb-2 pt-2">
        <Text className="text-2xl font-bold text-gray-900">Kategoriler</Text>
        <Text className="mt-1 text-sm text-gray-500">
          Alışverişe başlamak için bir kategori seç
        </Text>
      </View>

      <FlatList
        className="flex-1"
        data={categories}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
        contentContainerStyle={{ gap: 12, paddingTop: 8, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/kategori/[id]', params: { id: item.id, from: 'kategoriler' } })
            }
            className="flex-1 items-center rounded-2xl bg-white py-4 shadow-sm">
            <View className="h-16 w-16 overflow-hidden rounded-2xl">
              <Image source={item.gorsel} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
            <Text
              numberOfLines={2}
              className="mt-2 text-center text-xs font-semibold text-gray-700"
              style={{ maxWidth: 90 }}>
              {item.ad}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
