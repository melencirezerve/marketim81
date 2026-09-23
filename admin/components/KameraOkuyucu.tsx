'use client';

import { useEffect, useRef, useState } from 'react';

// Telefon/tablet kamerasıyla sürekli barkod okuma. Kamera erişimi yalnızca
// HTTPS'te (Vercel) veya localhost'ta çalışır.
const AYNI_KOD_BEKLEME_MS = 1500;

export function KameraOkuyucu({ onScan, onClose }: { onScan: (kod: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    let durdur: (() => void) | undefined;
    let iptal = false;
    let sonKod = '';
    let sonZaman = 0;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (iptal || !videoRef.current) return;
        const okuyucu = new BrowserMultiFormatReader();
        const kontrol = await okuyucu.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current,
          (sonuc) => {
            if (!sonuc) return;
            const kod = sonuc.getText();
            const simdi = Date.now();
            // Kamera aynı barkodu saniyede defalarca okur; tek okuma say.
            if (kod === sonKod && simdi - sonZaman < AYNI_KOD_BEKLEME_MS) return;
            sonKod = kod;
            sonZaman = simdi;
            onScanRef.current(kod);
          }
        );
        if (iptal) kontrol.stop();
        else durdur = () => kontrol.stop();
      } catch (e) {
        setHata(
          e instanceof Error && e.name === 'NotAllowedError'
            ? 'Kamera izni verilmedi. Tarayıcı ayarlarından kamera iznini açın.'
            : 'Kamera açılamadı. Cihazda kamera olduğundan ve sayfanın HTTPS üzerinden açıldığından emin olun.'
        );
      }
    })();

    return () => {
      iptal = true;
      durdur?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-black">
        <video ref={videoRef} className="aspect-[3/4] w-full object-cover" muted playsInline />
      </div>
      {hata ? (
        <p className="mt-3 max-w-md text-center text-sm text-red-300">{hata}</p>
      ) : (
        <p className="mt-3 text-center text-sm text-white/80">Barkodu kameraya tutun. Okunan her ürün eklenir.</p>
      )}
      <button
        onClick={onClose}
        className="mt-4 rounded-lg bg-white px-6 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100">
        Kapat
      </button>
    </div>
  );
}
