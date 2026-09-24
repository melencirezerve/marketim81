-- YAYIN ÖNCESİ TEST VERİSİ TEMİZLİĞİ — migration değildir, bir kez çalıştırılır.
-- Supabase SQL Editor'de çalıştırın. Silinen veri GERİ GELMEZ.
--
-- Silinenler:
--   * TÜM siparişler; kalemleri, durum geçmişi, sipariş maliyet/gider kayıtları
--     ve kampanya parmak izleri de (cascade) gider. Böylece "ilk sipariş"
--     kampanyası herkes için sıfırlanır.
--   * Kurye mutabakatları ve kuryeler
--   * Fire/zayi kayıtları, genel giderler, mal kabul geçmişi
--
-- Dokunulmayanlar: ürünler, kategoriler, STOK adetleri (sayımla düzeltilecek),
-- ürün alış maliyetleri (urun_maliyetleri), kampanyalar, ayarlar, hesaplar,
-- profiller ve adresler.

begin;

delete from public.orders;               -- order_items, order_status_history, siparis_giderleri,
                                         -- siparis_kalem_maliyetleri, siparis_parmak_izleri cascade
delete from public.kurye_mutabakatlari;
delete from public.kuryeler;

truncate public.fire_kayitlari, public.genel_giderler, public.mal_kabul_kayitlari,
         public.order_status_history
  restart identity;

commit;

-- Kontrol: hepsi 0 olmalı.
select 'orders' as tablo, count(*) as kalan from public.orders
union all select 'order_items',               count(*) from public.order_items
union all select 'order_status_history',      count(*) from public.order_status_history
union all select 'siparis_giderleri',         count(*) from public.siparis_giderleri
union all select 'siparis_kalem_maliyetleri', count(*) from public.siparis_kalem_maliyetleri
union all select 'siparis_parmak_izleri',     count(*) from public.siparis_parmak_izleri
union all select 'kurye_mutabakatlari',       count(*) from public.kurye_mutabakatlari
union all select 'kuryeler',                  count(*) from public.kuryeler
union all select 'fire_kayitlari',            count(*) from public.fire_kayitlari
union all select 'genel_giderler',            count(*) from public.genel_giderler
union all select 'mal_kabul_kayitlari',       count(*) from public.mal_kabul_kayitlari;
