'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { tl } from '@/lib/karlilik';
import { supabase } from '@/lib/supabase';

type Gider = { id: number; tarih: string; kategori: string; aciklama: string; tutar: number };

const KATEGORILER = [
  'Kira',
  'Maaş / SGK',
  'Elektrik / Su / Doğalgaz',
  'Kurye (sabit)',
  'Yakıt / Araç',
  'Yazılım / Altyapı',
  'Reklam',
  'Muhasebe',
  'Diğer',
];

const bugun = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// "2026-09" → ["2026-09-01", "2026-10-01")
function ayAraligi(ay: string): [string, string] {
  const [y, m] = ay.split('-').map(Number);
  const sonraki = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  return [`${ay}-01`, `${sonraki}-01`];
}

export default function ExpensesPage() {
  const [ay, setAy] = useState(() => bugun().slice(0, 7));
  const [giderler, setGiderler] = useState<Gider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tarih, setTarih] = useState(bugun);
  const [kategori, setKategori] = useState(KATEGORILER[0]);
  const [aciklama, setAciklama] = useState('');
  const [tutar, setTutar] = useState('');
  const [saving, setSaving] = useState(false);

  const yukle = async (secilenAy: string) => {
    const [bas, bit] = ayAraligi(secilenAy);
    const { data, error: fetchError } = await supabase
      .from('genel_giderler')
      .select('*')
      .gte('tarih', bas)
      .lt('tarih', bit)
      .order('tarih', { ascending: false });
    if (fetchError) setError(fetchError.message);
    else setGiderler(((data as Gider[]) ?? []).map((g) => ({ ...g, tutar: Number(g.tutar) })));
    setLoading(false);
  };

  useEffect(() => {
    // yukle() setState'i await'ten sonra çağırıyor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    yukle(ay);
  }, [ay]);

  const ekle = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase
      .from('genel_giderler')
      .insert({ tarih, kategori, aciklama: aciklama.trim(), tutar: Number(tutar) });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setAciklama('');
    setTutar('');
    if (tarih.slice(0, 7) !== ay) setAy(tarih.slice(0, 7));
    else yukle(ay);
  };

  const sil = async (g: Gider) => {
    if (!window.confirm(`${g.kategori} · ${tl(g.tutar)} gideri silinsin mi?`)) return;
    const { error: deleteError } = await supabase.from('genel_giderler').delete().eq('id', g.id);
    if (deleteError) setError(deleteError.message);
    else setGiderler((prev) => prev.filter((x) => x.id !== g.id));
  };

  const toplam = giderler.reduce((t, g) => t + g.tutar, 0);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Genel Giderler</h1>
      <p className="mb-6 text-sm text-gray-500">
        Kira, maaş, faturalar gibi siparişe bağlı olmayan giderler. Tutarları <b>KDV hariç</b> girin. Kârlılık raporunda
        net kârdan düşülür.
      </p>

      <form onSubmit={ekle} className="mb-8 grid max-w-3xl grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-5">
        <input
          type="date"
          value={tarih}
          onChange={(e) => setTarih(e.target.value)}
          required
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={kategori}
          onChange={(e) => setKategori(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          {KATEGORILER.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <input
          value={aciklama}
          onChange={(e) => setAciklama(e.target.value)}
          placeholder="Açıklama (ops.)"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="number"
          step="0.01"
          min="0"
          value={tutar}
          onChange={(e) => setTutar(e.target.value)}
          placeholder="Tutar (KDV hariç)"
          required
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
          {saving ? 'Ekleniyor...' : 'Gider Ekle'}
        </button>
      </form>

      <div className="mb-3 flex items-center gap-3">
        <input
          type="month"
          value={ay}
          onChange={(e) => {
            setLoading(true);
            setAy(e.target.value);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <span className="text-sm text-gray-600">
          Toplam: <b className="text-gray-900">{tl(toplam)}</b>
        </span>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-500">Yükleniyor...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Tarih</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Kategori</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Açıklama</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-600">Tutar</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {giderler.map((g) => (
                <tr key={g.id}>
                  <td className="px-4 py-2 text-gray-600">{new Date(g.tarih + 'T00:00:00').toLocaleDateString('tr-TR')}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{g.kategori}</td>
                  <td className="px-4 py-2 text-gray-600">{g.aciklama || '-'}</td>
                  <td className="px-4 py-2 text-right font-semibold text-gray-900">{tl(g.tutar)}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => sil(g)} className="text-red-600 hover:underline">
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {giderler.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    Bu ay gider girilmemiş.
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
