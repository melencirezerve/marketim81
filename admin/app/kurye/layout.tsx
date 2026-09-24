import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Marketim81 Kurye',
  description: 'Kurye teslimat ekranı',
};

export const viewport: Viewport = {
  themeColor: '#059669',
};

export default function KuryeLayout({ children }: { children: ReactNode }) {
  return children;
}
