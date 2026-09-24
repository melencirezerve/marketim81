'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Nav } from '@/components/Nav';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace('/login');
        return;
      }
      // Kurye de aynı alan adında SMS koduyla oturum açıyor; admin olmayan herkes kurye ekranına.
      const { data: profil } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).single();
      if (profil?.role !== 'admin') {
        router.replace('/kurye');
        return;
      }
      setChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login');
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (!checked) return null;

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl p-6">{children}</main>
    </>
  );
}
