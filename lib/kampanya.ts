import { tl } from '@/lib/para';

export type KampanyaAfis = {
  id: string;
  ad: string;
  tur: 'yuzde' | 'tutar' | 'ucretsiz_teslimat';
  deger: number | null;
  maxIndirim: number | null;
  minSepet: number;
  sadeceIlkSiparis: boolean;
  baslangic: string | null;
  bitis: string | null;
  afisUrl: string;
};

// Kampanya kurallarının müşteriye gösterilen özeti (afişe dokununca).
export function kampanyaKosullari(k: KampanyaAfis) {
  const satirlar = [
    k.tur === 'yuzde'
      ? `Sepetinize %${k.deger} indirim${k.maxIndirim != null ? ` (en fazla ${tl(k.maxIndirim)})` : ''}.`
      : k.tur === 'tutar'
        ? `Sepetinize ${tl(k.deger ?? 0)} indirim.`
        : 'Teslimat ücretsiz.',
    k.minSepet > 0 ? `${tl(k.minSepet)} ve üzeri siparişlerde geçerlidir.` : null,
    k.sadeceIlkSiparis ? 'Yalnızca ilk siparişinizde geçerlidir.' : null,
    k.bitis
      ? `${new Date(k.bitis).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} tarihine kadar geçerlidir.`
      : null,
    'İndirim sepette otomatik uygulanır. Kampanyalar birleştirilemez; en avantajlı olan uygulanır.',
  ];
  return satirlar.filter(Boolean).join('\n');
}

export const kampanyaSurdeMi = (k: KampanyaAfis, simdi = new Date()) =>
  (!k.baslangic || new Date(k.baslangic) <= simdi) && (!k.bitis || new Date(k.bitis) > simdi);
