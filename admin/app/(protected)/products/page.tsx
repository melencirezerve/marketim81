'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Category, ProductWithCategory } from '@/lib/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const [{ data: prodData, error: prodErr }, { data: catData, error: catErr }] = await Promise.all([
      supabase.from('products').select('*, categories(ad)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('sira', { ascending: true }),
    ]);
    if (prodErr) setError(prodErr.message);
    else setProducts((prodData as ProductWithCategory[]) ?? []);
    if (catErr) setError(catErr.message);
    else setCategories((catData as Category[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.ad.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr'));
      const matchesCategory = !categoryFilter || p.category_id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  const toggleAktif = async (p: ProductWithCategory) => {
    const { error: updateError } = await supabase.from('products').update({ aktif: !p.aktif }).eq('id', p.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, aktif: !x.aktif } : x)));
  };

  const handleDelete = async (p: ProductWithCategory) => {
    if (!confirm(`"${p.ad}" ürününü silmek istediğinize emin misiniz?`)) return;
    const { error: deleteError } = await supabase.from('products').delete().eq('id', p.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ürünler</h1>
        <Link
          href="/products/new"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          + Yeni Ürün
        </Link>
      </div>

      <div className="mb-4 flex gap-3">
        <input
          placeholder="Ürün ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">Tüm kategoriler</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.ad}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">Yükleniyor...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Ürün</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Kategori</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Fiyat</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Stok</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Durum</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="flex items-center gap-2 px-4 py-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.gorsel_url} alt="" className="h-8 w-8 rounded object-cover" />
                    {p.ad}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{p.categories?.ad ?? '-'}</td>
                  <td className="px-4 py-2 text-gray-600">{Number(p.fiyat).toFixed(2)} TL</td>
                  <td className="px-4 py-2 text-gray-600">{p.stok}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => toggleAktif(p)}
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        p.aktif ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                      {p.aktif ? 'Aktif' : 'Pasif'}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/products/${p.id}`} className="mr-3 text-emerald-700 hover:underline">
                      Düzenle
                    </Link>
                    <button onClick={() => handleDelete(p)} className="text-red-600 hover:underline">
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    Ürün bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
