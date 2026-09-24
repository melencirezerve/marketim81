-- Bu migration'ı Supabase SQL Editor'de çalıştırın.
-- Kurye ekranı ve kurye kasa mutabakatı:
--
-- * kuryeler: admin kuryeyi telefon numarasıyla ekler. Kurye admin panelin
--   /kurye sayfasına aynı numarayla SMS koduyla girdiğinde hesabı bu kayda
--   bağlanır (kurye_girisi). Pasife alınan kurye hiçbir siparişi göremez.
-- * orders.kurye_id: siparişi kim götürüyor. Kurye havuzdaki (atanmamış,
--   alındı/hazırlanıyor) siparişleri görüp üstlenebilir; admin de atayabilir.
--   Kurye durumu yalnızca aşağıdaki fonksiyonlarla değiştirir (yola çıktım /
--   teslim ettim); orders'a doğrudan yazma yetkisi yok.
-- * Teslimde kurye müşterinin gerçekte nasıl ödediğini seçer; farklıysa
--   orders.odeme_yontemi güncellenir (rapor ve POS komisyonu gerçek tahsilata
--   göre hesaplansın), odeme_kapida_degisti işaretlenir.
-- * kurye_mutabakatlari: kuryenin teslim ettiği, henüz mutabakatı yapılmamış
--   nakitli siparişler admin tarafından kapatılır; beklenen/teslim edilen nakit
--   ve fark saklanır. Mutabakatı yapılan sipariş artık değiştirilemez.
--   POS marketin olduğu için kart tahsilatı kuryeden istenmez, bilgi amaçlı tutulur.

-- ---------------------------------------------------------------- telefon
-- "0532 123 45 67", "+90 532...", "532..." → "+905321234567"; geçersizse null.
create or replace function public._telefon_normalize(p_telefon text)
returns text language plpgsql immutable as $body$
declare
  v text := regexp_replace(coalesce(p_telefon, ''), '\D', '', 'g');
begin
  if v like '90%' then v := substr(v, 3); end if;
  if v like '0%' then v := substr(v, 2); end if;
  if v ~ '^5\d{9}$' then return '+90' || v; end if;
  return null;
end;
$body$;

-- ---------------------------------------------------------------- kuryeler
create table public.kuryeler (
  id          uuid primary key default gen_random_uuid(),
  ad          text not null check (btrim(ad) <> ''),
  telefon     text not null unique,               -- +905xxxxxxxxx
  user_id     uuid unique references auth.users(id) on delete set null,
  aktif       boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.kuryeler enable row level security;
create policy kuryeler_admin_select on public.kuryeler for select to authenticated using (public.is_admin());
create policy kuryeler_admin_update on public.kuryeler for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy kuryeler_own_select on public.kuryeler for select to authenticated using (user_id = auth.uid());

-- Oturumdaki kullanıcının aktif kurye kaydı (yoksa null). RLS içinde kullanılıyor.
create or replace function public.aktif_kurye_id()
returns uuid language sql stable security definer set search_path = public as $body$
  select id from public.kuryeler where user_id = auth.uid() and aktif;
$body$;

-- ---------------------------------------------------------------- mutabakatlar
create table public.kurye_mutabakatlari (
  id                     uuid primary key default gen_random_uuid(),
  kurye_id               uuid not null references public.kuryeler(id),
  siparis_sayisi         integer not null,
  nakit_tahsilat         numeric(10,2) not null,
  kart_tahsilat          numeric(10,2) not null,
  kurye_ucreti           numeric(10,2) not null,  -- paket başı ücretlerin toplamı
  ucret_nakitten_alindi  boolean not null,        -- kurye ücretini tahsil ettiği nakitten aldı mı
  beklenen_nakit         numeric(10,2) not null,  -- negatifse markete değil kuryeye ödenecek
  teslim_edilen_nakit    numeric(10,2) not null,
  fark                   numeric(10,2) not null,  -- teslim edilen − beklenen (eksi: kasa açığı)
  aciklama               text not null default '',
  created_by             uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default now()
);
create index kurye_mutabakatlari_kurye_idx on public.kurye_mutabakatlari (kurye_id, created_at desc);

alter table public.kurye_mutabakatlari enable row level security;
create policy kurye_mutabakatlari_admin_select on public.kurye_mutabakatlari for select to authenticated
  using (public.is_admin());
create policy kurye_mutabakatlari_own_select on public.kurye_mutabakatlari for select to authenticated
  using (kurye_id = public.aktif_kurye_id());

-- ---------------------------------------------------------------- sipariş kolonları
alter table public.orders add column kurye_id uuid references public.kuryeler(id);
alter table public.orders add column yola_cikti_at timestamptz;
alter table public.orders add column teslim_edildi_at timestamptz;
alter table public.orders add column odeme_kapida_degisti boolean not null default false;
alter table public.orders add column mutabakat_id uuid references public.kurye_mutabakatlari(id);
create index orders_kurye_id_idx on public.orders (kurye_id) where mutabakat_id is null;

update public.orders set yola_cikti_at = updated_at where durum = 'yolda';
update public.orders set teslim_edildi_at = updated_at where durum = 'kapinda';

-- Yola çıkış/teslim zamanlarını tut; mutabakatı yapılmış siparişi kilitle.
create or replace function public.siparis_teslimat_alanlari()
returns trigger language plpgsql as $body$
begin
  if old.mutabakat_id is not null and (
       new.durum is distinct from old.durum
    or new.kurye_id is distinct from old.kurye_id
    or new.odeme_yontemi is distinct from old.odeme_yontemi
    or new.toplam is distinct from old.toplam
    or new.mutabakat_id is distinct from old.mutabakat_id) then
    raise exception '% numaralı siparişin kasa mutabakatı yapıldı; artık değiştirilemez.', old.id;
  end if;
  if new.durum is distinct from old.durum then
    new.yola_cikti_at := case when new.durum = 'yolda' then now()
                              when new.durum = 'kapinda' then coalesce(old.yola_cikti_at, now())
                              else null end;
    new.teslim_edildi_at := case when new.durum = 'kapinda' then now() else null end;
  end if;
  return new;
end;
$body$;

create trigger orders_teslimat_alanlari before update on public.orders
  for each row execute function public.siparis_teslimat_alanlari();

-- ---------------------------------------------------------------- kurye RLS
-- Kurye: kendisine atanmış siparişler + havuz (atanmamış, alındı/hazırlanıyor).
create policy orders_kurye_select on public.orders for select to authenticated
  using (
    kurye_id = public.aktif_kurye_id()
    or (kurye_id is null and durum in ('alindi', 'hazirlaniyor') and public.aktif_kurye_id() is not null)
  );
-- Alt sorgu orders'ın RLS'inden geçer: kurye yalnızca görebildiği siparişlerin kalemlerini görür.
create policy order_items_kurye_select on public.order_items for select to authenticated
  using (public.aktif_kurye_id() is not null and exists (select 1 from public.orders o where o.id = order_id));

-- ---------------------------------------------------------------- kurye işlemleri
create or replace function public.kurye_girisi()
returns jsonb language plpgsql security definer set search_path = public as $body$
declare
  v_telefon text;
  v_kurye   public.kuryeler%rowtype;
begin
  select public._telefon_normalize(phone) into v_telefon from auth.users where id = auth.uid();
  if v_telefon is null then
    raise exception 'Bu hesap telefonla açılmamış. Kurye ekranına kuryenin telefon numarasıyla girin.';
  end if;
  update public.kuryeler set user_id = auth.uid()
   where telefon = v_telefon and aktif and (user_id is null or user_id = auth.uid())
  returning * into v_kurye;
  if not found then
    raise exception 'Bu numara (%) kurye olarak tanımlı değil. Market yöneticisine iletin.', v_telefon;
  end if;
  return jsonb_build_object('id', v_kurye.id, 'ad', v_kurye.ad);
end;
$body$;

create or replace function public._kurye_zorunlu()
returns uuid language plpgsql stable security definer set search_path = public as $body$
declare
  v_id uuid := public.aktif_kurye_id();
begin
  if v_id is null then
    raise exception 'Bu işlem için kurye hesabı gerekli.';
  end if;
  return v_id;
end;
$body$;

create or replace function public.kurye_siparis_al(p_order_id text)
returns void language plpgsql security definer set search_path = public as $body$
begin
  update public.orders set kurye_id = public._kurye_zorunlu()
   where id = p_order_id and kurye_id is null and durum in ('alindi', 'hazirlaniyor');
  if not found then
    raise exception 'Bu sipariş başka bir kuryeye verildi ya da artık alınamaz.';
  end if;
end;
$body$;

create or replace function public.kurye_siparis_birak(p_order_id text)
returns void language plpgsql security definer set search_path = public as $body$
begin
  update public.orders set kurye_id = null
   where id = p_order_id and kurye_id = public._kurye_zorunlu() and durum in ('alindi', 'hazirlaniyor');
  if not found then
    raise exception 'Yola çıkmış sipariş bırakılamaz.';
  end if;
end;
$body$;

create or replace function public.kurye_yola_cik(p_order_id text)
returns void language plpgsql security definer set search_path = public as $body$
begin
  update public.orders set durum = 'yolda'
   where id = p_order_id and kurye_id = public._kurye_zorunlu() and durum in ('alindi', 'hazirlaniyor');
  if not found then
    raise exception 'Sipariş yola çıkarılamadı (iptal edilmiş ya da size ait değil).';
  end if;
end;
$body$;

create or replace function public.kurye_teslim_et(p_order_id text, p_odeme_yontemi text)
returns void language plpgsql security definer set search_path = public as $body$
begin
  if p_odeme_yontemi not in ('kapida_nakit', 'kapida_kart') then
    raise exception 'Geçersiz ödeme yöntemi.';
  end if;
  update public.orders
     set durum = 'kapinda',
         odeme_kapida_degisti = odeme_kapida_degisti or odeme_yontemi <> p_odeme_yontemi,
         odeme_yontemi = p_odeme_yontemi
   where id = p_order_id and kurye_id = public._kurye_zorunlu() and durum = 'yolda';
  if not found then
    raise exception 'Sipariş teslim edilemedi (iptal edilmiş ya da size ait değil).';
  end if;
end;
$body$;

-- ---------------------------------------------------------------- admin işlemleri
create or replace function public.kurye_ekle(p_telefon text, p_ad text)
returns uuid language plpgsql security definer set search_path = public as $body$
declare
  v_telefon text := public._telefon_normalize(p_telefon);
  v_id      uuid;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yetkiniz yok.';
  end if;
  if v_telefon is null then
    raise exception 'Geçerli bir cep telefonu numarası girin.';
  end if;
  if btrim(coalesce(p_ad, '')) = '' then
    raise exception 'Kurye adını girin.';
  end if;

  insert into public.kuryeler (ad, telefon) values (btrim(p_ad), v_telefon)
  on conflict (telefon) do update set ad = excluded.ad, aktif = true
  returning id into v_id;

  -- Bu numarayla daha önce giriş yapılmışsa hesabı hemen bağla.
  update public.kuryeler k set user_id = u.id
    from auth.users u
   where k.id = v_id and k.user_id is null
     and public._telefon_normalize(u.phone) = v_telefon
     and not exists (select 1 from public.kuryeler k2 where k2.user_id = u.id);
  return v_id;
end;
$body$;

create or replace function public.kurye_aktiflik(p_kurye_id uuid, p_aktif boolean)
returns void language plpgsql security definer set search_path = public as $body$
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yetkiniz yok.';
  end if;
  if not p_aktif and exists (select 1 from public.orders
                              where kurye_id = p_kurye_id and durum in ('alindi', 'hazirlaniyor', 'yolda')) then
    raise exception 'Kuryenin üzerinde teslim edilmemiş sipariş var; önce başka kuryeye atayın.';
  end if;
  update public.kuryeler set aktif = p_aktif where id = p_kurye_id;
end;
$body$;

-- p_siparis_idleri: admin'in ekranda gördüğü liste. Arada yeni teslimat
-- olduysa (ya da liste değiştiyse) hata verir, admin yenileyip tekrar dener.
create or replace function public.kurye_mutabakat_kapat(
  p_kurye_id uuid, p_siparis_idleri text[], p_teslim_edilen_nakit numeric,
  p_ucret_nakitten boolean, p_aciklama text default '')
returns uuid language plpgsql security definer set search_path = public as $body$
declare
  v_adet     integer := coalesce(array_length(p_siparis_idleri, 1), 0);
  v_uygun    integer;
  v_nakit    numeric(10,2);
  v_kart     numeric(10,2);
  v_ucret    numeric(10,2);
  v_beklenen numeric(10,2);
  v_id       uuid;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yetkiniz yok.';
  end if;
  if v_adet = 0 then
    raise exception 'Mutabakat için sipariş seçilmedi.';
  end if;
  if p_teslim_edilen_nakit is null or p_teslim_edilen_nakit < 0 then
    raise exception 'Teslim edilen nakit tutarını girin.';
  end if;

  perform 1 from public.orders where id = any(p_siparis_idleri) order by id for update;

  select count(*),
         coalesce(sum(o.toplam) filter (where o.odeme_yontemi = 'kapida_nakit'), 0),
         coalesce(sum(o.toplam) filter (where o.odeme_yontemi = 'kapida_kart'), 0),
         coalesce(sum(g.kurye_ucreti), 0)
    into v_uygun, v_nakit, v_kart, v_ucret
    from public.orders o
    left join public.siparis_giderleri g on g.order_id = o.id
   where o.id = any(p_siparis_idleri)
     and o.kurye_id = p_kurye_id and o.durum = 'kapinda' and o.mutabakat_id is null;

  if v_uygun <> v_adet or (select count(*) from public.orders o
                            where o.kurye_id = p_kurye_id and o.durum = 'kapinda'
                              and o.mutabakat_id is null) <> v_adet then
    raise exception 'Kuryenin teslimat listesi değişti. Sayfayı yenileyip tekrar deneyin.';
  end if;

  v_beklenen := v_nakit - case when p_ucret_nakitten then v_ucret else 0 end;

  insert into public.kurye_mutabakatlari (kurye_id, siparis_sayisi, nakit_tahsilat, kart_tahsilat, kurye_ucreti,
                                          ucret_nakitten_alindi, beklenen_nakit, teslim_edilen_nakit, fark,
                                          aciklama, created_by)
  values (p_kurye_id, v_adet, v_nakit, v_kart, v_ucret, p_ucret_nakitten, v_beklenen,
          p_teslim_edilen_nakit, p_teslim_edilen_nakit - v_beklenen, coalesce(p_aciklama, ''), auth.uid())
  returning id into v_id;

  update public.orders set mutabakat_id = v_id where id = any(p_siparis_idleri);
  return v_id;
end;
$body$;

revoke all on function public._telefon_normalize(text) from public, anon;
revoke all on function public._kurye_zorunlu() from public, anon, authenticated;
revoke all on function public.aktif_kurye_id() from public, anon;
revoke all on function public.kurye_girisi() from public, anon;
revoke all on function public.kurye_siparis_al(text) from public, anon;
revoke all on function public.kurye_siparis_birak(text) from public, anon;
revoke all on function public.kurye_yola_cik(text) from public, anon;
revoke all on function public.kurye_teslim_et(text, text) from public, anon;
revoke all on function public.kurye_ekle(text, text) from public, anon;
revoke all on function public.kurye_aktiflik(uuid, boolean) from public, anon;
revoke all on function public.kurye_mutabakat_kapat(uuid, text[], numeric, boolean, text) from public, anon;
grant execute on function public.aktif_kurye_id() to authenticated;
grant execute on function public.kurye_girisi() to authenticated;
grant execute on function public.kurye_siparis_al(text) to authenticated;
grant execute on function public.kurye_siparis_birak(text) to authenticated;
grant execute on function public.kurye_yola_cik(text) to authenticated;
grant execute on function public.kurye_teslim_et(text, text) to authenticated;
grant execute on function public.kurye_ekle(text, text) to authenticated;
grant execute on function public.kurye_aktiflik(uuid, boolean) to authenticated;
grant execute on function public.kurye_mutabakat_kapat(uuid, text[], numeric, boolean, text) to authenticated;
