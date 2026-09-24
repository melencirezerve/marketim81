'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { tl } from '@/lib/karlilik';
import { yeniSiparisSesi } from '@/lib/ses';
import { supabase } from '@/lib/supabase';
import type { OdemeYontemi, OrderStatus } from '@/lib/types';

// Kuryenin telefon tarayıcısında açtığı ekran. Giriş, mobil uygulamadaki gibi
// telefon + SMS kodu; numara admin panelde Kuryeler sayfasından eklenmiş olmalı.

type KuryeSiparisi = {
  id: string;
  durum: OrderStatus;
  musteri_adi: string | null;
  musteri_telefon: string | null;
  teslimat_adresi: string | null;
  odeme_yontemi: OdemeYontemi;
  odeme_kapida_degisti: boolean;
  toplam: number;
  toplandi_at: string | null;
  kurye_id: string | null;
  created_at: string;
  yola_cikti_at: string | null;
  teslim_edildi_at: string | null;
  order_items: { ad: string; miktar: number }[];
};

type SonMutabakat = { created_at: string; teslim_edilen_nakit: number; fark: number };

const SORGU =
  'id, durum, musteri_adi, musteri_telefon, teslimat_adresi, odeme_yontemi, odeme_kapida_degisti, toplam, toplandi_at, kurye_id, created_at, yola_cikti_at, teslim_edildi_at, order_items(ad, miktar)';

const ODEME_LABEL: Record<OdemeYontemi, string> = { kapida_nakit: 'Nakit', kapida_kart: 'Kart' };

// "0532 123 45 67", "532 123 4567", "+90 532..." → "+905321234567"
function telefonNormalize(girdi: string): string | null {
  let rakam = girdi.replace(/\D/g, '');
  if (rakam.startsWith('90')) rakam = rakam.slice(2);
  if (rakam.startsWith('0')) rakam = rakam.slice(1);
  return /^5\d{9}$/.test(rakam) ? `+90${rakam}` : null;
}

const saat = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';

const haritaLinki = (adres: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adres)}`;

type Sekme = 'benim' | 'havuz' | 'kasa';

export default function KuryePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionYuklendi, setSessionYuklendi] = useState(false);
  const [kurye, setKurye] = useState<{ id: string; ad: string } | null>(null);
  const [kuryeHatasi, setKuryeHatasi] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionYuklendi(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    supabase.rpc('kurye_girisi').then(({ data, error }) => {
      if (error) {
        setKurye(null);
        setKuryeHatasi(error.message);
      } else {
        setKuryeHatasi(null);
        setKurye(data as { id: string; ad: string });
      }
    });
  }, [userId]);

  const cikis = async () => {
    await supabase.auth.signOut();
    setKurye(null);
    setKuryeHatasi(null);
  };

  if (!sessionYuklendi) return null;
  if (!session) return <GirisEkrani />;
  if (kuryeHatasi) {
    return (
      <Kabuk>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <p className="mb-4 font-semibold">{kuryeHatasi}</p>
          <button onClick={cikis} className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white">
            Çıkış Yap
          </button>
        </div>
      </Kabuk>
    );
  }
  if (!kurye) return <Kabuk><p className="text-sm text-gray-500">Yükleniyor...</p></Kabuk>;
  return <KuryeEkrani kurye={kurye} onCikis={cikis} />;
}

function Kabuk({ children, sag }: { children: React.ReactNode; sag?: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-emerald-600 px-4 py-3 text-white shadow">
        <span className="text-lg font-extrabold">Marketim81 Kurye</span>
        {sag}
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}

function GirisEkrani() {
  const [telefon, setTelefon] = useState('');
  const [kod, setKod] = useState('');
  const [adim, setAdim] = useState<'telefon' | 'kod'>('telefon');
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const kodGonder = async (e: FormEvent) => {
    e.preventDefault();
    const tel = telefonNormalize(telefon);
    if (!tel) {
      setHata('Geçerli bir cep telefonu numarası girin.');
      return;
    }
    setYukleniyor(true);
    setHata(null);
    const { error } = await supabase.auth.signInWithOtp({ phone: tel });
    setYukleniyor(false);
    if (error) setHata(error.message);
    else setAdim('kod');
  };

  const dogrula = async (e: FormEvent) => {
    e.preventDefault();
    setYukleniyor(true);
    setHata(null);
    const { error } = await supabase.auth.verifyOtp({ phone: telefonNormalize(telefon)!, token: kod, type: 'sms' });
    setYukleniyor(false);
    if (error) setHata('Kod hatalı ya da süresi doldu.');
  };

  return (
    <Kabuk>
      <form
        onSubmit={adim === 'telefon' ? kodGonder : dogrula}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-gray-900">Kurye Girişi</h1>
        <p className="mb-5 text-sm text-gray-500">
          {adim === 'telefon' ? 'Telefon numaranıza SMS kodu gönderilecek.' : `${telefon} numarasına gelen kodu girin.`}
        </p>
        {adim === 'telefon' ? (
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="05xx xxx xx xx"
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-3 text-lg"
          />
        ) : (
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={kod}
            onChange={(e) => setKod(e.target.value.replace(/\D/g, ''))}
            className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-3 text-center text-2xl tracking-widest"
          />
        )}
        {hata && <p className="mb-4 text-sm text-red-600">{hata}</p>}
        <button
          type="submit"
          disabled={yukleniyor || (adim === 'kod' && kod.length < 6)}
          className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50">
          {yukleniyor ? 'Lütfen bekleyin...' : adim === 'telefon' ? 'Kod Gönder' : 'Giriş Yap'}
        </button>
        {adim === 'kod' && (
          <button
            type="button"
            onClick={() => {
              setAdim('telefon');
              setKod('');
            }}
            className="mt-3 w-full text-sm text-gray-500">
            Numarayı değiştir
          </button>
        )}
      </form>
    </Kabuk>
  );
}

function KuryeEkrani({ kurye, onCikis }: { kurye: { id: string; ad: string }; onCikis: () => void }) {
  const [siparisler, setSiparisler] = useState<KuryeSiparisi[]>([]);
  const [sonMutabakat, setSonMutabakat] = useState<SonMutabakat | null>(null);
  const [sekme, setSekme] = useState<Sekme>('benim');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [islemdeki, setIslemdeki] = useState<string | null>(null);
  const [teslimSecimi, setTeslimSecimi] = useState<string | null>(null);
  const [acikKalemler, setAcikKalemler] = useState<Set<string>>(new Set());
  const [yeniler, setYeniler] = useState<string[]>([]);
  const [iptaller, setIptaller] = useState<string[]>([]);
  const gorulenler = useRef<Set<string> | null>(null);

  const yukle = useCallback(async () => {
    const [{ data, error }, { data: m }] = await Promise.all([
      supabase
        .from('orders')
        .select(SORGU)
        .is('mutabakat_id', null)
        .neq('durum', 'iptal')
        .order('created_at', { ascending: true }),
      supabase
        .from('kurye_mutabakatlari')
        .select('created_at, teslim_edilen_nakit, fark')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (error) {
      setHata(error.message);
      setYukleniyor(false);
      return;
    }
    const liste = ((data as KuryeSiparisi[]) ?? []).map((o) => ({ ...o, toplam: Number(o.toplam) }));
    // Yeni gelen (havuza düşen ya da bana atanan) siparişlerde sesli uyarı.
    const aktifIdler = liste.filter((o) => o.durum !== 'kapinda').map((o) => o.id);
    if (gorulenler.current) {
      const yeni = aktifIdler.filter((id) => !gorulenler.current!.has(id));
      if (yeni.length > 0) {
        setYeniler((prev) => [...prev, ...yeni.filter((id) => !prev.includes(id))]);
        yeniSiparisSesi();
      }
    }
    gorulenler.current = new Set([...(gorulenler.current ?? []), ...aktifIdler]);
    setSiparisler(liste);
    setSonMutabakat(m as SonMutabakat | null);
    setHata(null);
    setYukleniyor(false);
  }, []);

  useEffect(() => {
    // yukle() setState'i await'ten sonra çağırıyor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    yukle();

    let zamanlayici: ReturnType<typeof setTimeout> | undefined;
    const gecikmeliYukle = () => {
      clearTimeout(zamanlayici);
      zamanlayici = setTimeout(yukle, 300);
    };
    const kanal = supabase
      .channel(`kurye-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        const yeni = payload.new as { id?: string; durum?: string; kurye_id?: string | null };
        if (yeni?.durum === 'iptal' && yeni.kurye_id === kurye.id && yeni.id) {
          const id = yeni.id;
          setIptaller((prev) => (prev.includes(id) ? prev : [...prev, id]));
          yeniSiparisSesi();
        }
        gecikmeliYukle();
      })
      .subscribe();

    // Başka kurye havuzdan aldığında bize olay gelmiyor (RLS); ara ara ve ekrana dönünce tazele.
    const aralik = setInterval(yukle, 30000);
    const gorunurluk = () => {
      if (document.visibilityState === 'visible') yukle();
    };
    document.addEventListener('visibilitychange', gorunurluk);

    return () => {
      clearTimeout(zamanlayici);
      clearInterval(aralik);
      document.removeEventListener('visibilitychange', gorunurluk);
      supabase.removeChannel(kanal);
    };
  }, [yukle, kurye.id]);

  const benimAktif = useMemo(
    () =>
      siparisler
        .filter((o) => o.kurye_id === kurye.id && o.durum !== 'kapinda')
        .sort((a, b) => Number(b.durum === 'yolda') - Number(a.durum === 'yolda')),
    [siparisler, kurye.id]
  );
  const havuz = useMemo(() => siparisler.filter((o) => o.kurye_id === null), [siparisler]);
  const teslimEdilenler = useMemo(
    () => siparisler.filter((o) => o.kurye_id === kurye.id && o.durum === 'kapinda'),
    [siparisler, kurye.id]
  );
  const nakit = teslimEdilenler.filter((o) => o.odeme_yontemi === 'kapida_nakit').reduce((t, o) => t + o.toplam, 0);
  const kart = teslimEdilenler.filter((o) => o.odeme_yontemi === 'kapida_kart').reduce((t, o) => t + o.toplam, 0);

  const islem = async (id: string, fn: string, args: Record<string, unknown> = {}) => {
    setIslemdeki(id);
    setHata(null);
    const { error } = await supabase.rpc(fn, { p_order_id: id, ...args });
    if (error) setHata(error.message);
    setYeniler((prev) => prev.filter((x) => x !== id));
    setTeslimSecimi(null);
    await yukle();
    setIslemdeki(null);
  };

  const yolaCik = (o: KuryeSiparisi) => {
    if (!o.toplandi_at && !window.confirm(`${o.id} henüz "toplandı" olarak işaretlenmedi. Yine de yola çıkılsın mı?`)) {
      return;
    }
    islem(o.id, 'kurye_yola_cik');
  };

  const teslimEt = (o: KuryeSiparisi, yontem: OdemeYontemi) => {
    if (
      yontem !== o.odeme_yontemi &&
      !window.confirm(
        `Müşteri siparişte "${ODEME_LABEL[o.odeme_yontemi]}" seçmişti. Ödeme "${ODEME_LABEL[yontem]}" olarak kaydedilsin mi?`
      )
    ) {
      return;
    }
    islem(o.id, 'kurye_teslim_et', { p_odeme_yontemi: yontem });
  };

  const kalemleriAc = (id: string) =>
    setAcikKalemler((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const kart_ = (o: KuryeSiparisi, mod: Sekme) => {
    const adet = o.order_items.reduce((t, k) => t + k.miktar, 0);
    const mesgul = islemdeki === o.id;
    return (
      <div
        key={o.id}
        className={`rounded-2xl border bg-white p-4 shadow-sm ${
          yeniler.includes(o.id) ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-gray-200'
        }`}>
        <div className="mb-2 flex items-center justify-between">
          <span className="font-bold text-gray-900">{o.id}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              o.durum === 'yolda'
                ? 'bg-purple-100 text-purple-700'
                : o.durum === 'kapinda'
                  ? 'bg-emerald-100 text-emerald-700'
                  : o.toplandi_at
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
            }`}>
            {o.durum === 'yolda'
              ? `Yolda · ${saat(o.yola_cikti_at)}`
              : o.durum === 'kapinda'
                ? `Teslim · ${saat(o.teslim_edildi_at)}`
                : o.toplandi_at
                  ? 'Paket hazır'
                  : o.durum === 'hazirlaniyor'
                    ? 'Hazırlanıyor'
                    : 'Yeni sipariş'}
          </span>
        </div>

        <div className="text-sm text-gray-800">{o.musteri_adi || 'Müşteri'}</div>
        {o.teslimat_adresi && <div className="mt-0.5 text-sm text-gray-600">{o.teslimat_adresi}</div>}
        <div className="mt-1 text-xs text-gray-400">Sipariş: {saat(o.created_at)}</div>

        <div
          className={`mt-3 rounded-xl px-3 py-2 text-center text-base font-bold ${
            o.odeme_yontemi === 'kapida_nakit' ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'
          }`}>
          {o.odeme_yontemi === 'kapida_nakit' ? '💵 Nakit al: ' : '💳 Kartla çek: '}
          {tl(o.toplam)}
          {o.odeme_kapida_degisti && <span className="ml-1 text-xs font-normal">(kapıda değişti)</span>}
        </div>

        <button onClick={() => kalemleriAc(o.id)} className="mt-2 text-sm text-emerald-700">
          {adet} ürün {acikKalemler.has(o.id) ? '▲' : '▼'}
        </button>
        {acikKalemler.has(o.id) && (
          <ul className="mt-1 space-y-0.5 text-sm text-gray-600">
            {o.order_items.map((k, i) => (
              <li key={i}>
                {k.miktar} × {k.ad}
              </li>
            ))}
          </ul>
        )}

        {mod !== 'kasa' && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {o.musteri_telefon && (
              <a
                href={`tel:${o.musteri_telefon}`}
                className="rounded-lg border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-700">
                📞 Ara
              </a>
            )}
            {o.teslimat_adresi && (
              <a
                href={haritaLinki(o.teslimat_adresi)}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-700">
                🗺️ Harita
              </a>
            )}
          </div>
        )}

        {mod === 'havuz' && (
          <button
            disabled={mesgul}
            onClick={() => islem(o.id, 'kurye_siparis_al')}
            className="mt-3 w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white disabled:opacity-50">
            Siparişi Üstlen
          </button>
        )}

        {mod === 'benim' && o.durum !== 'yolda' && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              disabled={mesgul}
              onClick={() => islem(o.id, 'kurye_siparis_birak')}
              className="rounded-lg border border-gray-300 py-3 text-sm font-semibold text-gray-600 disabled:opacity-50">
              Bırak
            </button>
            <button
              disabled={mesgul}
              onClick={() => yolaCik(o)}
              className="col-span-2 rounded-lg bg-purple-600 py-3 font-semibold text-white disabled:opacity-50">
              Yola Çıktım
            </button>
          </div>
        )}

        {mod === 'benim' && o.durum === 'yolda' && teslimSecimi !== o.id && (
          <button
            disabled={mesgul}
            onClick={() => setTeslimSecimi(o.id)}
            className="mt-3 w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white disabled:opacity-50">
            Teslim Ettim
          </button>
        )}

        {mod === 'benim' && o.durum === 'yolda' && teslimSecimi === o.id && (
          <div className="mt-3 rounded-xl bg-gray-50 p-3">
            <p className="mb-2 text-center text-sm font-semibold text-gray-700">Müşteri nasıl ödedi?</p>
            <div className="grid grid-cols-2 gap-2">
              {(['kapida_nakit', 'kapida_kart'] as OdemeYontemi[]).map((y) => (
                <button
                  key={y}
                  disabled={mesgul}
                  onClick={() => teslimEt(o, y)}
                  className={`rounded-lg py-3 font-semibold disabled:opacity-50 ${
                    y === o.odeme_yontemi ? 'bg-emerald-600 text-white' : 'border border-gray-300 bg-white text-gray-700'
                  }`}>
                  {y === 'kapida_nakit' ? '💵 Nakit' : '💳 Kart'}
                </button>
              ))}
            </div>
            <button onClick={() => setTeslimSecimi(null)} className="mt-2 w-full text-sm text-gray-500">
              Vazgeç
            </button>
          </div>
        )}
      </div>
    );
  };

  const sekmeSinifi = (s: Sekme) =>
    `flex-1 rounded-lg py-2 text-sm font-semibold ${sekme === s ? 'bg-white text-emerald-700 shadow' : 'text-gray-600'}`;

  return (
    <Kabuk
      sag={
        <button onClick={onCikis} className="text-sm font-medium text-emerald-50">
          {kurye.ad} · Çıkış
        </button>
      }>
      <div className="mb-4 rounded-2xl bg-emerald-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Üzerimdeki nakit</div>
        <div className="text-3xl font-extrabold text-emerald-900">{tl(nakit)}</div>
        <div className="mt-1 text-xs text-emerald-700">
          {teslimEdilenler.length} teslimat · kartla {tl(kart)} · kasaya teslim edilmedi
        </div>
      </div>

      {iptaller.length > 0 && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-semibold">⚠️ İptal edildi, teslim etmeyin: {iptaller.join(', ')}</p>
          <button onClick={() => setIptaller([])} className="mt-2 rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white">
            Gördüm
          </button>
        </div>
      )}

      <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1">
        <button className={sekmeSinifi('benim')} onClick={() => setSekme('benim')}>
          Siparişlerim ({benimAktif.length})
        </button>
        <button className={sekmeSinifi('havuz')} onClick={() => setSekme('havuz')}>
          Havuz ({havuz.length})
        </button>
        <button className={sekmeSinifi('kasa')} onClick={() => setSekme('kasa')}>
          Kasa
        </button>
      </div>

      {hata && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{hata}</p>}

      {yukleniyor ? (
        <p className="text-sm text-gray-500">Yükleniyor...</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sekme === 'benim' &&
            (benimAktif.length > 0 ? (
              benimAktif.map((o) => kart_(o, 'benim'))
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">
                Üzerinizde sipariş yok. Havuzdan sipariş üstlenebilirsiniz.
              </p>
            ))}
          {sekme === 'havuz' &&
            (havuz.length > 0 ? (
              havuz.map((o) => kart_(o, 'havuz'))
            ) : (
              <p className="py-8 text-center text-sm text-gray-400">Bekleyen sipariş yok.</p>
            ))}
          {sekme === 'kasa' && (
            <>
              {sonMutabakat && (
                <p className="text-xs text-gray-500">
                  Son kasa teslimi: {new Date(sonMutabakat.created_at).toLocaleString('tr-TR')} ·{' '}
                  {tl(Number(sonMutabakat.teslim_edilen_nakit))}
                  {Number(sonMutabakat.fark) !== 0 && ` (fark ${tl(Number(sonMutabakat.fark))})`}
                </p>
              )}
              {teslimEdilenler.length > 0 ? (
                teslimEdilenler.map((o) => kart_(o, 'kasa'))
              ) : (
                <p className="py-8 text-center text-sm text-gray-400">Kasaya teslim edilecek tahsilat yok.</p>
              )}
            </>
          )}
        </div>
      )}
    </Kabuk>
  );
}
