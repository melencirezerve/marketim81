'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { yeniSiparisSesi } from '@/lib/ses';
import { supabase } from '@/lib/supabase';
import type { Kurye, OdemeYontemi, OrderStatus, OrderWithItems } from '@/lib/types';

const ODEME_LABEL: Record<OdemeYontemi, string> = {
  kapida_nakit: 'Kapıda Nakit',
  kapida_kart: 'Kapıda Kart',
};

const DURUM_META: Record<OrderStatus, { label: string; className: string }> = {
  alindi: { label: 'Sipariş Alındı', className: 'bg-blue-100 text-blue-700' },
  hazirlaniyor: { label: 'Hazırlanıyor', className: 'bg-amber-100 text-amber-700' },
  yolda: { label: 'Yolda', className: 'bg-purple-100 text-purple-700' },
  kapinda: { label: 'Kapında', className: 'bg-emerald-100 text-emerald-700' },
  iptal: { label: 'İptal Edildi', className: 'bg-gray-200 text-gray-600' },
};

const DURUM_SIRASI: OrderStatus[] = ['alindi', 'hazirlaniyor', 'yolda', 'kapinda', 'iptal'];

const SIPARIS_SORGUSU = '*, order_items(*)';

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [kuryeler, setKuryeler] = useState<Kurye[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [yeniSiparisler, setYeniSiparisler] = useState<string[]>([]);
  const [iptalEdilenler, setIptalEdilenler] = useState<string[]>([]);
  // Admin'in bu sayfadan kendi yaptığı iptaller için "müşteri iptal etti" uyarısı çıkmasın.
  const kendiIptallerim = useRef(new Set<string>());

  const load = async () => {
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select(SIPARIS_SORGUSU)
      .order('created_at', { ascending: false });
    if (fetchError) setError(fetchError.message);
    else setOrders((data as OrderWithItems[]) ?? []);
    const { data: k } = await supabase.from('kuryeler').select('*').order('ad');
    setKuryeler((k as Kurye[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    // load() only sets state after its internal await, but the linter can't see through
    // the indirection — safe here since deps are empty (mount-only fetch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();

    // Yeni sipariş ve başka sekmeden/iptalden gelen durum değişiklikleri anında görünsün.
    const kanal = supabase
      // Benzersiz ad: aynı adlı kanal varsa supabase onu döndürür; Strict Mode'da efekt
      // iki kez çalışınca yeni abonelik, kaldırılmakta olan eskisine takılıyordu.
      .channel(`admin-siparisler-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload) => {
        const id = (payload.new as { id: string }).id;
        // order_items aynı işlemde yazılıyor; kalemleriyle birlikte çek.
        const { data } = await supabase.from('orders').select(SIPARIS_SORGUSU).eq('id', id).single();
        if (!data) return;
        setOrders((prev) => (prev.some((o) => o.id === id) ? prev : [data as OrderWithItems, ...prev]));
        setYeniSiparisler((prev) => [...prev, id]);
        yeniSiparisSesi();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const yeni = payload.new as OrderWithItems;
        setOrders((prev) => prev.map((o) => (o.id === yeni.id ? { ...o, ...yeni, order_items: o.order_items } : o)));
        if (yeni.durum === 'iptal') {
          // İptal edilen sipariş artık "yeni sipariş" değil; hazırlanmasın diye ayrıca uyar.
          setYeniSiparisler((prev) => prev.filter((id) => id !== yeni.id));
          if (!kendiIptallerim.current.has(yeni.id)) {
            setIptalEdilenler((prev) => (prev.includes(yeni.id) ? prev : [...prev, yeni.id]));
            yeniSiparisSesi();
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(kanal);
    };
  }, []);

  useEffect(() => {
    const uyari = yeniSiparisler.length + iptalEdilenler.length;
    document.title = uyari > 0 ? `(${uyari}) Siparişlerde değişiklik!` : 'Siparis81 Admin';
  }, [yeniSiparisler, iptalEdilenler]);

  const filtered = useMemo(
    () => (statusFilter ? orders.filter((o) => o.durum === statusFilter) : orders),
    [orders, statusFilter]
  );

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const changeStatus = async (order: OrderWithItems, durum: OrderStatus) => {
    if (
      durum === 'iptal' &&
      !window.confirm(`${order.id} iptal edilsin mi? Ürünler stoğa geri eklenir ve bu işlem geri alınamaz.`)
    ) {
      return;
    }
    if (
      (durum === 'yolda' || durum === 'kapinda') &&
      !order.toplandi_at &&
      !window.confirm(`${order.id} ürünleri barkodla okutularak toplanmadı. Yine de devam edilsin mi?`)
    ) {
      return;
    }
    setUpdatingId(order.id);
    setError(null);
    if (durum === 'iptal') kendiIptallerim.current.add(order.id);
    const { error: updateError } = await supabase.from('orders').update({ durum }).eq('id', order.id);
    if (updateError) {
      kendiIptallerim.current.delete(order.id);
      setError(updateError.message);
    }
    else setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, durum } : o)));
    setUpdatingId(null);
  };

  const kuryeAta = async (order: OrderWithItems, kuryeId: string) => {
    setUpdatingId(order.id);
    setError(null);
    const kurye_id = kuryeId || null;
    const { error: updateError } = await supabase.from('orders').update({ kurye_id }).eq('id', order.id);
    if (updateError) setError(updateError.message);
    else setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, kurye_id } : o)));
    setUpdatingId(null);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Siparişler</h1>
      </div>

      <div className="mb-4 flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">Tüm durumlar</option>
          {DURUM_SIRASI.map((d) => (
            <option key={d} value={d}>
              {DURUM_META[d].label}
            </option>
          ))}
        </select>
      </div>

      {yeniSiparisler.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3">
          <span className="text-sm font-semibold text-emerald-800">
            🔔 {yeniSiparisler.length} yeni sipariş geldi: {yeniSiparisler.join(', ')}
          </span>
          <button
            onClick={() => setYeniSiparisler([])}
            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
            Gördüm
          </button>
        </div>
      )}

      {iptalEdilenler.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-red-300 bg-red-50 px-4 py-3">
          <span className="text-sm font-semibold text-red-800">
            ⚠️ Müşteri siparişi iptal etti, hazırlamayın: {iptalEdilenler.join(', ')}
          </span>
          <button
            onClick={() => setIptalEdilenler([])}
            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700">
            Gördüm
          </button>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">Yükleniyor...</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Sipariş No</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Müşteri</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Tarih</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Ürün Sayısı</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Toplam</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Ödeme</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Durum</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((o) => {
                const urunSayisi = o.order_items.reduce((sum, it) => sum + it.miktar, 0);
                const isOpen = expanded.has(o.id);
                return (
                  <Fragment key={o.id}>
                    <tr
                      className={
                        iptalEdilenler.includes(o.id) ? 'bg-red-50' : yeniSiparisler.includes(o.id) ? 'bg-emerald-50' : ''
                      }>
                      <td className="px-4 py-2 font-medium text-gray-900">
                        {o.id}
                        {Number(o.indirim_tutari) > 0 && (
                          <div
                            title={`${o.kampanya_adi ?? 'Kampanya'}: −${Number(o.indirim_tutari).toFixed(2)} TL`}
                            className="mt-0.5 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            🎉 {o.kampanya_adi ?? 'Kampanya'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        <div>{o.musteri_adi || <span className="text-gray-300">-</span>}</div>
                        {o.musteri_email && (
                          <div className="text-xs text-gray-400">{o.musteri_email}</div>
                        )}
                        {o.musteri_telefon && (
                          <div className="text-xs text-gray-400">{o.musteri_telefon}</div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {new Date(o.created_at).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{urunSayisi} ürün</td>
                      <td className="px-4 py-2 text-gray-600">{Number(o.toplam).toFixed(2)} TL</td>
                      <td className="px-4 py-2 text-gray-600">
                        {ODEME_LABEL[o.odeme_yontemi] ?? o.odeme_yontemi}
                        {o.odeme_kapida_degisti && (
                          <div className="text-[11px] text-amber-600" title="Kurye teslimde ödeme yöntemini değiştirdi">
                            kapıda değişti
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={o.durum}
                          disabled={updatingId === o.id || o.durum === 'iptal'}
                          onChange={(e) => changeStatus(o, e.target.value as OrderStatus)}
                          className={`rounded-full border-0 px-2 py-1 text-xs font-semibold ${DURUM_META[o.durum].className}`}>
                          {DURUM_SIRASI.map((d) => (
                            <option key={d} value={d}>
                              {DURUM_META[d].label}
                            </option>
                          ))}
                        </select>
                        {(kuryeler.length > 0 || o.kurye_id) && (
                          <select
                            value={o.kurye_id ?? ''}
                            disabled={
                              updatingId === o.id || o.durum === 'iptal' || o.durum === 'kapinda' || !!o.mutabakat_id
                            }
                            onChange={(e) => kuryeAta(o, e.target.value)}
                            title="Kurye"
                            className="mt-1 block max-w-[9rem] rounded-lg border border-gray-200 px-1 py-0.5 text-xs text-gray-600">
                            <option value="">Kurye yok</option>
                            {kuryeler
                              .filter((k) => k.aktif || k.id === o.kurye_id)
                              .map((k) => (
                                <option key={k.id} value={k.id}>
                                  🛵 {k.ad}
                                </option>
                              ))}
                          </select>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        {o.toplandi_at ? (
                          <span className="mr-3 text-xs font-semibold text-emerald-700">✓ Toplandı</span>
                        ) : (
                          (o.durum === 'alindi' || o.durum === 'hazirlaniyor') && (
                            <Link
                              href={`/orders/${o.id}/hazirla`}
                              className="mr-3 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
                              Hazırla
                            </Link>
                          )
                        )}
                        <button onClick={() => toggleExpanded(o.id)} className="text-emerald-700 hover:underline">
                          {isOpen ? 'Gizle' : 'Ürünler'}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={8} className="bg-gray-50 px-4 py-3">
                          {o.teslimat_adresi && (
                            <div className="mb-3 flex items-start gap-2 text-sm text-gray-600">
                              <span className="font-semibold text-gray-700">Teslimat Adresi:</span>
                              <span>{o.teslimat_adresi}</span>
                            </div>
                          )}
                          <div className="flex flex-col gap-2">
                            {o.order_items.map((it) => (
                              <div key={it.id} className="flex items-center gap-3 text-sm">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={it.gorsel_url} alt="" className="h-8 w-8 rounded object-cover" />
                                <span className="flex-1 text-gray-800">{it.ad}</span>
                                <span className="text-gray-500">x{it.miktar}</span>
                                <span className="w-20 text-right text-gray-600">
                                  {Number(it.fiyat).toFixed(2)} TL
                                </span>
                              </div>
                            ))}
                            {o.order_items.length === 0 && (
                              <span className="text-gray-400">Ürün bulunamadı.</span>
                            )}
                          </div>
                          <div className="mt-3 flex justify-end gap-6 border-t border-gray-200 pt-2 text-sm text-gray-600">
                            <span>Ara toplam: {Number(o.ara_toplam).toFixed(2)} TL</span>
                            <span>Teslimat: {Number(o.teslimat_ucreti).toFixed(2)} TL</span>
                            {Number(o.indirim_tutari) > 0 && (
                              <span className="text-amber-700">İndirim: −{Number(o.indirim_tutari).toFixed(2)} TL</span>
                            )}
                            <span className="font-semibold text-gray-800">Toplam: {Number(o.toplam).toFixed(2)} TL</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                    Sipariş bulunamadı.
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
