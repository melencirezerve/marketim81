-- Bu migration'ı Supabase SQL Editor'de çalıştırın.
-- migration-003 ile müşteriler de "authenticated" rolüne geçti ama iki yer
-- buna göre güncellenmemişti:
--
-- 1) products: aktif ürünleri yalnızca anon okuyabiliyordu. Giriş yapmış
--    müşteri uygulamayı açınca (veya siparişten sonra katalog yenilenince)
--    market boş görünüyordu.
-- 2) storage (catalog-images): "authenticated = admin panel" varsayımı
--    kalmıştı; her müşteri ürün/kategori görsellerini yükleyip, değiştirip
--    silebiliyordu.

create policy products_customer_select_active on public.products
  for select to authenticated using (aktif = true);

drop policy catalog_images_admin_insert on storage.objects;
drop policy catalog_images_admin_update on storage.objects;
drop policy catalog_images_admin_delete on storage.objects;
create policy catalog_images_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'catalog-images' and public.is_admin());
create policy catalog_images_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'catalog-images' and public.is_admin());
create policy catalog_images_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'catalog-images' and public.is_admin());
