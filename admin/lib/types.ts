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
  created_at?: string;
  updated_at?: string;
};

export type ProductWithCategories = Product & {
  product_categories: { category_id: string; categories: { ad: string } | null }[];
};
