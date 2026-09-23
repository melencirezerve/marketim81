'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { BarkodGiris } from '@/components/BarkodGiris';
import { basariSesi, hataSesi } from '@/lib/ses';
import { supabase } from '@/lib/supabase';
import type { OrderStatus } from '@/lib/types';

type Kalem = {
  id: string;
  ad: string;
  gorsel_url: string;
  miktar: number;
  barkod: string | null;
  okunan: number;
};

type Siparis = {
  id: string;
  durum: OrderStatus;
  musteri_adi: string | null;
  teslimat_adresi: string | null;
  toplandi_at: string | null;
};

export default function SiparisHazirlaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [siparis, setSiparis] = useState<Siparis | null>(null);
  const [kalemler, setKalemler] = useState<Kalem[]>([]);
  const [uyari, setUyari] = useState<{ tip: 'hata' | 'basari'; mesaj: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  // Okuyucu art arda hızlı okuttuğunda render beklenmeden güncel listeyle çalışmak için.
  const kalemlerRef = useRef<Kalem[]>([]);
  const kalemleriGuncelle = (fn: (liste: Kalem[]) => Kalem[]) => {
    kalemlerRef.current = fn(kalemlerRef.current);
    setKalemler(kalemlerRef.current);
  };

  useEffect(() => {
    const id = params.id;
    supabase
      .from('orders')
      .select('id, durum, musteri_adi, teslimat_adresi, toplandi_at, order_items(id, ad, gorsel_url, miktar, products(barkod))')
      .eq('id', id)
      .single()
      .then(async ({ data, error: fetchError }) => {
        if (fetchError || !data) {
          setError(fetchError?.message ?? 'Sipariş bulunamadı.');
          return;
        }
        const { order_items, ...s } = data as unknown as Siparis & {
          order_items: { id: string; ad: string; gorsel_url: string; miktar: number; products: { barkod: string | null } | null }[];
        };
        kalemleriGuncelle(() =>
          order_items.map((it) => ({
            id: it.id,
            ad: it.ad,
            gorsel_url: it.gorsel_url,
            miktar: it.miktar,
            barkod: it.products?.barkod ?? null,
            okunan: s.toplandi_at ? it.miktar : 0,
          }))
        );
        // Toplamaya başlanınca müşteri "Hazırlanıyor" bildirimi alsın.
        if (s.durum === 'alindi') {
          const { error: updateError } = await supabase.from('orders').update({ durum: 'hazirlaniyor' }).eq('id', id);
          if (!updateError) s.durum = 'hazirlaniyor';
        }
        setSiparis(s);
      });

    // Toplarken müşteri iptal ederse hemen görülsün.
    const kanal = supabase
      .channel(`hazirla-${id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, (payload) => {
        const yeni = payload.new as Siparis;
        setSiparis((prev) => (prev ? { ...prev, durum: yeni.durum, toplandi_at: yeni.toplandi_at } : prev));
        if (yeni.durum === 'iptal') hataSesi();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(kanal);
    };
  }, [params.id]);

  const barkodOkutuldu = (kod: string) => {
    const liste = kalemlerRef.current;
    const eslesen = liste.filter((k) => k.barkod === kod);
    if (eslesen.length === 0) {
      hataSesi();
      setUyari({ tip: 'hata', mesaj: `YANLIŞ ÜRÜN: ${kod} bu siparişte yok.` });
      return;
    }
    const eksik = eslesen.find((k) => k.okunan < k.miktar);
    if (!eksik) {
      hataSesi();
      setUyari({ tip: 'hata', mesaj: `FAZLA: ${eslesen[0].ad} için istenen ${eslesen[0].miktar} adet zaten okutuldu.` });
      return;
    }
    basariSesi();
    setUyari({ tip: 'basari', mesaj: `${eksik.ad} (${eksik.okunan + 1}/${eksik.miktar})` });
    kalemleriGuncelle((liste) => liste.map((k) => (k.id === eksik.id ? { ...k, okunan: k.okunan + 1 } : k)));
  };

  // Barkodu okunmayan (etiketsiz / hasarlı barkod / silinmiş ürün) kalemler için elle onay.
  const elleDegistir = (id: string, fark: number) =>
    kalemleriGuncelle((liste) =>
      liste.map((k) => (k.id === id ? { ...k, okunan: Math.min(k.miktar, Math.max(0, k.okunan + fark)) } : k))
    );

  const toplamIstenen = kalemler.reduce((t, k) => t + k.miktar, 0);
  const toplamOkunan = kalemler.reduce((t, k) => t + k.okunan, 0);
  const tamam = kalemler.length > 0 && toplamOkunan === toplamIstenen;
  const iptal = siparis?.durum === 'iptal';

  const yolaCikar = async () => {
    if (!siparis) return;
    setKaydediliyor(true);
    const { error: updateError } = await supabase
      .from('orders')
      .update({ durum: 'yolda', toplandi_at: new Date().toISOString() })
      .eq('id', siparis.id)
      .neq('durum', 'iptal');
    setKaydediliyor(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push('/orders');
  };

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!siparis) return <p className="text-sm text-gray-500">Yükleniyor...</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <Link href="/orders" className="text-sm text-emerald-700 hover:underline">
            ← Siparişler
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{siparis.id} · Hazırla</h1>
          <p className="text-sm text-gray-500">
            {siparis.musteri_adi ?? '-'} · {siparis.teslimat_adresi ?? ''}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-extrabold ${tamam ? 'text-emerald-600' : 'text-gray-900'}`}>
            {toplamOkunan}/{toplamIstenen}
          </div>
          <div className="text-xs text-gray-500">okutulan</div>
        </div>
      </div>

      {iptal ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-6 text-center text-lg font-bold text-red-700">
          ⚠️ Bu sipariş iptal edildi. Toplamayı bırakın, ürünleri rafa geri koyun.
        </div>
      ) : (
        <>
          <BarkodGiris onScan={barkodOkutuldu} />

          {uyari && (
            <div
              className={`mt-3 rounded-lg px-4 py-3 text-base font-bold ${
                uyari.tip === 'hata' ? 'bg-red-600 text-white' : 'bg-emerald-50 text-emerald-700'
              }`}>
              {uyari.mesaj}
            </div>
          )}

          <ul className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {kalemler.map((k) => {
              const bitti = k.okunan === k.miktar;
              return (
                <li key={k.id} className={`flex items-center gap-3 px-4 py-3 ${bitti ? 'bg-emerald-50' : ''}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={k.gorsel_url} alt="" className="h-12 w-12 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className={`font-semibold ${bitti ? 'text-emerald-800' : 'text-gray-900'}`}>
                      {bitti && '✓ '}
                      {k.ad}
                    </div>
                    <div className="text-xs text-gray-400">{k.barkod ?? 'Barkod yok — elle onaylayın'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => elleDegistir(k.id, -1)}
                      className="h-8 w-8 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                      aria-label="Bir azalt">
                      −
                    </button>
                    <span className={`w-14 text-center text-lg font-bold ${bitti ? 'text-emerald-700' : 'text-gray-900'}`}>
                      {k.okunan}/{k.miktar}
                    </span>
                    <button
                      onClick={() => elleDegistir(k.id, 1)}
                      className="h-8 w-8 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                      aria-label="Elle bir ekle">
                      +
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            onClick={yolaCikar}
            disabled={!tamam || kaydediliyor}
            className="mt-4 w-full rounded-xl bg-emerald-600 py-4 text-base font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300">
            {kaydediliyor
              ? 'Kaydediliyor...'
              : tamam
                ? 'Toplandı · Yola Çıkar'
                : `${toplamIstenen - toplamOkunan} ürün daha okutulmalı`}
          </button>
        </>
      )}
    </div>
  );
}
