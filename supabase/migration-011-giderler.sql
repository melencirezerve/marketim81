-- Bu migration'ı Supabase SQL Editor'de çalıştırın.
-- Faz 2 — operasyon giderleri ve net kâr:
--   * Sipariş başı giderler (kurye, POS komisyonu, ambalaj): admin'e özel
--     ayar tablosu; her siparişe oluştuğu anda dondurulur.
--   * Genel giderler (kira, maaş, faturalar...).
--   * Fire/zayi kaydı; sayımda eksik çıkan adet otomatik fire yazılır.
--   * karlilik_raporu(): katkı payı, fire, genel gider, net kâr ve tahsilat özeti.
--
-- Gider tutarları KDV HARİÇ girilir (ödenen KDV indirilebildiği için kâr
-- hesabında maliyet değildir). Kurye paket başı ücreti faturasız ödeniyorsa
-- ödenen tutarın tamamını girin.

-- ---------------------------------------------------------------- gider ayarları (admin'e özel)
create table public.gider_ayarlari (
  id                  boolean primary key default true check (id),  -- tek satır
  kurye_paket_ucreti  numeric(10,2) not null default 0 check (kurye_paket_ucreti >= 0),
  pos_komisyon_orani  numeric(5,2)  not null default 0 check (pos_komisyon_orani >= 0 and pos_komisyon_orani <= 100),
  ambalaj_maliyeti    numeric(10,2) not null default 0 check (ambalaj_maliyeti >= 0),
  updated_at          timestamptz not null default now()
);
insert into public.gider_ayarlari (kurye_paket_ucreti, pos_komisyon_orani, ambalaj_maliyeti)
values (20, 3, 0.50);

create trigger gider_ayarlari_set_updated_at before update on public.gider_ayarlari
  for each row execute function public.set_updated_at();

alter table public.gider_ayarlari enable row level security;
create policy gider_ayarlari_admin_select on public.gider_ayarlari for select to authenticated using (public.is_admin());
create policy gider_ayarlari_admin_update on public.gider_ayarlari for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- sipariş giderleri (admin'e özel, dondurulmuş)
create table public.siparis_giderleri (
  order_id            text primary key references public.orders(id) on delete cascade,
  kurye_ucreti        numeric(10,2) not null,
  pos_komisyon_orani  numeric(5,2)  not null,  -- yalnızca kapıda kartta uygulanır
  ambalaj_maliyeti    numeric(10,2) not null
);
alter table public.siparis_giderleri enable row level security;
create policy siparis_giderleri_admin_all on public.siparis_giderleri for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.siparis_giderlerini_dondur()
returns trigger language plpgsql security definer set search_path = public as $body$
begin
  insert into public.siparis_giderleri (order_id, kurye_ucreti, pos_komisyon_orani, ambalaj_maliyeti)
  select new.id, g.kurye_paket_ucreti, g.pos_komisyon_orani, g.ambalaj_maliyeti
    from public.gider_ayarlari g;
  return new;
end;
$body$;

create trigger orders_giderleri_dondur after insert on public.orders
  for each row execute function public.siparis_giderlerini_dondur();

-- Mevcut siparişler için şimdiki ayarlarla doldur.
insert into public.siparis_giderleri (order_id, kurye_ucreti, pos_komisyon_orani, ambalaj_maliyeti)
select o.id, g.kurye_paket_ucreti, g.pos_komisyon_orani, g.ambalaj_maliyeti
  from public.orders o cross join public.gider_ayarlari g
on conflict (order_id) do nothing;

-- ---------------------------------------------------------------- genel giderler
create table public.genel_giderler (
  id          bigint generated always as identity primary key,
  tarih       date not null default ((now() at time zone 'Europe/Istanbul')::date),
  kategori    text not null,
  aciklama    text not null default '',
  tutar       numeric(12,2) not null check (tutar >= 0),  -- KDV hariç
  created_at  timestamptz not null default now()
);
create index genel_giderler_tarih_idx on public.genel_giderler (tarih);
alter table public.genel_giderler enable row level security;
create policy genel_giderler_admin_all on public.genel_giderler for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- fire / zayi
create table public.fire_kayitlari (
  id             bigint generated always as identity primary key,
  product_id     uuid references public.products(id) on delete set null,
  urun_adi       text not null,                  -- ürün silinse de rapor okunabilsin
  miktar         integer not null check (miktar > 0),
  sebep          text not null check (sebep in ('skt', 'hasar', 'kayip', 'sayim_eksigi', 'diger')),
  aciklama       text not null default '',
  birim_maliyet  numeric(10,2),                  -- o anki alış maliyeti; null = bilinmiyor
  kullanici      uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index fire_kayitlari_created_at_idx on public.fire_kayitlari (created_at);
alter table public.fire_kayitlari enable row level security;
create policy fire_kayitlari_admin_select on public.fire_kayitlari for select to authenticated using (public.is_admin());

-- p_kalemler: [{"product_id": "<uuid>", "miktar": 3}, ...]
create or replace function public.fire_kaydet(p_kalemler jsonb, p_sebep text, p_aciklama text default '')
returns void language plpgsql security definer set search_path = public as $body$
declare
  v_kalem record;
  v_urun  public.products%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yetkiniz yok.';
  end if;
  if p_sebep not in ('skt', 'hasar', 'kayip', 'diger') then
    raise exception 'Geçersiz fire sebebi.';
  end if;

  for v_kalem in
    select (e->>'product_id')::uuid as product_id, sum((e->>'miktar')::int) as miktar
      from jsonb_array_elements(p_kalemler) e
     group by 1 order by 1
  loop
    if v_kalem.miktar is null or v_kalem.miktar <= 0 then
      raise exception 'Geçersiz adet.';
    end if;
    select * into v_urun from public.products where id = v_kalem.product_id for update;
    if not found then
      raise exception 'Ürün bulunamadı.';
    end if;
    if v_urun.stok < v_kalem.miktar then
      raise exception '% için stokta yalnızca % adet var.', v_urun.ad, v_urun.stok;
    end if;
    update public.products set stok = stok - v_kalem.miktar where id = v_urun.id;
    insert into public.fire_kayitlari (product_id, urun_adi, miktar, sebep, aciklama, birim_maliyet, kullanici)
    select v_urun.id, v_urun.ad, v_kalem.miktar, p_sebep, coalesce(p_aciklama, ''), m.alis_fiyati, auth.uid()
      from (select 1) x left join public.urun_maliyetleri m on m.product_id = v_urun.id;
  end loop;
end;
$body$;

revoke all on function public.fire_kaydet(jsonb, text, text) from public, anon;
grant execute on function public.fire_kaydet(jsonb, text, text) to authenticated;

-- Sayımda sayılan adet mevcut stoktan azsa fark "sayım eksiği" firesi olarak yazılır.
create or replace function public.stok_guncelle(p_kalemler jsonb, p_mod text)
returns void language plpgsql security definer set search_path = public as $body$
declare
  v_kalem record;
  v_urun  public.products%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yetkiniz yok.';
  end if;
  if p_mod not in ('ekle', 'sayim') then
    raise exception 'Geçersiz mod.';
  end if;

  for v_kalem in
    select (e->>'product_id')::uuid as product_id, sum((e->>'miktar')::int) as miktar
      from jsonb_array_elements(p_kalemler) e
     group by 1
     order by 1
  loop
    if v_kalem.miktar is null or v_kalem.miktar < 0 then
      raise exception 'Geçersiz adet.';
    end if;
    select * into v_urun from public.products where id = v_kalem.product_id for update;
    if not found then
      continue;
    end if;
    if p_mod = 'ekle' then
      update public.products set stok = stok + v_kalem.miktar where id = v_urun.id;
    else
      if v_kalem.miktar < v_urun.stok then
        insert into public.fire_kayitlari (product_id, urun_adi, miktar, sebep, birim_maliyet, kullanici)
        select v_urun.id, v_urun.ad, v_urun.stok - v_kalem.miktar, 'sayim_eksigi', m.alis_fiyati, auth.uid()
          from (select 1) x left join public.urun_maliyetleri m on m.product_id = v_urun.id;
      end if;
      update public.products set stok = v_kalem.miktar where id = v_urun.id;
    end if;
  end loop;
end;
$body$;

-- ---------------------------------------------------------------- rapor
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
           coalesce(m.birim_maliyet, 0) * oi.miktar                     as maliyet,
           oi.kdv_orani is null                                         as kdv_eksik,
           m.birim_maliyet is null                                      as maliyet_eksik,
           (s.created_at at time zone 'Europe/Istanbul')::date          as gun
      from public.order_items oi
      join siparisler s on s.id = oi.order_id
      left join public.siparis_kalem_maliyetleri m on m.order_item_id = oi.id
  ),
  fireler as (
    select * from public.fire_kayitlari f
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
      (select coalesce(sum(tutar), 0) from giderler)                                as genel_gider,
      (select count(*) from kalemler where maliyet_eksik)                           as maliyet_eksik_kalem,
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
        'genel_gider',         round(genel_gider, 2),
        'net_kar',             round(ciro_net - maliyet + teslimat_net - kurye - pos - ambalaj - fire - genel_gider, 2),
        'maliyet_eksik_kalem', maliyet_eksik_kalem,
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
