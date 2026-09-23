import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCart } from '@/context/cart-context';

export default function TabLayout() {
  const { totalCount } = useCart();
  // 3 tuşlu Android gezinmesinde (ve iPhone ana çubuğunda) sekmeler sistem alanının
  // altında kalıyordu; yükseklik ve alt boşluk bu alan kadar artırılır.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      // Gizli ekranlar (ürün/sipariş detayı, yasal metinler) da sekme olduğu için
      // "geri" varsayılan olarak ilk sekmeye (Market) dönüyordu; açıldığı ekrana dönsün.
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1abc6e',
        tabBarInactiveTintColor: '#9aa5b1',
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 10 + insets.bottom,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Market',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'storefront' : 'storefront-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="kategoriler"
        options={{
          title: 'Kategoriler',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Sepet',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons name={focused ? 'cart' : 'cart-outline'} size={24} color={color} />
              {totalCount > 0 && (
                <View className="absolute -right-2 -top-1 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 py-[1px]">
                  <Text className="text-[10px] font-bold text-white">{totalCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="kategori/[id]" options={{ href: null }} />
      <Tabs.Screen name="auth" options={{ href: null }} />
      <Tabs.Screen name="orders" options={{ href: null }} />
      <Tabs.Screen name="order-confirmation" options={{ href: null }} />
      <Tabs.Screen name="addresses" options={{ href: null }} />
      <Tabs.Screen name="payment-methods" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="help" options={{ href: null }} />
      <Tabs.Screen name="notification-center" options={{ href: null }} />
      <Tabs.Screen name="urun/[id]" options={{ href: null }} />
      <Tabs.Screen name="siparis/[id]" options={{ href: null }} />
      <Tabs.Screen name="yasal/[sayfa]" options={{ href: null }} />
    </Tabs>
  );
}
