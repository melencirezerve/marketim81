'use client';

import { useState, type FormEvent } from 'react';
import { KameraOkuyucu } from './KameraOkuyucu';
import { useBarkodOkuyucu } from '@/lib/useBarkodOkuyucu';

// Okuyucu (klavye gibi yazar + Enter), elle yazma ve kamera için tek giriş noktası.
// Odak başka yerdeyken yapılan okutmalar da useBarkodOkuyucu ile yakalanır.
export function BarkodGiris({
  onScan,
  placeholder = 'Barkodu okutun veya yazıp Enter’a basın',
}: {
  onScan: (kod: string) => void;
  placeholder?: string;
}) {
  const [deger, setDeger] = useState('');
  const [kameraAcik, setKameraAcik] = useState(false);

  useBarkodOkuyucu(onScan);

  const gonder = (e: FormEvent) => {
    e.preventDefault();
    const kod = deger.trim();
    if (!kod) return;
    onScan(kod);
    setDeger('');
  };

  return (
    <>
      <form onSubmit={gonder} className="flex gap-2">
        <input
          value={deger}
          onChange={(e) => setDeger(e.target.value)}
          placeholder={placeholder}
          inputMode="numeric"
          autoFocus
          className="flex-1 rounded-lg border-2 border-emerald-500 px-3 py-2 text-base tracking-wider"
        />
        <button
          type="button"
          onClick={() => setKameraAcik(true)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          📷 Kamera
        </button>
      </form>
      {kameraAcik && <KameraOkuyucu onScan={onScan} onClose={() => setKameraAcik(false)} />}
    </>
  );
}
