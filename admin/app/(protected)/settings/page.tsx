'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import type { MarketAyarlari } from '@/lib/types';

// Mobil sepet bu değerleri gösterir; asıl kontrol siparis_olustur() içinde (migration-007).
export default function SettingsPage() {
  const [minSepet, setMinSepet] = useState(0);
  const [teslimatUcreti, setTeslimatUcreti] = useState(0);
  const [ucretsizEsik, setUcretsizEsik] = useState('');
  const [teslimatKdv, setTeslimatKdv] = useState(20);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from('market_ayarlari')
      .select('*')
      .single()
      .then(({ data, error: fetchError }) => {
        if (fetchError) setError(fetchError.message);
        else {
          const a = data as MarketAyarlari;
          setMinSepet(Number(a.min_sepet_tutari));
          setTeslimatUcreti(Number(a.teslimat_ucreti));
          setUcretsizEsik(a.ucretsiz_teslimat_esigi == null ? '' : String(Number(a.ucretsiz_teslimat_esigi)));
          setTeslimatKdv(Number(a.teslimat_kdv_orani ?? 20));
        }
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error: updateError } = await supabase
      .from('market_ayarlari')
      .update({
        min_sepet_tutari: minSepet,
        teslimat_ucreti: teslimatUcreti,
        ucretsiz_teslimat_esigi: ucretsizEsik === '' ? null : Number(ucretsizEsik),
        teslimat_kdv_orani: teslimatKdv,
      })
      .eq('id', true);
    if (updateError) setError(updateError.message);
    else setSaved(true);
    setSaving(false);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Ayarlar</h1>
      {loading ? (
        <p className="text-sm text-gray-500">Yükleniyor...</p>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Minimum sipariş tutarı (TL)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={minSepet}
              onChange={(e) => setMinSepet(Number(e.target.value))}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-400">0 ise minimum yok.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Teslimat ücreti (TL)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={teslimatUcreti}
              onChange={(e) => setTeslimatUcreti(Number(e.target.value))}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Ücretsiz teslimat eşiği (TL)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={ucretsizEsik}
              onChange={(e) => setUcretsizEsik(e.target.value)}
              placeholder="Boş bırakılırsa her siparişe teslimat ücreti eklenir"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-400">Sepet bu tutar ve üzerindeyse teslimat ücretsiz olur.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Teslimat ücreti KDV oranı (%)</label>
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              value={teslimatKdv}
              onChange={(e) => setTeslimatKdv(Number(e.target.value))}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-400">Kârlılık raporunda teslimat gelirinin KDV hariç tutarı için.</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-emerald-700">Kaydedildi.</p>}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </form>
      )}
    </div>
  );
}
