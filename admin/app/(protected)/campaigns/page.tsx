'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { tl } from '@/lib/karlilik';
import { supabase } from '@/lib/supabase';

type Tur = 'yuzde' | 'tutar' | 'ucretsiz_teslimat';

type Kampanya = {
  id: string;
  ad: string;
  tur: Tur;
  deger: number | null;
  max_indirim: number | null;
  min_sepet: number;
  sadece_ilk_siparis: boolean;
  baslangic: string | null;
  bitis: string | null;
  aktif: boolean;
};

type Kullanim = { siparis: number; indirim: number };

const TUR_AD: Record<Tur, string> = {
  yuzde: 'Yüzde indirim',
  tutar: 'Tutar indirimi',
  ucretsiz_teslimat: 'Ücretsiz teslimat',
};

// <input type="datetime-local"> yerel saatle çalışır; veritabanı UTC saklar.
const yerelInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const isoYap = (yerel: string) => (yerel ? new Date(yerel).toISOString() : null);

const kosulMetni = (k: Kampanya) => {
  const parcalar = [
    k.tur === 'yuzde'
      ? `%${Number(k.deger)}${k.max_indirim != null ? ` (en fazla ${tl(Number(k.max_indirim))})` : ''}`
      : k.tur === 'tutar'
        ? tl(Number(k.deger))
        : 'Teslimat ücretsiz',
    Number(k.min_sepet) > 0 ? `${tl(Number(k.min_sepet))} üzeri` : null,
    k.sadece_ilk_siparis ? 'yalnızca ilk sipariş' : null,
    k.bitis ? `${new Date(k.bitis).toLocaleDateString('tr-TR')} tarihine kadar` : null,
  ];
  return parcalar.filter(Boolean).join(' · ');
};

const BOS: Omit<Kampanya, 'id'> = {
  ad: '',
  tur: 'yuzde',
  deger: 10,
  max_indirim: null,
  min_sepet: 0,
  sadece_ilk_siparis: false,
  baslangic: null,
  bitis: null,
  aktif: true,
};

export default function CampaignsPage() {
  const [kampanyalar, setKampanyalar] = useState<Kampanya[]>([]);
  const [kullanim, setKullanim] = useState<Record<string, Kullanim>>({});
  const [duzenlenen, setDuzenlenen] = useState<(Omit<Kampanya, 'id'> & { id?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yukle = async () => {
    const [{ data, error: fetchError }, { data: siparisData }] = await Promise.all([
      supabase.from('kampanyalar').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('kampanya_id, indirim_tutari').not('kampanya_id', 'is', null).neq('durum', 'iptal'),
    ]);
    if (fetchError) setError(fetchError.message);
    else setKampanyalar((data as Kampanya[]) ?? []);
    const k: Record<string, Kullanim> = {};
    (siparisData ?? []).forEach((s: { kampanya_id: string; indirim_tutari: number }) => {
      k[s.kampanya_id] ??= { siparis: 0, indirim: 0 };
      k[s.kampanya_id].siparis++;
      k[s.kampanya_id].indirim += Number(s.indirim_tutari);
    });
    setKullanim(k);
    setLoading(false);
  };

  useEffect(() => {
    // yukle() setState'i await'ten sonra çağırıyor; deps boş (mount-only fetch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    yukle();
  }, []);

  const kaydet = async (e: FormEvent) => {
    e.preventDefault();
    if (!duzenlenen) return;
    setSaving(true);
    setError(null);
    const { id, ...alanlar } = duzenlenen;
    const satir = {
      ...alanlar,
      ad: alanlar.ad.trim(),
      deger: alanlar.tur === 'ucretsiz_teslimat' ? null : alanlar.deger,
      max_indirim: alanlar.tur === 'yuzde' ? alanlar.max_indirim : null,
    };
    const { error: saveError } = id
      ? await supabase.from('kampanyalar').update(satir).eq('id', id)
      : await supabase.from('kampanyalar').insert(satir);
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setDuzenlenen(null);
    yukle();
  };

  const aktifDegistir = async (k: Kampanya) => {
    const { error: updateError } = await supabase.from('kampanyalar').update({ aktif: !k.aktif }).eq('id', k.id);
    if (updateError) setError(updateError.message);
    else setKampanyalar((prev) => prev.map((x) => (x.id === k.id ? { ...x, aktif: !x.aktif } : x)));
  };

  const alan = <K extends keyof Kampanya>(ad: K, deger: Kampanya[K]) =>
    setDuzenlenen((prev) => (prev ? { ...prev, [ad]: deger } : prev));

  const sayi = (v: string) => (v === '' ? null : Number(v));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kampanyalar</h1>
          <p className="text-sm text-gray-500">
            Bir siparişe tek kampanya uygulanır: koşulları sağlayanlardan en avantajlısı. İndirimi sipariş anında sunucu hesaplar.
          </p>
        </div>
        <button
          onClick={() => setDuzenlenen({ ...BOS })}
          className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          + Yeni Kampanya
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {duzenlenen && (
        <form onSubmit={kaydet} className="mb-8 max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-bold text-gray-900">{duzenlenen.id ? 'Kampanyayı Düzenle' : 'Yeni Kampanya'}</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Ad <span className="font-normal text-gray-400">(müşteri sepette görür)</span>
            </label>
            <input
              value={duzenlenen.ad}
              onChange={(e) => alan('ad', e.target.value)}
              required
              placeholder="İlk Siparişe %10 İndirim"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Tür</label>
              <select
                value={duzenlenen.tur}
                onChange={(e) => alan('tur', e.target.value as Tur)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {(Object.keys(TUR_AD) as Tur[]).map((t) => (
                  <option key={t} value={t}>
                    {TUR_AD[t]}
                  </option>
                ))}
              </select>
            </div>
            {duzenlenen.tur !== 'ucretsiz_teslimat' && (
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {duzenlenen.tur === 'yuzde' ? 'Yüzde (%)' : 'Tutar (TL)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={duzenlenen.tur === 'yuzde' ? 100 : undefined}
                  value={duzenlenen.deger ?? ''}
                  onChange={(e) => alan('deger', sayi(e.target.value))}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Minimum sepet (TL)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={duzenlenen.min_sepet}
                onChange={(e) => alan('min_sepet', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            {duzenlenen.tur === 'yuzde' && (
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">En fazla indirim (TL)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={duzenlenen.max_indirim ?? ''}
                  onChange={(e) => alan('max_indirim', sayi(e.target.value))}
                  placeholder="Sınırsız"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Başlangıç</label>
              <input
                type="datetime-local"
                value={yerelInput(duzenlenen.baslangic)}
                onChange={(e) => alan('baslangic', isoYap(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Bitiş</label>
              <input
                type="datetime-local"
                value={yerelInput(duzenlenen.bitis)}
                onChange={(e) => alan('bitis', isoYap(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={duzenlenen.sadece_ilk_siparis}
              onChange={(e) => alan('sadece_ilk_siparis', e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <b>Yalnızca ilk sipariş</b>
              <span className="block text-xs text-gray-500">
                Hesabın, telefon numarasının ya da teslimat adresinin daha önce iptal edilmemiş siparişi varsa uygulanmaz.
              </span>
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={duzenlenen.aktif} onChange={(e) => alan('aktif', e.target.checked)} />
            Aktif
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button
              type="button"
              onClick={() => setDuzenlenen(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Vazgeç
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Yükleniyor...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Kampanya</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Koşullar</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-600">Kullanım</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-600">Toplam indirim</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Durum</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {kampanyalar.map((k) => {
                const bitti = k.bitis != null && new Date(k.bitis) <= new Date();
                return (
                  <tr key={k.id}>
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {k.ad}
                      <div className="text-xs font-normal text-gray-400">{TUR_AD[k.tur]}</div>
                    </td>
                    <td className="px-4 py-2 text-gray-600">{kosulMetni(k)}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{kullanim[k.id]?.siparis ?? 0} sipariş</td>
                    <td className="px-4 py-2 text-right text-gray-600">{tl(kullanim[k.id]?.indirim ?? 0)}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => aktifDegistir(k)}
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          k.aktif && !bitti ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                        {bitti ? 'Süresi doldu' : k.aktif ? 'Aktif' : 'Pasif'}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => setDuzenlenen({ ...k })}
                        className="text-emerald-700 hover:underline">
                        Düzenle
                      </button>
                    </td>
                  </tr>
                );
              })}
              {kampanyalar.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    Kampanya yok.
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
