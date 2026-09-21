// Bir kerelik script: data/products.ts içindeki mevcut ürün/kategorileri Supabase'e taşır.
// Çalıştırma:
//   SUPABASE_URL=https://<project-ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service-role-key> npx tsx scripts/seed-supabase.ts
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { categories, products } from '../data/products';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY env değişkenlerini ayarlayın.');
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const LOCAL_IMAGE_CATEGORIES: Record<string, string> = {
  sut: 'assets/images/kategori-sut.png',
  icecek: 'assets/images/kategori-icecek.png',
  atistirmalik: 'assets/images/kategori-atistirmalik.png',
  'meyve-sebze': 'assets/images/kategori-manav.png',
};

async function uploadLocalCategoryImage(slug: string, relPath: string): Promise<string> {
  const filePath = path.resolve(__dirname, '..', relPath);
  const fileBuffer = readFileSync(filePath);
  const storagePath = `categories/${slug}.png`;
  const { error } = await supabase.storage
    .from('catalog-images')
    .upload(storagePath, fileBuffer, { contentType: 'image/png', upsert: true });
  if (error) throw error;
  return supabase.storage.from('catalog-images').getPublicUrl(storagePath).data.publicUrl;
}

async function main() {
  const realCategories = categories.filter((c) => c.id !== 'tumu');

  const categoryRows = await Promise.all(
    realCategories.map(async (c, index) => {
      const localPath = LOCAL_IMAGE_CATEGORIES[c.id];
      const gorsel_url = localPath
        ? await uploadLocalCategoryImage(c.id, localPath)
        : (c.gorsel as { uri: string }).uri;
      return { id: c.id, ad: c.ad, icon: c.icon, gorsel_url, sira: index + 1 };
    })
  );
  const { error: catErr } = await supabase.from('categories').insert(categoryRows);
  if (catErr) throw catErr;
  console.log(`${categoryRows.length} kategori eklendi.`);

  const adToId = new Map(realCategories.map((c) => [c.ad, c.id]));
  const productRows = products.map((p) => {
    const category_id = adToId.get(p.kategori);
    if (!category_id) throw new Error(`Kategori eşleşmedi: "${p.ad}" (kategori="${p.kategori}")`);
    return {
      ad: p.ad,
      fiyat: p.fiyat,
      stok: p.stok,
      barkod: p.barkod,
      category_id,
      alt_kategori: p.altKategori,
      icon: p.icon,
      gorsel_url: p.gorsel,
      aktif: true,
    };
  });
  const { error: prodErr } = await supabase.from('products').insert(productRows);
  if (prodErr) throw prodErr;
  console.log(`${productRows.length} ürün eklendi.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
