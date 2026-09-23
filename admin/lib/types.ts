export type Category = {
  id: string;
  ad: string;
  icon: string;
  gorsel_url: string;
  sira: number;
  created_at?: string;
  updated_at?: string;
};

export type Product = {
  id: string;
  ad: string;
  fiyat: number;
  stok: number;
  barkod: string | null;
  alt_kategori: string;
  icon: string;
  gorsel_url: string;
  aktif: boolean;
  aciklama: string;
  created_at?: string;
  updated_at?: string;
};

export type ProductWithCategories = Product & {
  product_categories: { category_id: string; categories: { ad: string } | null }[];
};

export type OrderStatus = 'alindi' | 'hazirlaniyor' | 'yolda' | 'kapinda' | 'iptal';

export type OdemeYontemi = 'kapida_nakit' | 'kapida_kart';

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  ad: string;
  fiyat: number;
  gorsel_url: string;
  miktar: number;
};

export type MarketAyarlari = {
  min_sepet_tutari: number;
  teslimat_ucreti: number;
  ucretsiz_teslimat_esigi: number | null;
  updated_at?: string;
};

export type OrderWithItems = {
  id: string;
  device_id: string | null;
  customer_id: string | null;
  musteri_adi: string | null;
  musteri_telefon: string | null;
  musteri_email: string | null;
  teslimat_adresi: string | null;
  odeme_yontemi: OdemeYontemi;
  durum: OrderStatus;
  ara_toplam: number;
  teslimat_ucreti: number;
  toplam: number;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
};
