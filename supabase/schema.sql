-- Supabase SQL Editor'de çalıştırın (Dashboard -> SQL Editor -> New query).
-- Ürün/kategori yönetimi için: categories + products tabloları, updated_at trigger'ları, RLS policy'leri.

create extension if not exists "pgcrypto";

create table public.categories (
  id            text primary key,               -- slug, örn. 'firin', 'sut' (mobildeki routing ile aynı, değişmiyor)
  ad            text not null,
  icon          text not null default '',
  gorsel_url    text not null,
  sira          integer not null default 0,      -- görüntülenme sırası
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index categories_sira_idx on public.categories (sira);

create table public.products (
  id            uuid primary key default gen_random_uuid(),
  ad            text not null,
  fiyat         numeric(10,2) not null check (fiyat >= 0),
  stok          integer not null default 0 check (stok >= 0),
  barkod        text unique,
  category_id   text not null references public.categories(id) on delete restrict,
  alt_kategori  text not null default '',
  icon          text not null default '',
  gorsel_url    text not null,
  aktif         boolean not null default true,   -- silmeden gizleme (stok tükendi/kaldırıldı)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index products_category_id_idx on public.products (category_id);
create index products_aktif_idx on public.products (aktif);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.products enable row level security;

create policy categories_public_select on public.categories for select to anon, authenticated using (true);
create policy categories_admin_insert on public.categories for insert to authenticated with check (true);
create policy categories_admin_update on public.categories for update to authenticated using (true) with check (true);
create policy categories_admin_delete on public.categories for delete to authenticated using (true);

-- mobil uygulama sadece aktif ürünleri görür; admin panel hepsini görür/yönetir
create policy products_public_select_active on public.products for select to anon using (aktif = true);
create policy products_admin_select_all on public.products for select to authenticated using (true);
create policy products_admin_insert on public.products for insert to authenticated with check (true);
create policy products_admin_update on public.products for update to authenticated using (true) with check (true);
create policy products_admin_delete on public.products for delete to authenticated using (true);
