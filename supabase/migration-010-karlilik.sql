-- Bu migration'ı Supabase SQL Editor'de çalıştırın.
-- Faz 1 — ürün kârlılığı:
--   * Ürüne KDV oranı; birim alış maliyeti (KDV hariç) ayrı, yalnızca admin'in
--     okuyabildiği tabloda (products ve order_items müşteriye de açık).
--   * Mal kabulde alış fiyatı girilir, maliyet ağırlıklı ortalama ile güncellenir.
--   * Sipariş anında KDV oranı ve birim maliyet dondurulur; alış fiyatı sonradan
--     değişse de geçmiş kâr değişmez.
--   * karlilik_raporu(): tarih aralığı için özet, ürün bazında ve günlük kâr.
--
-- Tüm tutarlar: fiyatlar KDV DAHİL saklanıyor (products.fiyat, order_items.fiyat,
-- orders.teslimat_ucreti); maliyet KDV HARİÇ. Kâr KDV hariç hesaplanır.

-- ---------------------------------------------------------------- KDV
-- null = girilmemiş (raporda uyarı çıkar). Oranları mali müşavirle teyit edin.
alter table public.products add column kdv_orani numeric(5,2) check (kdv_orani >= 0 and kdv_orani <= 100);
alter table public.order_items add column kdv_orani numeric(5,2);

alter table public.market_ayarlari
  add column teslimat_kdv_orani numeric(5,2) not null default 20 check (teslimat_kdv_orani >= 0 and teslimat_kdv_orani <= 100);
alter table public.orders add column teslimat_kdv_orani numeric(5,2);

-- ---------------------------------------------------------------- maliyetler (admin'e özel)
create table public.urun_maliyetleri (
  product_id  uuid primary key references public.products(id) on delete cascade,
  alis_fiyati numeric(10,2) not null check (alis_fiyati >= 0),  -- birim, KDV hariç, ağırlıklı ortalama
  updated_at  timestamptz not null default now()
);
create trigger urun_maliyetleri_set_updated_at before update on public.urun_maliyetleri
  for each row execute function public.set_updated_at();

alter table public.urun_maliyetleri enable row level security;
create policy urun_maliyetleri_admin_all on public.urun_maliyetleri for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table public.siparis_kalem_maliyetleri (
  order_item_id uuid primary key references public.order_items(id) on delete cascade,
  birim_maliyet numeric(10,2) not null check (birim_maliyet >= 0)  -- sipariş anındaki, KDV hariç
);
alter table public.siparis_kalem_maliyetleri enable row level security;
create policy siparis_kalem_maliyetleri_admin_all on public.siparis_kalem_maliyetleri for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Mal kabul geçmişi (ileride alış faturası/tedarikçi eşleştirmesi için de temel).
create table public.mal_kabul_kayitlari (
  id          bigint generated always as identity primary key,
  product_id  uuid references public.products(id) on delete set null,
  miktar      integer not null check (miktar > 0),
  birim_alis  numeric(10,2) check (birim_alis >= 0),  -- null: fiyatsız giriş
  kullanici   uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index mal_kabul_kayitlari_product_id_idx on public.mal_kabul_kayitlari (product_id);
alter table public.mal_kabul_kayitlari enable row level security;
create policy mal_kabul_kayitlari_admin_select on public.mal_kabul_kayitlari for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------- mal kabul
-- p_kalemler: [{"product_id": "<uuid>", "miktar": 24, "birim_alis": 9.50}, ...]
-- birim_alis boş/null ise yalnızca stok artar, maliyet değişmez.
-- Yeni maliyet = (eski_stok × eski_maliyet + gelen × gelen_fiyat) / (eski_stok + gelen)
create or replace function public.mal_kabul(p_kalemler jsonb)
returns void language plpgsql security definer set search_path = public as $body$
declare
  v_kalem  record;
  v_stok   integer;
  v_eski   numeric;
  v_yeni   numeric;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yetkiniz yok.';
  end if;

  for v_kalem in
    select (e->>'product_id')::uuid as product_id,
           (e->>'miktar')::int as miktar,
           nullif(e->>'birim_alis', '')::numeric as birim_alis
      from jsonb_array_elements(p_kalemler) e
     order by 1
  loop
    if v_kalem.miktar is null or v_kalem.miktar <= 0 then
      raise exception 'Geçersiz adet.';
    end if;
    if v_kalem.birim_alis is not null and v_kalem.birim_alis < 0 then
      raise exception 'Geçersiz alış fiyatı.';
    end if;

    select stok into v_stok from public.products where id = v_kalem.product_id for update;
    if not found then
      raise exception 'Ürün bulunamadı.';
    end if;

    if v_kalem.birim_alis is not null then
      select alis_fiyati into v_eski from public.urun_maliyetleri where product_id = v_kalem.product_id;
      v_yeni := case
        when v_eski is null or v_stok <= 0 then v_kalem.birim_alis
        else (v_stok * v_eski + v_kalem.miktar * v_kalem.birim_alis) / (v_stok + v_kalem.miktar)
      end;
      insert into public.urun_maliyetleri (product_id, alis_fiyati)
      values (v_kalem.product_id, round(v_yeni, 2))
      on conflict (product_id) do update set alis_fiyati = excluded.alis_fiyati;
    end if;

    update public.products set stok = stok + v_kalem.miktar where id = v_kalem.product_id;
    insert into public.mal_kabul_kayitlari (product_id, miktar, birim_alis, kullanici)
    values (v_kalem.product_id, v_kalem.miktar, v_kalem.birim_alis, auth.uid());
  end loop;
end;
$body$;

revoke all on function public.mal_kabul(jsonb) from public, anon;
grant execute on function public.mal_kabul(jsonb) to authenticated;

-- ---------------------------------------------------------------- sipariş oluştur (KDV + maliyet dondurma)
-- migration-007'deki fonksiyonun aynısı; order_items'a kdv_orani, orders'a
-- teslimat_kdv_orani yazılıyor ve siparis_kalem_maliyetleri dolduruluyor.
create or replace function public.siparis_olustur(p_kalemler jsonb, p_adres_id uuid, p_odeme_yontemi text)
returns text language plpgsql security definer set search_path = public as $body$
declare
  v_uid      uuid := auth.uid();
  v_adres    public.addresses%rowtype;
  v_ayar     public.market_ayarlari%rowtype;
  v_urun     public.products%rowtype;
  v_kalem    record;
  v_ara      numeric(10,2) := 0;
  v_ucret    numeric(10,2);
  v_id       text;
  v_ad       text;
  v_telefon  text;
  v_email    text;
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
  end loop;

  select * into v_ayar from public.market_ayarlari;
  if v_ara < v_ayar.min_sepet_tutari then
    raise exception 'Minimum sipariş tutarı % ₺.', v_ayar.min_sepet_tutari;
  end if;
  v_ucret := case
    when v_ayar.ucretsiz_teslimat_esigi is not null and v_ara >= v_ayar.ucretsiz_teslimat_esigi then 0
    else v_ayar.teslimat_ucreti
  end;

  loop
    v_id := 'S81-' || (100000 + floor(random() * 900000))::int;
    exit when not exists (select 1 from public.orders where id = v_id);
  end loop;

  select p.ad, coalesce(p.telefon, '+' || nullif(u.phone, '')), nullif(u.email, '')
    into v_ad, v_telefon, v_email
    from auth.users u left join public.profiles p on p.id = u.id
   where u.id = v_uid;

  insert into public.orders (id, customer_id, musteri_adi, musteri_telefon, musteri_email,
                             teslimat_adresi, odeme_yontemi, durum, ara_toplam, teslimat_ucreti,
                             teslimat_kdv_orani, toplam)
  values (v_id, v_uid, v_ad, v_telefon, v_email,
          v_adres.sokak || ' No:' || v_adres.bina_no
            || case when v_adres.daire_no <> '' then ' D:' || v_adres.daire_no else '' end
            || ', ' || v_adres.mahalle || ' Mah., Cumayeri/Düzce',
          p_odeme_yontemi, 'alindi', v_ara, v_ucret, v_ayar.teslimat_kdv_orani, v_ara + v_ucret);

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

-- ---------------------------------------------------------------- rapor
-- İptal edilenler hariç, [p_baslangic, p_bitis) aralığında verilen siparişler.
-- KDV oranı ya da maliyeti eksik kalemler 0 kabul edilir ve sayıları döner
-- (bu durumda kâr olduğundan yüksek görünür; raporda uyarı gösterilir).
create or replace function public.karlilik_raporu(p_baslangic timestamptz, p_bitis timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $body$
declare
  v_sonuc jsonb;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yetkiniz yok.';
  end if;

  with siparisler as (
    select o.* from public.orders o
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
  )
  select jsonb_build_object(
    'ozet', (
      select jsonb_build_object(
        'siparis_sayisi',   (select count(*) from siparisler),
        'ciro_brut',        coalesce(sum(ciro_brut), 0),
        'ciro_net',         coalesce(round(sum(ciro_net), 2), 0),
        'maliyet',          coalesce(round(sum(maliyet), 2), 0),
        'brut_kar',         coalesce(round(sum(ciro_net - maliyet), 2), 0),
        'teslimat_brut',    (select coalesce(sum(teslimat_ucreti), 0) from siparisler),
        'teslimat_net',     (select coalesce(round(sum(teslimat_ucreti / (1 + coalesce(teslimat_kdv_orani, 20) / 100)), 2), 0) from siparisler),
        'maliyet_eksik_kalem', count(*) filter (where maliyet_eksik),
        'kdv_eksik_kalem',  count(*) filter (where kdv_eksik)
      ) from kalemler
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
    ), '[]'::jsonb)
  ) into v_sonuc;

  return v_sonuc;
end;
$body$;

revoke all on function public.karlilik_raporu(timestamptz, timestamptz) from public, anon;
grant execute on function public.karlilik_raporu(timestamptz, timestamptz) to authenticated;
