-- Bu migration'ı Supabase SQL Editor'de çalıştırın.
-- Siparişleri (orders + order_items) mobil uygulamanın yazıp okuyabileceği
-- şekilde ekler. Mobil uygulama oturumsuz (anon key) çalıştığı için
-- sipariş "sahipliği" gerçek bir kullanıcıya değil, cihazda üretilip
-- AsyncStorage'da saklanan device_id'ye göre ayrılıyor. Bu, kimlik
-- doğrulaması değil, sadece "siparişlerim" listesini filtrelemek içindir;
-- ileride gerçek müşteri girişi eklenirse policy'ler sıkılaştırılmalı.

create table public.orders (
  id          text primary key,         -- ör. 'S81-482910', mobil tarafta üretiliyor
  device_id   text not null,
  durum       text not null default 'alindi'
                check (durum in ('alindi', 'hazirlaniyor', 'yolda', 'kapinda')),
  toplam      numeric(10,2) not null check (toplam >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index orders_device_id_idx on public.orders (device_id);

create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    text not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  ad          text not null,            -- sipariş anındaki ürün adı (snapshot)
  fiyat       numeric(10,2) not null check (fiyat >= 0),  -- sipariş anındaki fiyat (snapshot)
  gorsel_url  text not null default '',
  miktar      integer not null check (miktar > 0)
);
create index order_items_order_id_idx on public.order_items (order_id);

create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Mobil: kendi siparişini oluşturabilir, tüm siparişleri okuyup durumunu
-- güncelleyebilir (categories/products'taki gibi açık güven modeli — bu
-- uygulamada anon key'i paylaşan tüm cihazlar zaten aynı yetkiye sahip).
create policy orders_public_select on public.orders for select to anon using (true);
create policy orders_public_insert on public.orders for insert to anon with check (true);
create policy orders_public_update on public.orders for update to anon using (true) with check (true);
create policy orders_admin_all on public.orders for all to authenticated using (true) with check (true);

create policy order_items_public_select on public.order_items for select to anon using (true);
create policy order_items_public_insert on public.order_items for insert to anon with check (true);
create policy order_items_admin_all on public.order_items for all to authenticated using (true) with check (true);
