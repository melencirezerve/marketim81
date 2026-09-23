// Fiyatlar KDV dahil, alış maliyeti KDV hariç tutuluyor; kâr KDV hariç hesaplanır.
export const KDV_ORANLARI = [0, 1, 10, 20];

export const kdvHaric = (kdvDahil: number, kdvOrani: number) => kdvDahil / (1 + kdvOrani / 100);

// Birim başına brüt kâr ve marj (satışın KDV hariç tutarına göre).
export function birimKar(satisKdvDahil: number, kdvOrani: number | null, alis: number | null) {
  if (kdvOrani == null || alis == null) return null;
  const net = kdvHaric(satisKdvDahil, kdvOrani);
  const kar = net - alis;
  return { net, kar, marj: net > 0 ? (kar / net) * 100 : 0 };
}

export const tl = (n: number) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
