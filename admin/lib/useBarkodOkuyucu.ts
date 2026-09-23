'use client';

import { useEffect, useRef } from 'react';

// USB/Bluetooth barkod okuyucular klavye gibi davranır: kodu çok hızlı yazıp
// Enter'a basar. Odak bir input'ta değilken bu hızlı tuş dizisini yakalar.
// (Odak bir input'taysa okuyucu oraya yazar; o input kendi Enter'ını işler.)
const TUSLAR_ARASI_MAKS_MS = 60;
const MIN_UZUNLUK = 4;

export function useBarkodOkuyucu(onScan: (kod: string) => void) {
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    let tampon = '';
    let sonTus = 0;
    const handler = (e: KeyboardEvent) => {
      const hedef = e.target as HTMLElement | null;
      if (hedef && (hedef.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(hedef.tagName))) return;

      const simdi = performance.now();
      if (simdi - sonTus > TUSLAR_ARASI_MAKS_MS) tampon = '';
      sonTus = simdi;

      if (e.key === 'Enter') {
        if (tampon.length >= MIN_UZUNLUK) {
          e.preventDefault();
          onScanRef.current(tampon);
        }
        tampon = '';
      } else if (e.key.length === 1) {
        tampon += e.key;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
