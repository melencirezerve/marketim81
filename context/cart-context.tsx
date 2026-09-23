import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import type { Product } from '@/context/catalog-context';
import type { OdemeYontemi } from '@/lib/odeme-yontemleri';
import { supabase } from '@/lib/supabase';
import { bildirimIzniIste, telefonBildirimiGoster } from '@/services/push-notifications';

export type CartItem = {
  product: Product;
  miktar: number;
};

export type OrderStatus = 'alindi' | 'hazirlaniyor' | 'yolda' | 'kapinda';

// Sipariş geçmişindeki ürün bilgisi sipariş anında "dondurulur" (snapshot):
// ürünün adı/fiyatı sonradan değişse veya ürün silinse bile geçmiş sipariş
// aynı kalır.
export type OrderItem = {
  productId: string;
  ad: string;
  fiyat: number;
  gorsel: string;
  miktar: number;
};

export type Order = {
  id: string;
  tarih: string;
  items: OrderItem[];
  toplam: number;
  durum: OrderStatus;
  odemeYontemi: OdemeYontemi;
};

export type AppNotification = {
  id: string;
  orderId: string;
  baslik: string;
  mesaj: string;
  tarih: string;
  okundu: boolean;
};

export type NotificationPreferenceKey = 'siparis' | 'kampanya' | 'urun' | 'uygulama';

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

const VARSAYILAN_BILDIRIM_TERCIHLERI: NotificationPreferences = {
  siparis: true,
  kampanya: true,
  urun: false,
  uygulama: true,
};

const DURUM_AKISI: { durum: OrderStatus; gecikmeMs: number; baslik: string; mesaj: (id: string) => string }[] = [
  {
    durum: 'hazirlaniyor',
    gecikmeMs: 8000,
    baslik: 'Siparişin Hazırlanıyor',
    mesaj: (id) => `${id} numaralı siparişiniz hazırlanıyor.`,
  },
  {
    durum: 'yolda',
    gecikmeMs: 10000,
    baslik: 'Siparişin Yola Çıktı',
    mesaj: (id) => `${id} numaralı siparişiniz kurye ile yola çıktı.`,
  },
  {
    durum: 'kapinda',
    gecikmeMs: 10000,
    baslik: 'Siparişin Kapında',
    mesaj: (id) => `${id} numaralı siparişiniz kapınızda!`,
  },
];

type CartContextValue = {
  items: CartItem[];
  addToCart: (product: Product) => void;
  increase: (productId: string) => void;
  decrease: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  totalCount: number;
  totalPrice: number;
  orders: Order[];
  placeOrder: (teslimatAdresi: string, odemeYontemi: OdemeYontemi) => Promise<string>;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  notificationPreferences: NotificationPreferences;
  setNotificationPreference: (key: NotificationPreferenceKey, value: boolean) => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationPreferences, setNotificationPreferencesState] = useState<NotificationPreferences>(
    VARSAYILAN_BILDIRIM_TERCIHLERI
  );
  const notificationPreferencesRef = useRef(notificationPreferences);
  const zamanlayicilar = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    notificationPreferencesRef.current = notificationPreferences;
  }, [notificationPreferences]);

  useEffect(() => {
    return () => {
      zamanlayicilar.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    bildirimIzniIste().catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }
    supabase
      .from('orders')
      .select('id, durum, toplam, odeme_yontemi, created_at, order_items(product_id, ad, fiyat, gorsel_url, miktar)')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error || !data) return;
        setOrders(
          data.map((o: any) => ({
            id: o.id,
            tarih: o.created_at,
            durum: o.durum,
            toplam: Number(o.toplam),
            odemeYontemi: o.odeme_yontemi,
            items: (o.order_items ?? []).map((it: any) => ({
              productId: it.product_id,
              ad: it.ad,
              fiyat: Number(it.fiyat),
              gorsel: it.gorsel_url,
              miktar: it.miktar,
            })),
          }))
        );
      });
  }, [user]);

  const setNotificationPreference = (key: NotificationPreferenceKey, value: boolean) => {
    setNotificationPreferencesState((prev) => ({ ...prev, [key]: value }));
  };

  const bildirimEkle = (orderId: string, baslik: string, mesaj: string, resimUrl?: string) => {
    if (!notificationPreferencesRef.current.siparis) return;
    const bildirim: AppNotification = {
      id: `${orderId}-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      orderId,
      baslik,
      mesaj,
      tarih: new Date().toISOString(),
      okundu: false,
    };
    setNotifications((prev) => [bildirim, ...prev]);
    telefonBildirimiGoster(baslik, mesaj, resimUrl).catch(() => {});
  };

  const addToCart = (product: Product) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, miktar: item.miktar + 1 } : item
        );
      }
      return [...prev, { product, miktar: 1 }];
    });
  };

  const increase = (productId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, miktar: item.miktar + 1 } : item
      )
    );
  };

  const decrease = (productId: string) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.product.id === productId ? { ...item, miktar: item.miktar - 1 } : item
        )
        .filter((item) => item.miktar > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const totalCount = useMemo(
    () => items.reduce((sum, item) => sum + item.miktar, 0),
    [items]
  );

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.miktar * item.product.fiyat, 0),
    [items]
  );

  const placeOrder = async (teslimatAdresi: string, odemeYontemi: OdemeYontemi) => {
    if (!user) throw new Error('Sipariş vermek için giriş yapmalısınız.');

    const id = `S81-${Math.floor(100000 + Math.random() * 900000)}`;
    const siparisKalemleri: OrderItem[] = items.map((item) => ({
      productId: item.product.id,
      ad: item.product.ad,
      fiyat: item.product.fiyat,
      gorsel: item.product.gorsel,
      miktar: item.miktar,
    }));
    const order: Order = {
      id,
      tarih: new Date().toISOString(),
      items: siparisKalemleri,
      toplam: totalPrice,
      durum: 'alindi',
      odemeYontemi,
    };
    const resimUrl = items[0]?.product.gorsel;

    const { error } = await supabase.from('orders').insert({
      id,
      customer_id: user.id,
      musteri_adi: profile?.ad ?? null,
      musteri_telefon: profile?.telefon ?? null,
      musteri_email: user.email ?? null,
      teslimat_adresi: teslimatAdresi,
      odeme_yontemi: odemeYontemi,
      durum: 'alindi',
      toplam: totalPrice,
    });
    if (error) throw new Error(error.message);
    await supabase.from('order_items').insert(
      siparisKalemleri.map((item) => ({
        order_id: id,
        product_id: item.productId,
        ad: item.ad,
        fiyat: item.fiyat,
        gorsel_url: item.gorsel,
        miktar: item.miktar,
      }))
    );

    setOrders((prev) => [order, ...prev]);
    setItems([]);
    bildirimEkle(id, 'Siparişin Alındı', `${id} numaralı siparişiniz alındı, hazırlanmaya başlanacak.`, resimUrl);

    let toplamGecikme = 0;
    DURUM_AKISI.forEach((asama) => {
      toplamGecikme += asama.gecikmeMs;
      const zamanlayici = setTimeout(() => {
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, durum: asama.durum } : o)));
        bildirimEkle(id, asama.baslik, asama.mesaj(id), resimUrl);
        supabase.from('orders').update({ durum: asama.durum }).eq('id', id).then(() => {});
      }, toplamGecikme);
      zamanlayicilar.current.push(zamanlayici);
    });

    return id;
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, okundu: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, okundu: true })));
  };

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.okundu).length,
    [notifications]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        increase,
        decrease,
        removeFromCart,
        totalCount,
        totalPrice,
        orders,
        placeOrder,
        notifications,
        unreadNotificationCount,
        markNotificationRead,
        markAllNotificationsRead,
        notificationPreferences,
        setNotificationPreference,
      }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart, CartProvider icinde kullanilmalidir');
  }
  return context;
}
