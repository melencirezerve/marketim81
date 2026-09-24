'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { tl } from '@/lib/karlilik';
import { supabase } from '@/lib/supabase';
import type { Kurye, KuryeMutabakati, OdemeYontemi, OrderStatus } from '@/lib/types';

type AcikSiparis = {
  id: string;
  durum: OrderStatus;
  kurye_id: string;
  musteri_adi: string | null;
  toplam: number;
  odeme_yontemi: OdemeYontemi;
  odeme_kapida_degisti: boolean;
  teslim_edildi_at: string | null;
  siparis_giderleri: { kurye_ucreti: number } | { kurye_ucreti: number }[] | null;
};

const kuryeUcreti = (o: AcikSiparis) => {
  const g = Array.isArray(o.siparis_giderleri) ? o.siparis_giderleri[0] : o.siparis_giderleri;
  return Number(g?.kurye_ucreti ?? 0);
};

const DURUM_LABEL: Partial<Record<OrderStatus, string>> = {
  alindi: 'Alındı',
  hazirlaniyor: 'Hazırlanıyor',
  yolda: 'Yolda',
};

export default function CouriersPage() {
  const [kuryeler, setKuryeler] = useState<Kurye[]>([]);
  const [acikSiparisler, setAcikSiparisler] = useState<AcikSiparis[]>([]);
  const [gecmis, setGecmis] = useState<KuryeMutabakati[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ad, setAd] = useState('');
  const [telefon, setTelefon] = useState('');
  const [ekleniyor, setEkleniyor] = useState(false);

  const yukle = useCallback(async () => {
    const [k, o, m] = await Promise.all([
      supabase.from('kuryeler').select('*').order('aktif', { ascending: false }).order('ad'),
      supabase
        .from('orders')
        .select(
          'id, durum, kurye_id, musteri_adi, toplam, odeme_yontemi, odeme_kapida_degisti, teslim_edildi_at, siparis_giderleri(kurye_ucreti)'
        )
        .not('kurye_id', 'is', null)
        .is('mutabakat_id', null)
        .neq('durum', 'iptal')
        .order('created_at'),
      supabase.from('kurye_mutabakatlari').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    const hata = k.error ?? o.error ?? m.error;
    if (hata) setError(hata.message);
    else {
      setKuryeler((k.data as Kurye[]) ?? []);
      setAcikSiparisler(((o.data as AcikSiparis[]) ?? []).map((s) => ({ ...s, toplam: Number(s.toplam) })));
      setGecmis((m.data as KuryeMutabakati[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // yukle() setState'i await'ten sonra çağırıyor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    yukle();
    let zamanlayici: ReturnType<typeof setTimeout> | undefined;
    const kanal = supabase
      .channel(`admin-kuryeler-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        clearTimeout(zamanlayici);
        zamanlayici = setTimeout(yukle, 500);
      })
      .subscribe();
    return () => {
      clearTimeout(zamanlayici);
      supabase.removeChannel(kanal);
    };
  }, [yukle]);

  const kuryeEkle = async (e: FormEvent) => {
    e.preventDefault();
    setEkleniyor(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc('kurye_ekle', { p_telefon: telefon, p_ad: ad });
    if (rpcError) setError(rpcError.message);
    else {
      setAd('');
      setTelefon('');
      await yukle();
    }
    setEkleniyor(false);
  };

  const aktiflik = async (k: Kurye) => {
    if (k.aktif && !window.confirm(`${k.ad} pasife alınsın mı? Kurye ekranına artık giremez.`)) return;
    setError(null);
    const { error: rpcError } = await supabase.rpc('kurye_aktiflik', { p_kurye_id: k.id, p_aktif: !k.aktif });
    if (rpcError) setError(rpcError.message);
    await yukle();
  };

  const kuryeAdi = (id: string) => kuryeler.find((k) => k.id === id)?.ad ?? '-';
  const kuryeLinki = typeof window !== 'undefined' ? `${window.location.origin}/kurye` : '/kurye';

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Kuryeler</h1>
      <p className="mb-6 text-sm text-gray-500">
        Kurye ekranı: <span className="font-mono text-gray-800">{kuryeLinki}</span>. Kurye bu adresi telefonunda açıp
        buraya eklediğiniz numarayla SMS koduyla giriş yapar.{' '}
        <button
          onClick={() => navigator.clipboard?.writeText(kuryeLinki)}
          className="font-semibold text-emerald-700 hover:underline">
          Linki kopyala
        </button>
      </p>

      <form onSubmit={kuryeEkle} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Ad Soyad</label>
          <input
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            required
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Cep Telefonu</label>
          <input
            type="tel"
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            placeholder="05xx xxx xx xx"
            required
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={ekleniyor}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
          Kurye Ekle
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Yükleniyor...</p>
      ) : kuryeler.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
          Henüz kurye eklenmedi.
        </p>
      ) : (
        <div className="mb-10 flex flex-col gap-4">
          {kuryeler.map((k) => (
            <KuryeKarti
              key={k.id}
              kurye={k}
              siparisler={acikSiparisler.filter((o) => o.kurye_id === k.id)}
              onAktiflik={() => aktiflik(k)}
              onKapandi={yukle}
            />
          ))}
        </div>
      )}

      <h2 className="mb-3 text-lg font-bold text-gray-900">Mutabakat Geçmişi</h2>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Tarih</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Kurye</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600">Teslimat</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600">Nakit / Kart</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600">Kurye Ücreti</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600">Beklenen</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600">Teslim Edilen</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600">Fark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {gecmis.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-2 text-gray-600">
                  {new Date(m.created_at).toLocaleString('tr-TR')}
                  {m.aciklama && <div className="text-xs text-gray-400">{m.aciklama}</div>}
                </td>
                <td className="px-4 py-2 text-gray-800">{kuryeAdi(m.kurye_id)}</td>
                <td className="px-4 py-2 text-right text-gray-600">{m.siparis_sayisi}</td>
                <td className="px-4 py-2 text-right text-gray-600">
                  {tl(Number(m.nakit_tahsilat))}
                  <div className="text-xs text-gray-400">{tl(Number(m.kart_tahsilat))}</div>
                </td>
                <td className="px-4 py-2 text-right text-gray-600">
                  {tl(Number(m.kurye_ucreti))}
                  {m.ucret_nakitten_alindi && <div className="text-xs text-gray-400">nakitten düşüldü</div>}
                </td>
                <td className="px-4 py-2 text-right text-gray-600">{tl(Number(m.beklenen_nakit))}</td>
                <td className="px-4 py-2 text-right text-gray-800">{tl(Number(m.teslim_edilen_nakit))}</td>
                <td
                  className={`px-4 py-2 text-right font-semibold ${
                    Number(m.fark) < 0 ? 'text-red-600' : Number(m.fark) > 0 ? 'text-amber-600' : 'text-emerald-700'
                  }`}>
                  {Number(m.fark) === 0 ? 'Tam' : tl(Number(m.fark))}
                </td>
              </tr>
            ))}
            {gecmis.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                  Henüz mutabakat yapılmadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KuryeKarti({
  kurye,
  siparisler,
  onAktiflik,
  onKapandi,
}: {
  kurye: Kurye;
  siparisler: AcikSiparis[];
  onAktiflik: () => void;
  onKapandi: () => Promise<void>;
}) {
  const [teslimEdilen, setTeslimEdilen] = useState('');
  const [ucretNakitten, setUcretNakitten] = useState(false);
  const [aciklama, setAciklama] = useState('');
  const [acik, setAcik] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const yoldakiler = siparisler.filter((o) => o.durum !== 'kapinda');
  const teslimler = siparisler.filter((o) => o.durum === 'kapinda');
  const nakit = teslimler.filter((o) => o.odeme_yontemi === 'kapida_nakit').reduce((t, o) => t + o.toplam, 0);
  const kart = teslimler.filter((o) => o.odeme_yontemi === 'kapida_kart').reduce((t, o) => t + o.toplam, 0);
  const ucret = teslimler.reduce((t, o) => t + kuryeUcreti(o), 0);
  const beklenen = nakit - (ucretNakitten ? ucret : 0);
  const girilen = teslimEdilen.trim() === '' ? null : Number(teslimEdilen.replace(',', '.'));
  const fark = girilen == null || Number.isNaN(girilen) ? null : girilen - beklenen;

  const kapat = async (e: FormEvent) => {
    e.preventDefault();
    if (girilen == null || Number.isNaN(girilen) || girilen < 0) {
      setHata('Kuryenin teslim ettiği nakit tutarını girin.');
      return;
    }
    const farkMetni = fark && Math.abs(fark) >= 0.01 ? `\nFark: ${tl(fark)}` : '';
    if (!window.confirm(`${kurye.ad} için ${teslimler.length} teslimatın mutabakatı kapatılsın mı?${farkMetni}`)) return;
    setKaydediliyor(true);
    setHata(null);
    const { error } = await supabase.rpc('kurye_mutabakat_kapat', {
      p_kurye_id: kurye.id,
      p_siparis_idleri: teslimler.map((o) => o.id),
      p_teslim_edilen_nakit: girilen,
      p_ucret_nakitten: ucretNakitten,
      p_aciklama: aciklama.trim(),
    });
    if (error) setHata(error.message);
    else {
      setTeslimEdilen('');
      setAciklama('');
      setAcik(false);
    }
    await onKapandi();
    setKaydediliyor(false);
  };

  return (
    <div className={`rounded-xl border bg-white p-4 ${kurye.aktif ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-bold text-gray-900">{kurye.ad}</span>
          <span className="ml-2 text-sm text-gray-500">{kurye.telefon}</span>
          {!kurye.aktif && (
            <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">Pasif</span>
          )}
          {kurye.aktif && !kurye.user_id && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              Henüz giriş yapmadı
            </span>
          )}
        </div>
        <button onClick={onAktiflik} className="text-sm font-medium text-gray-500 hover:underline">
          {kurye.aktif ? 'Pasife al' : 'Aktif et'}
        </button>
      </div>

      {yoldakiler.length > 0 && (
        <p className="mb-3 text-sm text-gray-600">
          Üzerindeki siparişler:{' '}
          {yoldakiler.map((o) => `${o.id} (${DURUM_LABEL[o.durum] ?? o.durum})`).join(', ')}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Kutu baslik="Mutabakat bekleyen" deger={`${teslimler.length} teslimat`} />
        <Kutu baslik="Tahsil edilen nakit" deger={tl(nakit)} vurgu />
        <Kutu baslik="Kartla (POS'a geçti)" deger={tl(kart)} />
        <Kutu baslik="Kurye ücreti (paket başı)" deger={tl(ucret)} />
      </div>

      {teslimler.length > 0 && (
        <>
          <button onClick={() => setAcik((v) => !v)} className="mt-3 text-sm font-semibold text-emerald-700 hover:underline">
            {acik ? 'Teslimatları gizle' : 'Teslimatları göster'}
          </button>
          {acik && (
            <table className="mt-2 w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {teslimler.map((o) => (
                  <tr key={o.id}>
                    <td className="py-1 text-gray-800">{o.id}</td>
                    <td className="py-1 text-gray-500">{o.musteri_adi}</td>
                    <td className="py-1 text-gray-500">
                      {o.teslim_edildi_at && new Date(o.teslim_edildi_at).toLocaleString('tr-TR')}
                    </td>
                    <td className="py-1 text-gray-600">
                      {o.odeme_yontemi === 'kapida_nakit' ? 'Nakit' : 'Kart'}
                      {o.odeme_kapida_degisti && <span className="ml-1 text-xs text-amber-600">(kapıda değişti)</span>}
                    </td>
                    <td className="py-1 text-right text-gray-800">{tl(o.toplam)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <form onSubmit={kapat} className="mt-4 rounded-lg bg-gray-50 p-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={ucretNakitten} onChange={(e) => setUcretNakitten(e.target.checked)} />
                Kurye ücretini tahsil ettiği nakitten aldı
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <div className="text-xs text-gray-500">Beklenen nakit</div>
                <div className={`text-lg font-bold ${beklenen < 0 ? 'text-amber-700' : 'text-gray-900'}`}>
                  {tl(beklenen)}
                </div>
                {beklenen < 0 && <div className="text-xs text-amber-700">Kuryeye {tl(-beklenen)} ödenecek</div>}
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Kuryenin teslim ettiği nakit</label>
                <input
                  inputMode="decimal"
                  value={teslimEdilen}
                  onChange={(e) => setTeslimEdilen(e.target.value)}
                  placeholder="0,00"
                  className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-gray-500">Açıklama (isteğe bağlı)</label>
                <input
                  value={aciklama}
                  onChange={(e) => setAciklama(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={kaydediliyor}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                Mutabakatı Kapat
              </button>
            </div>
            {fark != null && (
              <p
                className={`mt-2 text-sm font-semibold ${
                  Math.abs(fark) < 0.01 ? 'text-emerald-700' : fark < 0 ? 'text-red-600' : 'text-amber-600'
                }`}>
                {Math.abs(fark) < 0.01 ? '✓ Kasa tutuyor' : fark < 0 ? `Kasa açığı: ${tl(-fark)}` : `Fazla: ${tl(fark)}`}
              </p>
            )}
            {hata && <p className="mt-2 text-sm text-red-600">{hata}</p>}
          </form>
        </>
      )}
    </div>
  );
}

function Kutu({ baslik, deger, vurgu }: { baslik: string; deger: string; vurgu?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${vurgu ? 'bg-emerald-50' : 'bg-gray-50'}`}>
      <div className="text-xs text-gray-500">{baslik}</div>
      <div className={`font-bold ${vurgu ? 'text-emerald-800' : 'text-gray-900'}`}>{deger}</div>
    </div>
  );
}
