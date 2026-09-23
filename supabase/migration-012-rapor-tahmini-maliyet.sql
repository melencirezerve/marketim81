-- Bu migration'ı Supabase SQL Editor'de çalıştırın.
-- Kârlılık raporu: sipariş kalemi ya da fire kaydında dondurulmuş maliyet yoksa
-- (kayıt anında ürünün alış fiyatı henüz girilmemişse) 0 yerine ürünün GÜNCEL
-- alış fiyatı kullanılır ve "tahmini" olarak sayılır. Kayıtlar değişmez;
-- yalnızca raporun hesabı değişir. Maliyeti hiç bilinmeyenler yine 0 + uyarı.

create or replace function public.karlilik_raporu(p_baslangic timestamptz, p_bitis timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $body$
declare
  v_sonuc jsonb;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yetkiniz yok.';
  end if;

  with siparisler as (
    select o.*,
           coalesce(g.kurye_ucreti, 0)                                        as kurye,
           case when o.odeme_yontemi = 'kapida_kart'
                then o.toplam * coalesce(g.pos_komisyon_orani, 0) / 100 else 0 end as pos,
           coalesce(g.ambalaj_maliyeti, 0)                                    as ambalaj
      from public.orders o
      left join public.siparis_giderleri g on g.order_id = o.id
     where o.durum <> 'iptal' and o.created_at >= p_baslangic and o.created_at < p_bitis
  ),
  kalemler as (
    select oi.order_id,
           oi.product_id,
           oi.ad,
           oi.miktar,
           oi.fiyat * oi.miktar                                         as ciro_brut,
           oi.fiyat * oi.miktar / (1 + coalesce(oi.kdv_orani, 0) / 100) as ciro_net,
           coalesce(m.birim_maliyet, um.alis_fiyati, 0) * oi.miktar     as maliyet,
           oi.kdv_orani is null                                         as kdv_eksik,
           m.birim_maliyet is null and um.alis_fiyati is null           as maliyet_eksik,
           m.birim_maliyet is null and um.alis_fiyati is not null       as maliyet_tahmini,
           (s.created_at at time zone 'Europe/Istanbul')::date          as gun
      from public.order_items oi
      join siparisler s on s.id = oi.order_id
      left join public.siparis_kalem_maliyetleri m on m.order_item_id = oi.id
      left join public.urun_maliyetleri um on um.product_id = oi.product_id
  ),
  fireler as (
    select f.sebep, f.miktar,
           coalesce(f.birim_maliyet, um.alis_fiyati)              as birim_maliyet,
           f.birim_maliyet is null and um.alis_fiyati is not null as tahmini
      from public.fire_kayitlari f
      left join public.urun_maliyetleri um on um.product_id = f.product_id
     where f.created_at >= p_baslangic and f.created_at < p_bitis
  ),
  giderler as (
    select * from public.genel_giderler g
     where g.tarih >= (p_baslangic at time zone 'Europe/Istanbul')::date
       and g.tarih <  (p_bitis at time zone 'Europe/Istanbul')::date
  ),
  toplamlar as (
    select
      (select count(*) from siparisler)                                             as siparis_sayisi,
      (select coalesce(sum(ciro_brut), 0) from kalemler)                            as ciro_brut,
      (select coalesce(sum(ciro_net), 0) from kalemler)                             as ciro_net,
      (select coalesce(sum(maliyet), 0) from kalemler)                              as maliyet,
      (select coalesce(sum(teslimat_ucreti), 0) from siparisler)                    as teslimat_brut,
      (select coalesce(sum(teslimat_ucreti / (1 + coalesce(teslimat_kdv_orani, 20) / 100)), 0) from siparisler) as teslimat_net,
      (select coalesce(sum(kurye), 0) from siparisler)                              as kurye,
      (select coalesce(sum(pos), 0) from siparisler)                                as pos,
      (select coalesce(sum(ambalaj), 0) from siparisler)                            as ambalaj,
      (select coalesce(sum(miktar * coalesce(birim_maliyet, 0)), 0) from fireler)   as fire,
      (select count(*) from fireler where birim_maliyet is null)                    as fire_maliyet_eksik,
      (select count(*) from fireler where tahmini)                                  as fire_maliyet_tahmini,
      (select coalesce(sum(tutar), 0) from giderler)                                as genel_gider,
      (select count(*) from kalemler where maliyet_eksik)                           as maliyet_eksik_kalem,
      (select count(*) from kalemler where maliyet_tahmini)                         as maliyet_tahmini_kalem,
      (select count(*) from kalemler where kdv_eksik)                               as kdv_eksik_kalem,
      (select coalesce(sum(toplam), 0) from siparisler where durum = 'kapinda' and odeme_yontemi = 'kapida_nakit') as tahsilat_nakit,
      (select coalesce(sum(toplam), 0) from siparisler where durum = 'kapinda' and odeme_yontemi = 'kapida_kart')  as tahsilat_kart,
      (select coalesce(sum(toplam), 0) from siparisler where durum <> 'kapinda')    as tahsil_edilecek
  )
  select jsonb_build_object(
    'ozet', (
      select jsonb_build_object(
        'siparis_sayisi',      siparis_sayisi,
        'ciro_brut',           ciro_brut,
        'ciro_net',            round(ciro_net, 2),
        'maliyet',             round(maliyet, 2),
        'brut_kar',            round(ciro_net - maliyet, 2),
        'teslimat_brut',       teslimat_brut,
        'teslimat_net',        round(teslimat_net, 2),
        'kurye',               round(kurye, 2),
        'pos',                 round(pos, 2),
        'ambalaj',             round(ambalaj, 2),
        'katki_payi',          round(ciro_net - maliyet + teslimat_net - kurye - pos - ambalaj, 2),
        'fire',                round(fire, 2),
        'fire_maliyet_eksik',  fire_maliyet_eksik,
        'fire_maliyet_tahmini', fire_maliyet_tahmini,
        'genel_gider',         round(genel_gider, 2),
        'net_kar',             round(ciro_net - maliyet + teslimat_net - kurye - pos - ambalaj - fire - genel_gider, 2),
        'maliyet_eksik_kalem', maliyet_eksik_kalem,
        'maliyet_tahmini_kalem', maliyet_tahmini_kalem,
        'kdv_eksik_kalem',     kdv_eksik_kalem,
        'tahsilat_nakit',      tahsilat_nakit,
        'tahsilat_kart',       tahsilat_kart,
        'tahsil_edilecek',     tahsil_edilecek
      ) from toplamlar
    ),
    'urunler', coalesce((
      select jsonb_agg(u order by (u->>'brut_kar')::numeric desc) from (
        select jsonb_build_object(
          'product_id',    product_id,
          'ad',            max(ad),
          'adet',          sum(miktar),
          'ciro_brut',     sum(ciro_brut),
          'ciro_net',      round(sum(ciro_net), 2),
          'maliyet',       round(sum(maliyet), 2),
          'brut_kar',      round(sum(ciro_net - maliyet), 2),
          'maliyet_eksik', bool_or(maliyet_eksik),
          'maliyet_tahmini', bool_or(maliyet_tahmini),
          'kdv_eksik',     bool_or(kdv_eksik)
        ) as u
        from kalemler group by product_id
      ) t
    ), '[]'::jsonb),
    'gunluk', coalesce((
      select jsonb_agg(g order by g->>'gun') from (
        select jsonb_build_object(
          'gun',      gun,
          'siparis',  count(distinct order_id),
          'ciro_net', round(sum(ciro_net), 2),
          'brut_kar', round(sum(ciro_net - maliyet), 2)
        ) as g
        from kalemler group by gun
      ) t
    ), '[]'::jsonb),
    'gider_kategorileri', coalesce((
      select jsonb_agg(jsonb_build_object('kategori', kategori, 'tutar', tutar) order by tutar desc)
        from (select kategori, sum(tutar) as tutar from giderler group by kategori) t
    ), '[]'::jsonb),
    'fire_sebepleri', coalesce((
      select jsonb_agg(jsonb_build_object('sebep', sebep, 'adet', adet, 'tutar', round(tutar, 2)) order by tutar desc)
        from (select sebep, sum(miktar) as adet, sum(miktar * coalesce(birim_maliyet, 0)) as tutar
                from fireler group by sebep) t
    ), '[]'::jsonb)
  ) into v_sonuc;

  return v_sonuc;
end;
$body$;
