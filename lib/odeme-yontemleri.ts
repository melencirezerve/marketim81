import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

// Online kart tahsilatı henüz yok; yalnızca kapıda ödeme seçenekleri
// (bkz. supabase/migration-005-payment-method.sql).
export type OdemeYontemi = 'kapida_nakit' | 'kapida_kart';

export const ODEME_YONTEMLERI: {
  id: OdemeYontemi;
  label: string;
  aciklama: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}[] = [
  {
    id: 'kapida_nakit',
    label: 'Kapıda Nakit',
    aciklama: 'Siparişinizi teslim alırken nakit ödeyin.',
    icon: 'cash-outline',
  },
  {
    id: 'kapida_kart',
    label: 'Kapıda Kart',
    aciklama: 'Kuryenin POS cihazıyla kredi/banka kartı ile ödeyin.',
    icon: 'card-outline',
  },
];

export const odemeYontemiLabel = (id: OdemeYontemi) =>
  ODEME_YONTEMLERI.find((o) => o.id === id)?.label ?? id;
