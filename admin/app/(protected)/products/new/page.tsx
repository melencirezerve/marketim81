'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ProductForm } from '@/components/ProductForm';
import type { Category } from '@/lib/types';

export default function NewProductPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('sira', { ascending: true })
      .then(({ data }) => {
        setCategories((data as Category[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Yeni Ürün</h1>
      {loading ? <p className="text-sm text-gray-500">Yükleniyor...</p> : <ProductForm categories={categories} />}
    </div>
  );
}
