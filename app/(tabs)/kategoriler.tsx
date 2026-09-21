import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCatalog } from '@/context/catalog-context';

export default function KategorilerScreen() {
  const { categories, loading, error, refresh } = useCatalog();

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface" edges={['top']}>
        <ActivityIndicator size="large" color="#10995a" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface px-10" edges={['top']}>
        <Text className="text-center text-sm text-gray-500">{error}</Text>
        <Pressable onPress={refresh} className="mt-4 rounded-xl bg-primary-500 px-4 py-2">
          <Text className="text-xs font-bold text-white">Tekrar Dene</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

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
              <Image source={{ uri: item.gorsel }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
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
