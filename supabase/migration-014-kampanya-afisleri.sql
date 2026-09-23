-- Bu migration'ı Supabase SQL Editor'de çalıştırın.
-- Ana sayfa afişleri artık uygulamaya gömülü sabit resimler değil, kampanyaya
-- bağlı: afişi olan kampanya aktif ve tarih aralığındayken gösterilir, kampanya
-- bitince/pasifleşince afiş de kalkar. Görseller catalog-images/banners/ altına
-- admin panelden yüklenir (storage yazma yetkisi yalnızca admin'de, migration-008).

alter table public.kampanyalar add column afis_url text;
alter table public.kampanyalar add column afis_sira integer not null default 0;  -- küçük önce
