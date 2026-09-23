import type { OrderStatus } from '@/context/cart-context';

export const DURUM_META: Record<OrderStatus, { label: string; bg: string; color: string }> = {
  alindi: { label: 'Sipariş Alındı', bg: '#e0edff', color: '#2563eb' },
  hazirlaniyor: { label: 'Hazırlanıyor', bg: '#fff3e0', color: '#e67e22' },
  yolda: { label: 'Yolda', bg: '#fdf2ff', color: '#a21caf' },
  kapinda: { label: 'Kapında', bg: '#eefdf3', color: '#10995a' },
  iptal: { label: 'İptal Edildi', bg: '#f1f5f9', color: '#64748b' },
};

export const tarihSaat = (iso: string) =>
  new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
