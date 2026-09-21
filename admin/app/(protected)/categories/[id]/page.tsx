'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CategoryForm } from '@/components/CategoryForm';
import type { Category } from '@/lib/types';

export default function EditCategoryPage() {
  const params = useParams<{ id: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .eq('id', params.id)
      .single()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setCategory(data as Category);
        setLoading(false);
      });
  }, [params.id]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Kategoriyi Düzenle</h1>
      {loading && <p className="text-sm text-gray-500">Yükleniyor...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {category && <CategoryForm initial={category} />}
    </div>
  );
}
