-- Bu migration'ı Supabase SQL Editor'de çalıştırın.
-- Ürünlerin tek kategori yerine birden fazla kategoriye ait olabilmesini sağlar.
-- Mevcut 61 ürünün mevcut tek kategorisi otomatik olarak yeni tabloya taşınır, veri kaybı olmaz.

create table public.product_categories (
  product_id   uuid not null references public.products(id) on delete cascade,
  category_id  text not null references public.categories(id) on delete restrict,
  primary key (product_id, category_id)
);
create index product_categories_category_id_idx on public.product_categories (category_id);

alter table public.product_categories enable row level security;

create policy product_categories_public_select on public.product_categories for select to anon, authenticated using (true);
create policy product_categories_admin_insert on public.product_categories for insert to authenticated with check (true);
create policy product_categories_admin_delete on public.product_categories for delete to authenticated using (true);

-- Mevcut products.category_id değerlerini yeni tabloya kopyala
insert into public.product_categories (product_id, category_id)
select id, category_id from public.products;

-- Artık gereksiz olan eski tekli kategori kolonunu kaldır
alter table public.products drop column category_id;
