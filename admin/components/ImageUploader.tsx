'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

type Props = {
  value: string;
  onChange: (url: string) => void;
  pathPrefix: 'products' | 'categories';
  /** categories için slug (upsert), products için boş bırakılır (her yüklemede uuid üretilir) */
  fileName?: string;
};

export function ImageUploader({ value, onChange, pathPrefix, fileName }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const name = fileName || crypto.randomUUID();
      const path = `${pathPrefix}/${name}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('catalog-images')
        .upload(path, file, { upsert: Boolean(fileName), contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('catalog-images').getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Görsel yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">Görsel</label>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="mb-2 h-24 w-24 rounded-lg border border-gray-200 object-cover" />
      )}
      <input
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="block w-full text-sm text-gray-600"
      />
      {uploading && <p className="mt-1 text-xs text-gray-400">Yükleniyor...</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
