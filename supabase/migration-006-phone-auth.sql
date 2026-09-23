-- Bu migration'ı Supabase SQL Editor'de çalıştırın.
-- Mobil uygulamada giriş e-posta/şifre yerine telefon + SMS kodu (OTP) ile
-- yapılıyor (Supabase Auth → Phone provider, Vonage). Admin panel e-posta
-- ile girmeye devam ediyor.
--
-- Yeni kullanıcı açıldığında doğrulanmış telefon numarasını profile yaz.
-- auth.users.phone "+" olmadan saklanır (905xxxxxxxxx); profilde + ile tutuyoruz.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $body$
begin
  insert into public.profiles (id, telefon)
  values (new.id, case when coalesce(new.phone, '') <> '' then '+' || new.phone end);
  return new;
end;
$body$;
