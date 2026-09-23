import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export type Category = { id: string; ad: string; icon: string; gorsel: string; sira: number };

export type Product = {
  id: string;
  ad: string;
  fiyat: number;
  stok: number;
  barkod: string | null;
  categoryIds: string[];
  altKategori: string;
  icon: string;
  gorsel: string;
  aktif: boolean;
  aciklama: string;
};

// Admin panelden ayarlanır (market_ayarlari, migration-007). Asıl kontrol
// siparis_olustur() içinde; buradaki değerler sepette bilgi göstermek için.
export type MarketAyarlari = {
  minSepetTutari: number;
  teslimatUcreti: number;
  ucretsizTeslimatEsigi: number | null;
};

const VARSAYILAN_AYARLAR: MarketAyarlari = { minSepetTutari: 0, teslimatUcreti: 0, ucretsizTeslimatEsigi: null };

// UI-only sentinel — DB'de karşılığı yok. data/products.ts'teki aynı Unsplash URL'i kullanır.
const TUMU_CATEGORY: Category = {
  id: 'tumu',
  ad: 'Tümü',
  icon: 'view-grid-outline',
  gorsel:
    'https://plus.unsplash.com/premium_photo-1664527305901-a3c8bec62850?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
  sira: 0,
};

type CatalogContextType = {
  categories: Category[];
  products: Product[];
  ayarlar: MarketAyarlari;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([TUMU_CATEGORY]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ayarlar, setAyarlar] = useState<MarketAyarlari>(VARSAYILAN_AYARLAR);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        { data: catData, error: catErr },
        { data: prodData, error: prodErr },
        { data: ayarData },
      ] = await Promise.all([
        supabase.from('categories').select('*').order('sira', { ascending: true }),
        supabase
          .from('products')
          .select('*, product_categories(category_id)')
          .eq('aktif', true),
        supabase.from('market_ayarlari').select('*').maybeSingle(),
      ]);
      if (catErr) throw catErr;
      if (prodErr) throw prodErr;

      setCategories([
        TUMU_CATEGORY,
        ...(catData ?? []).map((c) => ({
          id: c.id,
          ad: c.ad,
          icon: c.icon,
          gorsel: c.gorsel_url,
          sira: c.sira,
        })),
      ]);
      setProducts(
        (prodData ?? []).map((p: any) => ({
          id: p.id,
          ad: p.ad,
          fiyat: Number(p.fiyat),
          stok: p.stok,
          barkod: p.barkod,
          categoryIds: (p.product_categories ?? []).map((pc: { category_id: string }) => pc.category_id),
          altKategori: p.alt_kategori,
          icon: p.icon,
          gorsel: p.gorsel_url,
          aktif: p.aktif,
          aciklama: p.aciklama ?? '',
        }))
      );
      if (ayarData) {
        setAyarlar({
          minSepetTutari: Number(ayarData.min_sepet_tutari),
          teslimatUcreti: Number(ayarData.teslimat_ucreti),
          ucretsizTeslimatEsigi:
            ayarData.ucretsiz_teslimat_esigi == null ? null : Number(ayarData.ucretsiz_teslimat_esigi),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ürünler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // fetchCatalog() içindeki setState çağrıları await'ten sonra çalışıyor; deps boş, mount-only fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCatalog();
  }, []);

  return (
    <CatalogContext.Provider value={{ categories, products, ayarlar, loading, error, refresh: fetchCatalog }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider');
  return ctx;
}
