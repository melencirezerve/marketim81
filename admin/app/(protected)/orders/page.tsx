'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { OrderStatus, OrderWithItems } from '@/lib/types';

const DURUM_META: Record<OrderStatus, { label: string; className: string }> = {
  alindi: { label: 'Sipariş Alındı', className: 'bg-blue-100 text-blue-700' },
  hazirlaniyor: { label: 'Hazırlanıyor', className: 'bg-amber-100 text-amber-700' },
  yolda: { label: 'Yolda', className: 'bg-purple-100 text-purple-700' },
  kapinda: { label: 'Kapında', className: 'bg-emerald-100 text-emerald-700' },
};

const DURUM_SIRASI: OrderStatus[] = ['alindi', 'hazirlaniyor', 'yolda', 'kapinda'];

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });
    if (fetchError) setError(fetchError.message);
    else setOrders((data as OrderWithItems[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    // load() only sets state after its internal await, but the linter can't see through
    // the indirection — safe here since deps are empty (mount-only fetch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

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
    setUpdatingId(order.id);
    const { error: updateError } = await supabase.from('orders').update({ durum }).eq('id', order.id);
    if (updateError) setError(updateError.message);
    else setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, durum } : o)));
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
                    <tr>
                      <td className="px-4 py-2 font-medium text-gray-900">{o.id}</td>
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
                      <td className="px-4 py-2">
                        <select
                          value={o.durum}
                          disabled={updatingId === o.id}
                          onChange={(e) => changeStatus(o, e.target.value as OrderStatus)}
                          className={`rounded-full border-0 px-2 py-1 text-xs font-semibold ${DURUM_META[o.durum].className}`}>
                          {DURUM_SIRASI.map((d) => (
                            <option key={d} value={d}>
                              {DURUM_META[d].label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => toggleExpanded(o.id)} className="text-emerald-700 hover:underline">
                          {isOpen ? 'Gizle' : 'Ürünler'}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={7} className="bg-gray-50 px-4 py-3">
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
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
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
