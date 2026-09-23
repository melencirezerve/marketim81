-- Bu migration'ı Supabase SQL Editor'de çalıştırın.
-- Admin panelde barkod okuyucuyla mal kabul / sayım ve sipariş toplama.

-- Siparişin ürünleri barkodla okutularak toplandığı an. Toplanmadan
-- "Yolda"ya geçirilmek istenirse admin panel uyarır.
alter table public.orders add column toplandi_at timestamptz;

-- p_mod = 'ekle'  : mal kabul, stok = stok + miktar
-- p_mod = 'sayim' : sayım, stok = miktar
-- p_kalemler: [{"product_id": "<uuid>", "miktar": 12}, ...]
-- Tek işlemde ve satır kilidiyle çalışır; o sırada gelen siparişlerin stok
-- düşümü kaybolmaz (istemcide oku-hesapla-yaz yapılsaydı kaybolurdu).
create or replace function public.stok_guncelle(p_kalemler jsonb, p_mod text)
returns void language plpgsql security definer set search_path = public as $body$
declare
  v_kalem record;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yetkiniz yok.';
  end if;
  if p_mod not in ('ekle', 'sayim') then
    raise exception 'Geçersiz mod.';
  end if;

  for v_kalem in
    select (e->>'product_id')::uuid as product_id, sum((e->>'miktar')::int) as miktar
      from jsonb_array_elements(p_kalemler) e
     group by 1
     order by 1
  loop
    if v_kalem.miktar is null or v_kalem.miktar < 0 then
      raise exception 'Geçersiz adet.';
    end if;
    if p_mod = 'ekle' then
      update public.products set stok = stok + v_kalem.miktar where id = v_kalem.product_id;
    else
      update public.products set stok = v_kalem.miktar where id = v_kalem.product_id;
    end if;
  end loop;
end;
$body$;

revoke all on function public.stok_guncelle(jsonb, text) from public, anon;
grant execute on function public.stok_guncelle(jsonb, text) to authenticated;
