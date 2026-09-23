-- Bu migration'ı Supabase SQL Editor'de çalıştırın.
-- Sipariş için ödeme yöntemi seçimi. Online kart tahsilatı (iyzico/PayTR
-- vb.) henüz yok; kart bilgisi de uygulamada/veritabanında SAKLANMAZ
-- (PCI-DSS). Bu yüzden şimdilik yalnızca kapıda ödeme seçenekleri var:
--   kapida_nakit : kapıda nakit
--   kapida_kart  : kapıda kredi/banka kartı (kuryede POS)

alter table public.orders
  add column odeme_yontemi text not null default 'kapida_nakit'
  check (odeme_yontemi in ('kapida_nakit', 'kapida_kart'));

-- Müşterinin "Ödeme Yöntemlerim" ekranında seçtiği varsayılan; sepette
-- ön-seçili gelir, sipariş anında yine değiştirilebilir.
alter table public.profiles
  add column tercih_odeme_yontemi text not null default 'kapida_nakit'
  check (tercih_odeme_yontemi in ('kapida_nakit', 'kapida_kart'));

-- GÜVENLİK DÜZELTMESİ: migration-003'teki profiles_update_own policy'si
-- satır bazlı olduğu için bir müşteri kendi satırındaki role kolonunu da
-- 'admin' yapabiliyordu. Müşterinin güncelleyebileceği kolonları kısıtlıyoruz.
revoke update on public.profiles from authenticated;
grant update (ad, telefon, tercih_odeme_yontemi) on public.profiles to authenticated;
