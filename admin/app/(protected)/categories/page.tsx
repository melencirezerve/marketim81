'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/lib/types';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const { data, error: err } = await supabase.from('categories').select('*').order('sira', { ascending: true });
    if (err) setError(err.message);
    else setCategories((data as Category[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    // load() only sets state after its internal await, but the linter can't see through
    // the indirection — safe here since deps are empty (mount-only fetch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const handleDelete = async (c: Category) => {
    if (!confirm(`"${c.ad}" kategorisini silmek istediğinize emin misiniz? (Bu kategoriye ait ürünler varsa silinemez.)`))
      return;
    const { error: err } = await supabase.from('categories').delete().eq('id', c.id);
    if (err) {
      setError(err.message);
      return;
    }
    setCategories((prev) => prev.filter((x) => x.id !== c.id));
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kategoriler</h1>
        <Link
          href="/categories/new"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          + Yeni Kategori
        </Link>
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">Yükleniyor...</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {categories.map((c) => (
            <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-3 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.gorsel_url} alt="" className="mx-auto mb-2 h-16 w-16 rounded-lg object-cover" />
              <p className="text-sm font-semibold text-gray-900">{c.ad}</p>
              <p className="text-xs text-gray-400">sıra: {c.sira}</p>
              <div className="mt-2 flex justify-center gap-3 text-xs">
                <Link href={`/categories/${c.id}`} className="text-emerald-700 hover:underline">
                  Düzenle
                </Link>
                <button onClick={() => handleDelete(c)} className="text-red-600 hover:underline">
                  Sil
                </button>
              </div>
            </div>
          ))}
          {categories.length === 0 && <p className="text-sm text-gray-400">Kategori bulunamadı.</p>}
        </div>
      )}
    </div>
  );
}
