-- Bu migration'ı Supabase SQL Editor'de çalıştırın.
-- Gerçek müşteri hesabı/girişi (e-posta + şifre, Supabase Auth) ekler:
-- profiles (rol ayrımı için — admin panel kullanıcıları ile market
-- müşterilerini ayırt etmek şart, yoksa bir müşteri kendi hesabıyla admin
-- panele girip ürün silebilir/tüm siparişleri görebilir), addresses
-- (müşteriye bağlı gerçek adres defteri) ve orders/order_items'a müşteri
-- kimliği + teslimat adresi snapshot'ı.
--
-- ÖNEMLİ: Bu migration'ı, mobil uygulamadan hiçbir müşteri kayıt olmadan
-- ÖNCE çalıştırın. Çalıştığı anda auth.users'daki TÜM mevcut kullanıcılar
-- (yani sadece sizin admin panel hesabınız) role='admin' olarak işaretlenir;
-- bundan sonra kaydolacak her yeni kullanıcı (mobil müşteriler) varsayılan
-- olarak role='customer' olur.

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  ad          text,
  telefon     text,
  created_at  timestamptz not null default now()
);

-- Yeni auth.users kaydı oluştuğunda otomatik profiles satırı aç.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $body$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$body$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mevcut kullanıcıları (şu an yalnızca admin panel hesapları) geriye dönük
-- profiles'a işle ve admin yap.
insert into public.profiles (id, role)
select id, 'admin' from auth.users
on conflict (id) do nothing;
update public.profiles set role = 'admin';

-- RLS'de "authenticated = admin" varsayımından "authenticated = müşteri
-- OLABİLİR" e geçtiğimiz için admin kontrolünü rol üzerinden yapan bir
-- fonksiyon gerekiyor (profiles'a RLS içinden bakarken sonsuz döngüye
-- girmemek için security definer).
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $body$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$body$;

alter table public.profiles enable row level security;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_select_all on public.profiles for select to authenticated using (public.is_admin());

-- Adresler artık cihazda değil, hesaba bağlı gerçek bir tabloda.
create table public.addresses (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references auth.users(id) on delete cascade,
  baslik       text not null,
  mahalle      text not null check (mahalle in ('Orta', 'Çevrik', 'Yeni', 'Yaka', 'Mehmet Akif')),
  sokak        text not null,
  bina_no      text not null,
  daire_no     text not null default '',
  varsayilan   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index addresses_customer_id_idx on public.addresses (customer_id);

alter table public.addresses enable row level security;
create policy addresses_own_select on public.addresses for select to authenticated using (customer_id = auth.uid());
create policy addresses_own_insert on public.addresses for insert to authenticated with check (customer_id = auth.uid());
create policy addresses_own_update on public.addresses for update to authenticated using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy addresses_own_delete on public.addresses for delete to authenticated using (customer_id = auth.uid());
create policy addresses_admin_select on public.addresses for select to authenticated using (public.is_admin());

-- categories/products/product_categories: eskiden "authenticated = admin
-- panel" varsayımıyla açık bırakılmıştı (bkz. schema.sql, migration-001).
-- Artık müşteriler de authenticated olabildiği için bunu is_admin()'e sıkıyoruz.
drop policy categories_admin_insert on public.categories;
drop policy categories_admin_update on public.categories;
drop policy categories_admin_delete on public.categories;
create policy categories_admin_insert on public.categories for insert to authenticated with check (public.is_admin());
create policy categories_admin_update on public.categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy categories_admin_delete on public.categories for delete to authenticated using (public.is_admin());

drop policy products_admin_select_all on public.products;
drop policy products_admin_insert on public.products;
drop policy products_admin_update on public.products;
drop policy products_admin_delete on public.products;
create policy products_admin_select_all on public.products for select to authenticated using (public.is_admin());
create policy products_admin_insert on public.products for insert to authenticated with check (public.is_admin());
create policy products_admin_update on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy products_admin_delete on public.products for delete to authenticated using (public.is_admin());

drop policy product_categories_admin_insert on public.product_categories;
drop policy product_categories_admin_delete on public.product_categories;
create policy product_categories_admin_insert on public.product_categories for insert to authenticated with check (public.is_admin());
create policy product_categories_admin_delete on public.product_categories for delete to authenticated using (public.is_admin());

-- orders/order_items: artık gerçek müşteri hesabına bağlı. Eski anon
-- (device_id tabanlı, oturumsuz) policy'leri kaldırıyoruz — sipariş vermek
-- için giriş şart oluyor. device_id kolonu geçmiş kayıtlar için duruyor
-- ama artık zorunlu değil.
alter table public.orders alter column device_id drop not null;
alter table public.orders add column customer_id uuid references auth.users(id);
alter table public.orders add column musteri_adi text;
alter table public.orders add column musteri_telefon text;
alter table public.orders add column teslimat_adresi text;
create index orders_customer_id_idx on public.orders (customer_id);

drop policy orders_public_select on public.orders;
drop policy orders_public_insert on public.orders;
drop policy orders_public_update on public.orders;
-- migration-002'de "authenticated = admin panel" varsayımıyla açılmıştı,
-- artık is_admin() kontrolüyle yeniden oluşturuyoruz.
drop policy orders_admin_all on public.orders;
create policy orders_own_select on public.orders for select to authenticated using (customer_id = auth.uid());
create policy orders_own_insert on public.orders for insert to authenticated with check (customer_id = auth.uid());
-- Mobil uygulamadaki sahte durum ilerlemesi (bkz. cart-context.tsx
-- DURUM_AKISI) kendi siparişinin durumunu güncelleyebilsin diye:
create policy orders_own_update_durum on public.orders for update to authenticated
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy orders_admin_all on public.orders for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy order_items_public_select on public.order_items;
drop policy order_items_public_insert on public.order_items;
drop policy order_items_admin_all on public.order_items;
create policy order_items_own_select on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
create policy order_items_own_insert on public.order_items for insert to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
create policy order_items_admin_all on public.order_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
