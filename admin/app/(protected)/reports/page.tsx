'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { tl } from '@/lib/karlilik';
import { supabase } from '@/lib/supabase';

type Ozet = {
  siparis_sayisi: number;
  ciro_brut: number;
  ciro_net: number;
  maliyet: number;
  brut_kar: number;
  teslimat_brut: number;
  teslimat_net: number;
  maliyet_eksik_kalem: number;
  kdv_eksik_kalem: number;
};
type UrunSatiri = {
  product_id: string | null;
  ad: string;
  adet: number;
  ciro_brut: number;
  ciro_net: number;
  maliyet: number;
  brut_kar: number;
  maliyet_eksik: boolean;
  kdv_eksik: boolean;
};
type GunSatiri = { gun: string; siparis: number; ciro_net: number; brut_kar: number };
type Rapor = { ozet: Ozet; urunler: UrunSatiri[]; gunluk: GunSatiri[] };

type Aralik = 'bugun' | 'yedi' | 'buay' | 'gecenay' | 'ozel';
type Siralama = 'kar' | 'ciro' | 'marj';

const ARALIKLAR: { id: Aralik; ad: string }[] = [
  { id: 'bugun', ad: 'Bugün' },
  { id: 'yedi', ad: 'Son 7 gün' },
  { id: 'buay', ad: 'Bu ay' },
  { id: 'gecenay', ad: 'Geçen ay' },
  { id: 'ozel', ad: 'Özel' },
];

const gunBasi = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const tarihInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Tarayıcının yerel saatine göre [başlangıç, bitiş) aralığı.
function araligiHesapla(aralik: Aralik, ozelBas: string, ozelBit: string): [Date, Date] {
  const bugun = gunBasi(new Date());
  const yarin = new Date(bugun.getFullYear(), bugun.getMonth(), bugun.getDate() + 1);
  switch (aralik) {
    case 'bugun':
      return [bugun, yarin];
    case 'yedi':
      return [new Date(bugun.getFullYear(), bugun.getMonth(), bugun.getDate() - 6), yarin];
    case 'buay':
      return [new Date(bugun.getFullYear(), bugun.getMonth(), 1), yarin];
    case 'gecenay':
      return [
        new Date(bugun.getFullYear(), bugun.getMonth() - 1, 1),
        new Date(bugun.getFullYear(), bugun.getMonth(), 1),
      ];
    case 'ozel': {
      const [y1, m1, d1] = ozelBas.split('-').map(Number);
      const [y2, m2, d2] = ozelBit.split('-').map(Number);
      return [new Date(y1, m1 - 1, d1), new Date(y2, m2 - 1, d2 + 1)];
    }
  }
}

const marj = (kar: number, net: number) => (net > 0 ? (kar / net) * 100 : 0);

export default function ReportsPage() {
  const [aralik, setAralik] = useState<Aralik>('buay');
  const [ozelBas, setOzelBas] = useState(() => tarihInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [ozelBit, setOzelBit] = useState(() => tarihInput(new Date()));
  const [siralama, setSiralama] = useState<Siralama>('kar');
  const [rapor, setRapor] = useState<Rapor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const [bas, bit] = araligiHesapla(aralik, ozelBas, ozelBit);
    let iptal = false;
    supabase
      .rpc('karlilik_raporu', { p_baslangic: bas.toISOString(), p_bitis: bit.toISOString() })
      .then(({ data, error: rpcError }) => {
        if (iptal) return;
        if (rpcError) setError(rpcError.message);
        else {
          setError(null);
          setRapor(data as Rapor);
        }
        setLoading(false);
      });
    return () => {
      iptal = true;
    };
  }, [aralik, ozelBas, ozelBit]);

  const urunler = useMemo(() => {
    const liste = [...(rapor?.urunler ?? [])];
    if (siralama === 'ciro') liste.sort((a, b) => b.ciro_net - a.ciro_net);
    else if (siralama === 'marj') liste.sort((a, b) => marj(a.brut_kar, a.ciro_net) - marj(b.brut_kar, b.ciro_net));
    else liste.sort((a, b) => b.brut_kar - a.brut_kar);
    return liste;
  }, [rapor, siralama]);

  const csvIndir = () => {
    if (!rapor) return;
    const satirlar = [
      ['Ürün', 'Adet', 'Ciro KDV dahil', 'Ciro KDV hariç', 'Maliyet', 'Brüt kâr', 'Marj %', 'Eksik veri'],
      ...urunler.map((u) => [
        u.ad,
        u.adet,
        u.ciro_brut,
        u.ciro_net,
        u.maliyet,
        u.brut_kar,
        Number(marj(u.brut_kar, u.ciro_net).toFixed(1)),
        [u.maliyet_eksik && 'maliyet', u.kdv_eksik && 'KDV'].filter(Boolean).join(' '),
      ]),
    ];
    // Türkçe Excel ; ayırıcı ve virgüllü ondalık bekliyor; BOM ile UTF-8 doğru açılır.
    const csv = satirlar
      .map((r) =>
        r.map((h) => `"${(typeof h === 'number' ? String(h).replace('.', ',') : String(h)).replace(/"/g, '""')}"`).join(';')
      )
      .join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `karlilik-${aralik}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const o = rapor?.ozet;
  const enYuksekKar = Math.max(1, ...(rapor?.gunluk ?? []).map((g) => Math.abs(g.brut_kar)));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Kârlılık</h1>
        <button
          onClick={csvIndir}
          disabled={!rapor}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          Excel&apos;e aktar (CSV)
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {ARALIKLAR.map((a) => (
          <button
            key={a.id}
            onClick={() => {
              setLoading(true);
              setAralik(a.id);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              aralik === a.id ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}>
            {a.ad}
          </button>
        ))}
        {aralik === 'ozel' && (
          <>
            <input
              type="date"
              value={ozelBas}
              onChange={(e) => setOzelBas(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
            />
            <span className="text-gray-400">–</span>
            <input
              type="date"
              value={ozelBit}
              onChange={(e) => setOzelBit(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
            />
          </>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading || !o ? (
        <p className="text-sm text-gray-500">Yükleniyor...</p>
      ) : (
        <>
          {(o.maliyet_eksik_kalem > 0 || o.kdv_eksik_kalem > 0) && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              ⚠️ Bu aralıkta {o.maliyet_eksik_kalem > 0 && <b>{o.maliyet_eksik_kalem} sipariş kaleminde alış maliyeti</b>}
              {o.maliyet_eksik_kalem > 0 && o.kdv_eksik_kalem > 0 && ' ve '}
              {o.kdv_eksik_kalem > 0 && <b>{o.kdv_eksik_kalem} kalemde KDV oranı</b>} yok; bunlar 0 sayıldığı için
              kâr olduğundan yüksek görünür. Eksikleri{' '}
              <Link href="/products" className="font-semibold underline">
                Ürünler
              </Link>{' '}
              sayfasından girin. Değerler sipariş anında dondurulduğu için yalnızca bundan sonraki siparişlere yansır.
            </div>
          )}

          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kart baslik="Sipariş" deger={String(o.siparis_sayisi)} alt="iptaller hariç" />
            <Kart baslik="Ciro (KDV hariç)" deger={tl(o.ciro_net)} alt={`KDV dahil ${tl(o.ciro_brut)}`} />
            <Kart baslik="Ürün maliyeti" deger={tl(o.maliyet)} alt="KDV hariç alış" />
            <Kart
              baslik="Brüt kâr"
              deger={tl(o.brut_kar)}
              alt={`marj %${marj(o.brut_kar, o.ciro_net).toFixed(1)}`}
              renk={o.brut_kar < 0 ? 'red' : 'emerald'}
            />
            <Kart baslik="Teslimat geliri" deger={tl(o.teslimat_net)} alt={`KDV dahil ${tl(o.teslimat_brut)}`} />
            <Kart
              baslik="Brüt kâr + teslimat"
              deger={tl(o.brut_kar + o.teslimat_net)}
              alt="kurye, POS, ambalaj düşülmedi"
              renk={o.brut_kar + o.teslimat_net < 0 ? 'red' : 'emerald'}
            />
            <Kart
              baslik="Sipariş başı kâr"
              deger={tl(o.siparis_sayisi ? (o.brut_kar + o.teslimat_net) / o.siparis_sayisi : 0)}
              alt="ortalama, teslimat dahil"
            />
            <Kart
              baslik="Ortalama sepet"
              deger={tl(o.siparis_sayisi ? o.ciro_brut / o.siparis_sayisi : 0)}
              alt="KDV dahil"
            />
          </div>

          {rapor.gunluk.length > 1 && (
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-bold text-gray-700">Günlük brüt kâr</h2>
              <div className="space-y-1.5">
                {rapor.gunluk.map((g) => (
                  <div key={g.gun} className="flex items-center gap-3 text-xs">
                    <span className="w-20 shrink-0 text-gray-500">
                      {new Date(g.gun + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </span>
                    <div className="h-4 flex-1 rounded bg-gray-100">
                      <div
                        className={`h-4 rounded ${g.brut_kar < 0 ? 'bg-red-400' : 'bg-emerald-500'}`}
                        style={{ width: `${(Math.abs(g.brut_kar) / enYuksekKar) * 100}%` }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right font-semibold text-gray-800">{tl(g.brut_kar)}</span>
                    <span className="w-16 shrink-0 text-right text-gray-400">{g.siparis} sip.</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
              <h2 className="text-sm font-bold text-gray-700">Ürün bazında</h2>
              <select
                value={siralama}
                onChange={(e) => setSiralama(e.target.value as Siralama)}
                className="rounded-lg border border-gray-300 px-2 py-1 text-xs">
                <option value="kar">En çok kâr</option>
                <option value="ciro">En çok ciro</option>
                <option value="marj">En düşük marj</option>
              </select>
            </div>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">Ürün</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">Adet</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">Ciro (KDV hariç)</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">Maliyet</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">Brüt kâr</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">Marj</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {urunler.map((u) => {
                  const m = marj(u.brut_kar, u.ciro_net);
                  return (
                    <tr key={u.product_id ?? u.ad} className={u.brut_kar < 0 ? 'bg-red-50' : ''}>
                      <td className="px-4 py-2 font-medium text-gray-900">
                        {u.product_id ? (
                          <Link href={`/products/${u.product_id}`} className="hover:underline">
                            {u.ad}
                          </Link>
                        ) : (
                          u.ad
                        )}
                        {u.maliyet_eksik && (
                          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            maliyet yok
                          </span>
                        )}
                        {u.kdv_eksik && (
                          <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            KDV yok
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">{u.adet}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{tl(u.ciro_net)}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{tl(u.maliyet)}</td>
                      <td className={`px-4 py-2 text-right font-semibold ${u.brut_kar < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {tl(u.brut_kar)}
                      </td>
                      <td className={`px-4 py-2 text-right ${m < 0 ? 'text-red-600' : m < 10 ? 'text-amber-600' : 'text-emerald-700'}`}>
                        %{m.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
                {urunler.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                      Bu aralıkta satış yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Kart({
  baslik,
  deger,
  alt,
  renk,
}: {
  baslik: string;
  deger: string;
  alt?: string;
  renk?: 'red' | 'emerald';
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs font-semibold text-gray-500">{baslik}</div>
      <div
        className={`mt-1 text-xl font-extrabold ${
          renk === 'red' ? 'text-red-600' : renk === 'emerald' ? 'text-emerald-700' : 'text-gray-900'
        }`}>
        {deger}
      </div>
      {alt && <div className="mt-0.5 text-xs text-gray-400">{alt}</div>}
    </div>
  );
}
