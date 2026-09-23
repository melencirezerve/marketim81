-- Bu migration'ı Supabase SQL Editor'de çalıştırın.
-- Kampanya sistemi — ilk hedef: "İlk siparişe %10 indirim".
--
-- * kampanyalar: yüzde / tutar / ücretsiz teslimat; min sepet, üst sınır,
--   yalnızca ilk sipariş, tarih aralığı, aktif. Admin panelden yönetilir.
-- * İndirimi siparis_olustur() hesaplar; bir siparişe tek kampanya (en
--   avantajlısı) uygulanır. Sepet önizlemesi: kampanya_onizleme().
-- * "İlk sipariş": iptal edilmemiş önceki siparişi olan hesap, TELEFON ya da
--   ADRES ilk sayılmaz. Telefon/adres, hesap silinse de kalabilsin diye
--   siparis_parmak_izleri'nde gizli anahtarlı özet (HMAC) olarak tutulur —
--   numaranın/adresin kendisi değil. Telefon, SMS ile doğrulanmış
--   auth.users.phone'dan alınır (profildeki değiştirilebilir alan değil).
-- * Rapor: kampanya indirimleri katkı payından ve net kârdan düşülür.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- parmak izi
create table public._gizli_anahtarlar (
  ad    text primary key,
  deger text not null
);
alter table public._gizli_anahtarlar enable row level security;  -- policy yok: API'den kimse okuyamaz
insert into public._gizli_anahtarlar (ad, deger)
values ('parmak_izi', encode(extensions.gen_random_bytes(32), 'hex'));

-- Büyük/küçük harf, boşluk ve noktalama farkları aynı adresi ayrı saydırmasın.
create or replace function public._parmak_izi(p_deger text)
returns text language sql stable security definer set search_path = public as $body$
  select case when coalesce(p_deger, '') = '' then null else
    encode(extensions.hmac(
      regexp_replace(lower(p_deger), '[^a-z0-9çğıöşü]', '', 'g'),
      (select deger from public._gizli_anahtarlar where ad = 'parmak_izi'),
      'sha256'), 'hex')
  end;
$body$;
revoke all on function public._parmak_izi(text) from public, anon, authenticated;

create table public.siparis_parmak_izleri (
  order_id    text primary key references public.orders(id) on delete cascade,
  telefon_iz  text,
  adres_iz    text
);
create index siparis_parmak_izleri_telefon_idx on public.siparis_parmak_izleri (telefon_iz);
create index siparis_parmak_izleri_adres_idx on public.siparis_parmak_izleri (adres_iz);
alter table public.siparis_parmak_izleri enable row level security;
create policy siparis_parmak_izleri_admin_select on public.siparis_parmak_izleri for select to authenticated
  using (public.is_admin());

-- Mevcut siparişler (telefon/adres snapshot'larından).
insert into public.siparis_parmak_izleri (order_id, telefon_iz, adres_iz)
select id, public._parmak_izi(musteri_telefon), public._parmak_izi(teslimat_adresi)
  from public.orders
on conflict (order_id) do nothing;

-- ---------------------------------------------------------------- kampanyalar
create table public.kampanyalar (
  id                  uuid primary key default gen_random_uuid(),
  ad                  text not null,                 -- müşteriye görünür: "İlk Siparişe %10 İndirim"
  tur                 text not null check (tur in ('yuzde', 'tutar', 'ucretsiz_teslimat')),
  deger               numeric(10,2) check (deger >= 0),  -- yüzde ya da TL; ücretsiz teslimatta boş
  max_indirim         numeric(10,2) check (max_indirim >= 0),  -- null: sınırsız
  min_sepet           numeric(10,2) not null default 0 check (min_sepet >= 0),
  sadece_ilk_siparis  boolean not null default false,
  baslangic           timestamptz,
  bitis               timestamptz,
  aktif               boolean not null default true,
  created_at          timestamptz not null default now(),
  check (tur = 'ucretsiz_teslimat' or deger is not null),
  check (tur <> 'yuzde' or deger <= 100)
);
alter table public.kampanyalar enable row level security;
create policy kampanyalar_public_select on public.kampanyalar for select to anon, authenticated using (aktif);
create policy kampanyalar_admin_all on public.kampanyalar for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.kampanyalar (ad, tur, deger, max_indirim, min_sepet, sadece_ilk_siparis)
values ('İlk Siparişe %10 İndirim', 'yuzde', 10, 1000, 200, true);

alter table public.orders add column kampanya_id uuid references public.kampanyalar(id) on delete set null;
alter table public.orders add column kampanya_adi text;
alter table public.orders add column indirim_tutari numeric(10,2) not null default 0 check (indirim_tutari >= 0);  -- KDV dahil
alter table public.orders add column indirim_kdv_haric numeric(10,2) not null default 0;

-- Müşteri + telefon + adres için şu an geçerli kampanyalar ve sağlayacakları indirim.
-- min_sepet burada süzülmez (önizlemede "X ₺ daha ekleyin" ipucu için gerekli).
create or replace function public._uygun_kampanyalar(
  p_uid uuid, p_telefon_iz text, p_adres_iz text, p_ara numeric, p_ucret numeric)
returns table (kampanya_id uuid, ad text, tur text, min_sepet numeric, indirim numeric)
language sql stable security definer set search_path = public as $body$
  with ilk as (
    select not exists (
      select 1 from public.orders o
        left join public.siparis_parmak_izleri pi on pi.order_id = o.id
       where o.durum <> 'iptal'
         and (o.customer_id = p_uid or pi.telefon_iz = p_telefon_iz or pi.adres_iz = p_adres_iz)
    ) as ilk_siparis
  )
  select k.id, k.ad, k.tur, k.min_sepet,
         round(case k.tur
           when 'yuzde' then least(p_ara * k.deger / 100, coalesce(k.max_indirim, p_ara))
           when 'tutar' then least(k.deger, coalesce(k.max_indirim, k.deger), p_ara)
           else p_ucret
         end, 2)
    from public.kampanyalar k, ilk
   where k.aktif
     and (k.baslangic is null or k.baslangic <= now())
     and (k.bitis is null or k.bitis > now())
     and (not k.sadece_ilk_siparis or ilk.ilk_siparis);
$body$;
revoke all on function public._uygun_kampanyalar(uuid, text, text, numeric, numeric) from public, anon, authenticated;

create or replace function public._adres_metni(a public.addresses)
returns text language sql immutable as $body$
  select a.sokak || ' No:' || a.bina_no
         || case when a.daire_no <> '' then ' D:' || a.daire_no else '' end
         || ', ' || a.mahalle || ' Mah., Cumayeri/Düzce';
$body$;

-- ---------------------------------------------------------------- sepet önizlemesi
-- Sipariş vermeden önce sepette gösterilecek indirim ve "X ₺ daha ekleyin" ipucu.
create or replace function public.kampanya_onizleme(p_kalemler jsonb, p_adres_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $body$
declare
  v_uid    uuid := auth.uid();
  v_adres  public.addresses%rowtype;
  v_ayar   public.market_ayarlari%rowtype;
  v_ara    numeric := 0;
  v_ucret  numeric;
  v_tel    text;
  v_en_iyi record;
  v_firsat record;
begin
  if v_uid is null then
    return null;
  end if;
  select * into v_adres from public.addresses where id = p_adres_id and customer_id = v_uid;

  select coalesce(sum(p.fiyat * (e->>'miktar')::int), 0) into v_ara
    from jsonb_array_elements(coalesce(p_kalemler, '[]'::jsonb)) e
    join public.products p on p.id = (e->>'product_id')::uuid;

  select * into v_ayar from public.market_ayarlari;
  v_ucret := case
    when v_ayar.ucretsiz_teslimat_esigi is not null and v_ara >= v_ayar.ucretsiz_teslimat_esigi then 0
    else v_ayar.teslimat_ucreti
  end;
  select nullif(phone, '') into v_tel from auth.users where id = v_uid;

  select * into v_en_iyi from public._uygun_kampanyalar(
    v_uid, public._parmak_izi('+' || v_tel),
    case when v_adres.id is null then null else public._parmak_izi(public._adres_metni(v_adres)) end,
    v_ara, v_ucret) u
   where v_ara >= u.min_sepet and u.indirim > 0
   order by u.indirim desc limit 1;

  select * into v_firsat from public._uygun_kampanyalar(
    v_uid, public._parmak_izi('+' || v_tel),
    case when v_adres.id is null then null else public._parmak_izi(public._adres_metni(v_adres)) end,
    greatest(v_ara, 0), v_ucret) u
   where v_ara < u.min_sepet
   order by u.min_sepet - v_ara limit 1;

  return jsonb_build_object(
    'kampanya', case when v_en_iyi.kampanya_id is null then null else
      jsonb_build_object('id', v_en_iyi.kampanya_id, 'ad', v_en_iyi.ad, 'tur', v_en_iyi.tur, 'indirim', v_en_iyi.indirim) end,
    'firsat', case when v_firsat.kampanya_id is null then null else
      jsonb_build_object('ad', v_firsat.ad, 'eksik', v_firsat.min_sepet - v_ara) end
  );
end;
$body$;
revoke all on function public.kampanya_onizleme(jsonb, uuid) from public, anon;
grant execute on function public.kampanya_onizleme(jsonb, uuid) to authenticated;

-- ---------------------------------------------------------------- sipariş oluştur (kampanyalı)
create or replace function public.siparis_olustur(p_kalemler jsonb, p_adres_id uuid, p_odeme_yontemi text)
returns text language plpgsql security definer set search_path = public as $body$
declare
  v_uid       uuid := auth.uid();
  v_adres     public.addresses%rowtype;
  v_ayar      public.market_ayarlari%rowtype;
  v_urun      public.products%rowtype;
  v_kalem     record;
  v_kampanya  record;
  v_ara       numeric(10,2) := 0;
  v_ara_net   numeric := 0;
  v_ucret     numeric(10,2);
  v_indirim   numeric(10,2) := 0;
  v_ind_net   numeric(10,2) := 0;
  v_id        text;
  v_ad        text;
  v_telefon   text;
  v_email     text;
  v_adres_mt  text;
  v_tel_iz    text;
  v_adres_iz  text;
begin
  if v_uid is null then
    raise exception 'Sipariş vermek için giriş yapmalısınız.';
  end if;
  if p_odeme_yontemi not in ('kapida_nakit', 'kapida_kart') then
    raise exception 'Geçersiz ödeme yöntemi.';
  end if;
  if p_kalemler is null or jsonb_typeof(p_kalemler) <> 'array' or jsonb_array_length(p_kalemler) = 0 then
    raise exception 'Sepetiniz boş.';
  end if;

  select * into v_adres from public.addresses where id = p_adres_id and customer_id = v_uid;
  if not found then
    raise exception 'Teslimat adresi bulunamadı.';
  end if;
  v_adres_mt := public._adres_metni(v_adres);

  select p.ad, coalesce(p.telefon, '+' || nullif(u.phone, '')), nullif(u.email, ''), '+' || nullif(u.phone, '')
    into v_ad, v_telefon, v_email, v_tel_iz
    from auth.users u left join public.profiles p on p.id = u.id
   where u.id = v_uid;
  -- İz, profildeki (değiştirilebilir) telefondan değil SMS ile doğrulanmış numaradan.
  v_tel_iz := public._parmak_izi(v_tel_iz);
  v_adres_iz := public._parmak_izi(v_adres_mt);

  -- Aynı telefon/adresten eşzamanlı iki "ilk sipariş" ikisi de indirim almasın.
  perform pg_advisory_xact_lock(hashtext(coalesce(v_tel_iz, v_uid::text)));
  perform pg_advisory_xact_lock(hashtext(v_adres_iz));

  drop table if exists _kalemler;
  create temp table _kalemler on commit drop as
    select (e->>'product_id')::uuid as product_id, sum((e->>'miktar')::int) as miktar
      from jsonb_array_elements(p_kalemler) e
     group by 1;

  for v_kalem in select * from _kalemler order by product_id loop
    if v_kalem.miktar is null or v_kalem.miktar <= 0 then
      raise exception 'Geçersiz ürün adedi.';
    end if;
    select * into v_urun from public.products where id = v_kalem.product_id for update;
    if not found or not v_urun.aktif then
      raise exception '% artık satışta değil.', coalesce(v_urun.ad, 'Sepetinizdeki bir ürün');
    end if;
    if v_urun.stok < v_kalem.miktar then
      if v_urun.stok = 0 then
        raise exception '% tükendi.', v_urun.ad;
      end if;
      raise exception '% için yeterli stok yok (en fazla % adet).', v_urun.ad, v_urun.stok;
    end if;
    v_ara := v_ara + v_urun.fiyat * v_kalem.miktar;
    v_ara_net := v_ara_net + v_urun.fiyat * v_kalem.miktar / (1 + coalesce(v_urun.kdv_orani, 0) / 100);
  end loop;

  select * into v_ayar from public.market_ayarlari;
  if v_ara < v_ayar.min_sepet_tutari then
    raise exception 'Minimum sipariş tutarı % ₺.', v_ayar.min_sepet_tutari;
  end if;
  v_ucret := case
    when v_ayar.ucretsiz_teslimat_esigi is not null and v_ara >= v_ayar.ucretsiz_teslimat_esigi then 0
    else v_ayar.teslimat_ucreti
  end;

  -- Tek kampanya: en avantajlısı.
  select * into v_kampanya
    from public._uygun_kampanyalar(v_uid, v_tel_iz, v_adres_iz, v_ara, v_ucret) u
   where v_ara >= u.min_sepet and u.indirim > 0
   order by u.indirim desc limit 1;
  if v_kampanya.kampanya_id is not null then
    v_indirim := v_kampanya.indirim;
    -- İndirimin KDV hariç karşılığı (kârlılık raporu için): ürün indiriminde
    -- sepetin KDV karışımıyla, teslimat indiriminde teslimat KDV'siyle.
    v_ind_net := case
      when v_kampanya.tur = 'ucretsiz_teslimat' then v_indirim / (1 + v_ayar.teslimat_kdv_orani / 100)
      else v_indirim * v_ara_net / nullif(v_ara, 0)
    end;
  end if;

  loop
    v_id := 'S81-' || (100000 + floor(random() * 900000))::int;
    exit when not exists (select 1 from public.orders where id = v_id);
  end loop;

  insert into public.orders (id, customer_id, musteri_adi, musteri_telefon, musteri_email,
                             teslimat_adresi, odeme_yontemi, durum, ara_toplam, teslimat_ucreti,
                             teslimat_kdv_orani, kampanya_id, kampanya_adi, indirim_tutari,
                             indirim_kdv_haric, toplam)
  values (v_id, v_uid, v_ad, v_telefon, v_email, v_adres_mt,
          p_odeme_yontemi, 'alindi', v_ara, v_ucret, v_ayar.teslimat_kdv_orani,
          v_kampanya.kampanya_id, v_kampanya.ad, v_indirim, coalesce(v_ind_net, 0),
          v_ara + v_ucret - v_indirim);

  insert into public.siparis_parmak_izleri (order_id, telefon_iz, adres_iz)
  values (v_id, v_tel_iz, v_adres_iz);

  insert into public.order_items (order_id, product_id, ad, fiyat, gorsel_url, miktar, kdv_orani)
  select v_id, p.id, p.ad, p.fiyat, p.gorsel_url, k.miktar, p.kdv_orani
    from _kalemler k join public.products p on p.id = k.product_id;

  insert into public.siparis_kalem_maliyetleri (order_item_id, birim_maliyet)
  select oi.id, m.alis_fiyati
    from public.order_items oi join public.urun_maliyetleri m on m.product_id = oi.product_id
   where oi.order_id = v_id;

  update public.products p set stok = p.stok - k.miktar
    from _kalemler k where p.id = k.product_id;

  return v_id;
end;
$body$;

-- ---------------------------------------------------------------- rapor (kampanya indirimi dahil)
-- migration-012'deki rapor; kampanya indirimi (KDV hariç) katkı payından ve
-- net kârdan düşülür, kampanya bazında döküm eklenir.
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
      (select coalesce(sum(indirim_kdv_haric), 0) from siparisler)                  as kampanya_indirimi,
      (select coalesce(sum(indirim_tutari), 0) from siparisler)                     as kampanya_indirimi_brut,
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
        'kampanya_indirimi',   round(kampanya_indirimi, 2),
        'kampanya_indirimi_brut', kampanya_indirimi_brut,
        'katki_payi',          round(ciro_net - maliyet + teslimat_net - kampanya_indirimi - kurye - pos - ambalaj, 2),
        'fire',                round(fire, 2),
        'fire_maliyet_eksik',  fire_maliyet_eksik,
        'fire_maliyet_tahmini', fire_maliyet_tahmini,
        'genel_gider',         round(genel_gider, 2),
        'net_kar',             round(ciro_net - maliyet + teslimat_net - kampanya_indirimi - kurye - pos - ambalaj - fire - genel_gider, 2),
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
    'kampanyalar', coalesce((
      select jsonb_agg(jsonb_build_object('ad', ad, 'siparis', siparis, 'indirim', indirim) order by indirim desc)
        from (select kampanya_adi as ad, count(*) as siparis, sum(indirim_tutari) as indirim
                from siparisler where indirim_tutari > 0 group by kampanya_adi) t
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
