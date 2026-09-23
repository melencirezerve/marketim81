-- Bu migration'ı Supabase SQL Editor'de çalıştırın.
-- Siparişi mobil istemcinin değil veritabanının oluşturduğu hale getirir:
--
-- * Fiyat/toplam/teslimat ücreti sunucuda, products tablosundan hesaplanır.
--   Önceden müşteri orders'a doğrudan insert yaptığı için toplamı (ve
--   order_items fiyatlarını) istediği gibi yazabiliyordu.
-- * Stok sipariş anında kilitlenip kontrol edilir ve düşülür; iptalde iade edilir.
-- * Müşteri sipariş durumunu artık güncelleyemez (mobildeki sahte durum
--   ilerlemesi kaldırıldı); durumu yalnızca admin değiştirir. Müşteri sadece
--   'alindi' aşamasındaki kendi siparişini iptal edebilir.
-- * Minimum sepet tutarı / teslimat ücreti admin panelden ayarlanır.
-- * Uygulama içinden hesap silme (Google Play / App Store şartı).
-- * orders tablosu Realtime yayınına eklenir (canlı durum + admin'e yeni sipariş uyarısı).

-- ---------------------------------------------------------------- ayarlar
create table public.market_ayarlari (
  id                      boolean primary key default true check (id),  -- tek satır
  min_sepet_tutari        numeric(10,2) not null default 0 check (min_sepet_tutari >= 0),
  teslimat_ucreti         numeric(10,2) not null default 0 check (teslimat_ucreti >= 0),
  ucretsiz_teslimat_esigi numeric(10,2) check (ucretsiz_teslimat_esigi >= 0),  -- null: yok
  updated_at              timestamptz not null default now()
);
insert into public.market_ayarlari default values;

create trigger market_ayarlari_set_updated_at before update on public.market_ayarlari
  for each row execute function public.set_updated_at();

alter table public.market_ayarlari enable row level security;
create policy market_ayarlari_public_select on public.market_ayarlari for select to anon, authenticated using (true);
create policy market_ayarlari_admin_update on public.market_ayarlari for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- ürün açıklaması
alter table public.products add column aciklama text not null default '';

-- ---------------------------------------------------------------- sipariş kolonları
alter table public.orders add column ara_toplam numeric(10,2) check (ara_toplam >= 0);
alter table public.orders add column teslimat_ucreti numeric(10,2) not null default 0 check (teslimat_ucreti >= 0);
update public.orders set ara_toplam = toplam where ara_toplam is null;
alter table public.orders alter column ara_toplam set not null;

alter table public.orders drop constraint orders_durum_check;
alter table public.orders add constraint orders_durum_check
  check (durum in ('alindi', 'hazirlaniyor', 'yolda', 'kapinda', 'iptal'));

-- ---------------------------------------------------------------- durum geçmişi
create table public.order_status_history (
  id          bigint generated always as identity primary key,
  order_id    text not null references public.orders(id) on delete cascade,
  durum       text not null,
  created_at  timestamptz not null default now()
);
create index order_status_history_order_id_idx on public.order_status_history (order_id);

insert into public.order_status_history (order_id, durum, created_at)
select id, durum, updated_at from public.orders;

alter table public.order_status_history enable row level security;
create policy order_status_history_own_select on public.order_status_history for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
create policy order_status_history_admin_select on public.order_status_history for select to authenticated
  using (public.is_admin());

create or replace function public.siparis_durum_gecmisi_yaz()
returns trigger language plpgsql security definer set search_path = public as $body$
begin
  if tg_op = 'INSERT' or new.durum is distinct from old.durum then
    insert into public.order_status_history (order_id, durum) values (new.id, new.durum);
  end if;
  return new;
end;
$body$;

create trigger orders_durum_gecmisi after insert or update of durum on public.orders
  for each row execute function public.siparis_durum_gecmisi_yaz();

-- İptal edilen siparişin stoğunu iade et; iptal geri alınamaz (stok tekrar
-- düşülmediği için tutarsızlık olurdu).
create or replace function public.siparis_iptal_stok_iade()
returns trigger language plpgsql security definer set search_path = public as $body$
begin
  if old.durum = 'iptal' and new.durum <> 'iptal' then
    raise exception 'İptal edilen sipariş tekrar açılamaz.';
  end if;
  if new.durum = 'iptal' and old.durum <> 'iptal' then
    update public.products p
       set stok = p.stok + k.miktar
      from (select product_id, sum(miktar) as miktar
              from public.order_items
             where order_id = new.id and product_id is not null
             group by product_id) k
     where p.id = k.product_id;
  end if;
  return new;
end;
$body$;

create trigger orders_iptal_stok_iade before update of durum on public.orders
  for each row execute function public.siparis_iptal_stok_iade();

-- ---------------------------------------------------------------- RLS
-- Müşteri orders/order_items'a artık doğrudan yazamaz; yalnızca aşağıdaki
-- fonksiyonlar üzerinden sipariş verir/iptal eder.
drop policy orders_own_insert on public.orders;
drop policy orders_own_update_durum on public.orders;
drop policy order_items_own_insert on public.order_items;

-- ---------------------------------------------------------------- sipariş oluştur
-- p_kalemler: [{"product_id": "<uuid>", "miktar": 2}, ...]
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

  -- Ürünleri id sırasıyla kilitle (eşzamanlı siparişlerde deadlock olmasın),
  -- stok ve satış durumunu kontrol et, ara toplamı hesapla.
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
                             teslimat_adresi, odeme_yontemi, durum, ara_toplam, teslimat_ucreti, toplam)
  values (v_id, v_uid, v_ad, v_telefon, v_email,
          v_adres.sokak || ' No:' || v_adres.bina_no
            || case when v_adres.daire_no <> '' then ' D:' || v_adres.daire_no else '' end
            || ', ' || v_adres.mahalle || ' Mah., Cumayeri/Düzce',
          p_odeme_yontemi, 'alindi', v_ara, v_ucret, v_ara + v_ucret);

  insert into public.order_items (order_id, product_id, ad, fiyat, gorsel_url, miktar)
  select v_id, p.id, p.ad, p.fiyat, p.gorsel_url, k.miktar
    from _kalemler k join public.products p on p.id = k.product_id;

  update public.products p set stok = p.stok - k.miktar
    from _kalemler k where p.id = k.product_id;

  return v_id;
end;
$body$;

-- ---------------------------------------------------------------- sipariş iptal
create or replace function public.siparis_iptal(p_order_id text)
returns void language plpgsql security definer set search_path = public as $body$
begin
  update public.orders set durum = 'iptal'
   where id = p_order_id and customer_id = auth.uid() and durum = 'alindi';
  if not found then
    raise exception 'Bu sipariş artık iptal edilemez. Hazırlanmaya başladıysa destek hattımızı arayın.';
  end if;
end;
$body$;

-- ---------------------------------------------------------------- hesap silme
-- Sipariş kayıtları (muhasebe) silinmez, kişisel bilgiler anonimleştirilir.
-- Adresler ve profil auth.users'a cascade ile bağlı olduğu için silinir.
create or replace function public.hesabimi_sil()
returns void language plpgsql security definer set search_path = public as $body$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Giriş yapmalısınız.';
  end if;
  if public.is_admin() then
    raise exception 'Admin hesapları uygulamadan silinemez.';
  end if;
  if exists (select 1 from public.orders
              where customer_id = v_uid and durum in ('alindi', 'hazirlaniyor', 'yolda')) then
    raise exception 'Devam eden siparişiniz varken hesabınızı silemezsiniz.';
  end if;

  update public.orders
     set customer_id = null, musteri_adi = 'Silinmiş kullanıcı',
         musteri_telefon = null, musteri_email = null, teslimat_adresi = null
   where customer_id = v_uid;
  delete from auth.users where id = v_uid;
end;
$body$;

revoke all on function public.siparis_olustur(jsonb, uuid, text) from public, anon;
revoke all on function public.siparis_iptal(text) from public, anon;
revoke all on function public.hesabimi_sil() from public, anon;
grant execute on function public.siparis_olustur(jsonb, uuid, text) to authenticated;
grant execute on function public.siparis_iptal(text) to authenticated;
grant execute on function public.hesabimi_sil() to authenticated;

-- ---------------------------------------------------------------- realtime
do $body$
begin
  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$body$;
