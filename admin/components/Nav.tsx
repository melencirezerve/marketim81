'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  const linkClass = (href: string) =>
    `rounded-lg px-3 py-2 text-sm font-medium ${
      pathname?.startsWith(href) ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
    }`;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <span className="text-lg font-extrabold text-gray-900">Siparis81 Admin</span>
        <div className="flex items-center gap-2">
          <Link href="/orders" className={linkClass('/orders')}>
            Siparişler
          </Link>
          <Link href="/products" className={linkClass('/products')}>
            Ürünler
          </Link>
          <Link href="/stock" className={linkClass('/stock')}>
            Stok
          </Link>
          <Link href="/categories" className={linkClass('/categories')}>
            Kategoriler
          </Link>
          <Link href="/settings" className={linkClass('/settings')}>
            Ayarlar
          </Link>
          <button
            onClick={handleSignOut}
            className="ml-4 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
            Çıkış Yap
          </button>
        </div>
      </div>
    </nav>
  );
}
