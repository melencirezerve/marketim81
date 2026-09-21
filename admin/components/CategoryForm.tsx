'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ImageUploader } from './ImageUploader';
import type { Category } from '@/lib/types';

function slugify(input: string): string {
  return input
    .toLocaleLowerCase('tr')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

type Props = { initial?: Category };

export function CategoryForm({ initial }: Props) {
  const router = useRouter();
  const isEdit = Boolean(initial);
  const [ad, setAd] = useState(initial?.ad ?? '');
  const [id, setId] = useState(initial?.id ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '');
  const [sira, setSira] = useState(initial?.sira ?? 0);
  const [gorselUrl, setGorselUrl] = useState(initial?.gorsel_url ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdChange = (value: string) => {
    setAd(value);
    if (!isEdit) setId(slugify(value));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (!id) throw new Error('Kategori adı boş olamaz.');
      const row = { id, ad, icon, sira, gorsel_url: gorselUrl };
      const { error: upsertError } = isEdit
        ? await supabase.from('categories').update(row).eq('id', id)
        : await supabase.from('categories').insert(row);
      if (upsertError) throw upsertError;
      router.push('/categories');
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
          onChange={(e) => handleAdChange(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Slug (id)</label>
        <input
          value={id}
          disabled
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
        />
        {isEdit && (
          <p className="mt-1 text-xs text-gray-400">
            Slug oluşturulduktan sonra değiştirilemez (mobil uygulama ve ürünler buna bağlı).
          </p>
        )}
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
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Sıra</label>
        <input
          type="number"
          value={sira}
          onChange={(e) => setSira(Number(e.target.value))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <ImageUploader value={gorselUrl} onChange={setGorselUrl} pathPrefix="categories" fileName={id || undefined} />
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
