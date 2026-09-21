-- Önce Dashboard -> Storage -> New bucket ile "catalog-images" adında, Public açık bir bucket oluşturun.
-- Sonra bu dosyayı SQL Editor'de çalıştırın.

create policy catalog_images_public_read on storage.objects for select to anon, authenticated using (bucket_id = 'catalog-images');
create policy catalog_images_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'catalog-images');
create policy catalog_images_admin_update on storage.objects for update to authenticated using (bucket_id = 'catalog-images');
create policy catalog_images_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'catalog-images');
