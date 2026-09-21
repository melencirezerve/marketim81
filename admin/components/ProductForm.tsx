'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ImageUploader } from './ImageUploader';
import type { Category, Product } from '@/lib/types';

type Props = { initial?: Product; initialCategoryIds?: string[]; categories: Category[] };

export function ProductForm({ initial, initialCategoryIds, categories }: Props) {
  const router = useRouter();
  const isEdit = Boolean(initial);
  const [ad, setAd] = useState(initial?.ad ?? '');
  const [fiyat, setFiyat] = useState(Number(initial?.fiyat ?? 0));
  const [stok, setStok] = useState(initial?.stok ?? 0);
  const [barkod, setBarkod] = useState(initial?.barkod ?? '');
  const [categoryIds, setCategoryIds] = useState<string[]>(initialCategoryIds ?? []);
  const [altKategori, setAltKategori] = useState(initial?.alt_kategori ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '');
  const [aktif, setAktif] = useState(initial?.aktif ?? true);
  const [gorselUrl, setGorselUrl] = useState(initial?.gorsel_url ?? '');
  const [altKategoriSecenekleri, setAltKategoriSecenekleri] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('products')
      .select('alt_kategori')
      .then(({ data }) => {
        const unique = Array.from(
          new Set((data ?? []).map((r: { alt_kategori: string }) => r.alt_kategori).filter(Boolean))
        );
        setAltKategoriSecenekleri(unique);
      });
  }, []);

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (categoryIds.length === 0) throw new Error('En az bir kategori seçmelisiniz.');
      const row = {
        ad,
        fiyat,
        stok,
        barkod: barkod || null,
        alt_kategori: altKategori,
        icon,
        gorsel_url: gorselUrl,
        aktif,
      };

      let productId: string;
      if (isEdit) {
        productId = initial!.id;
        const { error: updateError } = await supabase.from('products').update(row).eq('id', productId);
        if (updateError) throw updateError;
        const { error: deleteLinksError } = await supabase
          .from('product_categories')
          .delete()
          .eq('product_id', productId);
        if (deleteLinksError) throw deleteLinksError;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('products')
          .insert(row)
          .select('id')
          .single();
        if (insertError) throw insertError;
        productId = inserted.id;
      }

      const { error: linkError } = await supabase
        .from('product_categories')
        .insert(categoryIds.map((category_id) => ({ product_id: productId, category_id })));
      if (linkError) throw linkError;

      router.push('/products');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Ad</label>
        <input
          value={ad}
          onChange={(e) => setAd(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">Fiyat (TL)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={fiyat}
            onChange={(e) => setFiyat(Number(e.target.value))}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">Stok</label>
          <input
            type="number"
            min="0"
            value={stok}
            onChange={(e) => setStok(Number(e.target.value))}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Barkod</label>
        <input
          value={barkod ?? ''}
          onChange={(e) => setBarkod(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Kategoriler <span className="font-normal text-gray-400">(en az bir tane)</span>
        </label>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-300 p-3">
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={categoryIds.includes(c.id)}
                onChange={() => toggleCategory(c.id)}
              />
              {c.ad}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Alt kategori</label>
        <input
          value={altKategori}
          onChange={(e) => setAltKategori(e.target.value)}
          list="alt-kategori-list"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <datalist id="alt-kategori-list">
          {altKategoriSecenekleri.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Icon (MaterialCommunityIcons adı)
        </label>
        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} />
        Aktif (uygulamada görünür)
      </label>
      <ImageUploader value={gorselUrl} onChange={setGorselUrl} pathPrefix="products" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
        {saving ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </form>
  );
}
