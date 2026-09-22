import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Expo Router web, ilk render'ı Node.js tarafında (SSR/static) yapıyor —
// orada `window` yok ve AsyncStorage'ın web implementasyonu buna dokununca
// çöküyor. SSR sırasında zararsız bir bellek-içi storage kullanıyoruz;
// tarayıcıda (hydration sonrası) ve native'de gerçek AsyncStorage devreye giriyor.
const ssrSafeStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: typeof window === 'undefined' ? ssrSafeStorage : AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);
