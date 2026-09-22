-- Bu migration'ı Supabase SQL Editor'de çalıştırın.
-- Admin panelde "sipariş vereni" tam görebilmek için (ad+telefon zaten
-- migration-003'te eklenmişti) e-posta snapshot'ı da ekleniyor.

alter table public.orders add column musteri_email text;
