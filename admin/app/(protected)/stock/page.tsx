'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarkodGiris } from '@/components/BarkodGiris';
import { tl } from '@/lib/karlilik';
import { basariSesi, hataSesi } from '@/lib/ses';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/lib/types';

type Mod = 'ekle' | 'sayim' | 'fire';
// birimAlis: mal kabulde girilen KDV hariç birim alış fiyatı ('' = girilmedi, maliyet değişmez).
type Satir = { product: Product; miktar: number; birimAlis: string };

const MOD_BILGI: Record<Mod, { baslik: string; aciklama: string; sutun: string }> = {
  ekle: {
    baslik: 'Mal Kabul',
    aciklama:
      'Gelen ürünleri okutun; her okutma 1 adet ekler. Faturadaki KDV hariç birim alış fiyatını girerseniz ürün maliyeti ağırlıklı ortalamayla güncellenir.',
    sutun: 'Eklenecek',
  },
  sayim: {
    baslik: 'Sayım',
    aciklama: 'Raftaki ürünleri tek tek okutun veya adedi yazın. Kaydedince stok sayılan adede eşitlenir.',
    sutun: 'Sayılan',
  },
  fire: {
    baslik: 'Fire / Zayi',
    aciklama:
      'Son kullanma tarihi geçen, hasarlı ya da kaybolan ürünleri okutun. Stoktan düşülür ve maliyeti kârlılık raporunda gider olarak görünür.',
    sutun: 'Fire',
  },
};

const FIRE_SEBEPLERI = [
  { id: 'skt', ad: 'Son kullanma tarihi geçti' },
  { id: 'hasar', ad: 'Hasarlı / bozuk' },
  { id: 'kayip', ad: 'Kayıp / çalıntı' },
  { id: 'diger', ad: 'Diğer' },
];

export default function StockPage() {
  const [mod, setMod] = useState<Mod>('ekle');
  const [urunler, setUrunler] = useState<Product[]>([]);
  const [maliyetler, setMaliyetler] = useState<Record<string, number>>({});
  const [satirlar, setSatirlar] = useState<Satir[]>([]);
  const [uyari, setUyari] = useState<{ tip: 'hata' | 'basari'; mesaj: string; barkod?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [fireSebebi, setFireSebebi] = useState(FIRE_SEBEPLERI[0].id);
  const [fireAciklama, setFireAciklama] = useState('');

  const urunleriYukle = async () => {
    const [{ data }, { data: maliyetData }] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('urun_maliyetleri').select('product_id, alis_fiyati'),
    ]);
    setUrunler((data as Product[]) ?? []);
    setMaliyetler(
      Object.fromEntries(
        (maliyetData ?? []).map((m: { product_id: string; alis_fiyati: number }) => [m.product_id, Number(m.alis_fiyati)])
      )
    );
  };

  useEffect(() => {
    // urunleriYukle() setState'i await'ten sonra çağırıyor; deps boş (mount-only fetch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    urunleriYukle();
  }, []);

  const barkodOkutuldu = (kod: string) => {
    const product = urunler.find((p) => p.barkod === kod);
    if (!product) {
      hataSesi();
      setUyari({ tip: 'hata', mesaj: `${kod} barkodlu ürün kayıtlı değil.`, barkod: kod });
      return;
    }
    basariSesi();
    setUyari({ tip: 'basari', mesaj: `${product.ad} okutuldu.` });
    setSatirlar((prev) =>
      prev.some((s) => s.product.id === product.id)
        ? prev.map((s) => (s.product.id === product.id ? { ...s, miktar: s.miktar + 1 } : s))
        : [{ product, miktar: 1, birimAlis: '' }, ...prev]
    );
  };

  const miktarDegistir = (id: string, miktar: number) =>
    setSatirlar((prev) => prev.map((s) => (s.product.id === id ? { ...s, miktar: Math.max(0, miktar) } : s)));

  const alisDegistir = (id: string, birimAlis: string) =>
    setSatirlar((prev) => prev.map((s) => (s.product.id === id ? { ...s, birimAlis } : s)));

  const modDegistir = (yeni: Mod) => {
    if (yeni === mod) return;
    if (satirlar.length > 0 && !window.confirm('Okutulan liste temizlenecek. Devam edilsin mi?')) return;
    setSatirlar([]);
    setUyari(null);
    setMod(yeni);
  };

  const kaydet = async () => {
    const adet = satirlar.reduce((t, s) => t + s.miktar, 0);
    const ozet =
      mod === 'ekle'
        ? `${satirlar.length} ürünün stoğuna toplam ${adet} adet eklenecek.`
        : mod === 'fire'
          ? `${satirlar.length} üründen toplam ${adet} adet fire olarak stoktan düşülecek.`
          : `${satirlar.length} ürünün stoğu sayılan adede eşitlenecek; eksik çıkanlar "sayım eksiği" firesi olarak kaydedilir.`;
    if (!window.confirm(`${ozet} Onaylıyor musunuz?`)) return;

    setSaving(true);
    // Mal kabul maliyeti de günceller (mal_kabul), fire stoktan düşüp kaydeder (fire_kaydet),
    // sayım stoğu eşitler ve eksiği fire yazar (stok_guncelle).
    const { error } =
      mod === 'fire'
        ? await supabase.rpc('fire_kaydet', {
            p_kalemler: satirlar
              .filter((s) => s.miktar > 0)
              .map((s) => ({ product_id: s.product.id, miktar: s.miktar })),
            p_sebep: fireSebebi,
            p_aciklama: fireAciklama.trim(),
          })
        : mod === 'ekle'
        ? await supabase.rpc('mal_kabul', {
            p_kalemler: satirlar
              .filter((s) => s.miktar > 0)
              .map((s) => ({
                product_id: s.product.id,
                miktar: s.miktar,
                birim_alis: s.birimAlis.trim() === '' ? null : Number(s.birimAlis),
              })),
          })
        : await supabase.rpc('stok_guncelle', {
            p_kalemler: satirlar.map((s) => ({ product_id: s.product.id, miktar: s.miktar })),
            p_mod: mod,
          });
    setSaving(false);
    if (error) {
      hataSesi();
      setUyari({ tip: 'hata', mesaj: error.message });
      return;
    }
    setSatirlar([]);
    setFireAciklama('');
    setUyari({ tip: 'basari', mesaj: 'Stoklar güncellendi.' });
    urunleriYukle();
  };

  const bilgi = MOD_BILGI[mod];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Stok</h1>

      <div className="mb-4 inline-flex rounded-lg border border-gray-300 bg-white p-1">
        {(Object.keys(MOD_BILGI) as Mod[]).map((m) => (
          <button
            key={m}
            onClick={() => modDegistir(m)}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold ${
              mod === m ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            {MOD_BILGI[m].baslik}
          </button>
        ))}
      </div>
      <p className="mb-3 text-sm text-gray-500">{bilgi.aciklama}</p>

      {mod === 'fire' && (
        <div className="mb-3 flex flex-wrap gap-2">
          <select
            value={fireSebebi}
            onChange={(e) => setFireSebebi(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {FIRE_SEBEPLERI.map((f) => (
              <option key={f.id} value={f.id}>
                {f.ad}
              </option>
            ))}
          </select>
          <input
            value={fireAciklama}
            onChange={(e) => setFireAciklama(e.target.value)}
            placeholder="Açıklama (ops.)"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      <BarkodGiris onScan={barkodOkutuldu} />

      {uyari && (
        <div
          className={`mt-3 rounded-lg px-4 py-2 text-sm font-semibold ${
            uyari.tip === 'hata' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
          }`}>
          {uyari.mesaj}
          {uyari.barkod && (
            <Link
              href={`/products/new?barkod=${encodeURIComponent(uyari.barkod)}`}
              className="ml-2 underline hover:no-underline">
              Yeni ürün olarak ekle
            </Link>
          )}
        </div>
      )}

      {satirlar.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Ürün</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Barkod</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-600">Mevcut</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-600">{bilgi.sutun}</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-600">Yeni Stok</th>
                {mod === 'ekle' && (
                  <>
                    <th className="px-4 py-2 text-right font-semibold text-gray-600">Mevcut Maliyet</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-600">Birim Alış (KDV hariç)</th>
                  </>
                )}
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {satirlar.map(({ product, miktar, birimAlis }) => {
                const yeniStok =
                  mod === 'ekle' ? product.stok + miktar : mod === 'fire' ? product.stok - miktar : miktar;
                return (
                  <tr key={product.id}>
                    <td className="px-4 py-2 font-medium text-gray-900">{product.ad}</td>
                    <td className="px-4 py-2 text-gray-500">{product.barkod}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{product.stok}</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        value={miktar}
                        onChange={(e) => miktarDegistir(product.id, Number(e.target.value))}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-right"
                      />
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-semibold ${
                        yeniStok < product.stok ? 'text-red-600' : 'text-emerald-700'
                      }`}>
                      {yeniStok}
                    </td>
                    {mod === 'ekle' && (
                      <>
                        <td className="px-4 py-2 text-right text-gray-600">
                          {maliyetler[product.id] != null ? tl(maliyetler[product.id]) : '-'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            value={birimAlis}
                            onChange={(e) => alisDegistir(product.id, e.target.value)}
                            placeholder="Boş"
                            className="w-24 rounded border border-gray-300 px-2 py-1 text-right"
                          />
                        </td>
                      </>
                    )}
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => setSatirlar((prev) => prev.filter((s) => s.product.id !== product.id))}
                        className="text-red-600 hover:underline">
                        Çıkar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex justify-end border-t border-gray-200 p-3">
            <button
              onClick={kaydet}
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {saving ? 'Kaydediliyor...' : `${bilgi.baslik} Kaydet`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
