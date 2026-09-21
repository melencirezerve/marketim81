'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ProductForm } from '@/components/ProductForm';
import type { Category, Product } from '@/lib/types';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('products').select('*').eq('id', params.id).single(),
      supabase.from('categories').select('*').order('sira', { ascending: true }),
    ]).then(([{ data: prodData, error: prodErr }, { data: catData }]) => {
      if (prodErr) setError(prodErr.message);
      else setProduct(prodData as Product);
      setCategories((catData as Category[]) ?? []);
      setLoading(false);
    });
  }, [params.id]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Ürünü Düzenle</h1>
      {loading && <p className="text-sm text-gray-500">Yükleniyor...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {product && <ProductForm initial={product} categories={categories} />}
    </div>
  );
}
