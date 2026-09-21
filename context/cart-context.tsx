import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Product } from '@/context/catalog-context';
import { bildirimIzniIste, telefonBildirimiGoster } from '@/services/push-notifications';

export type CartItem = {
  product: Product;
  miktar: number;
};

export type OrderStatus = 'alindi' | 'hazirlaniyor' | 'yolda' | 'kapinda';

export type Order = {
  id: string;
  tarih: string;
  items: CartItem[];
  toplam: number;
  durum: OrderStatus;
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
  placeOrder: () => string;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  notificationPreferences: NotificationPreferences;
  setNotificationPreference: (key: NotificationPreferenceKey, value: boolean) => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
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

  const placeOrder = () => {
    const id = `S81-${Math.floor(100000 + Math.random() * 900000)}`;
    const order: Order = { id, tarih: new Date().toISOString(), items, toplam: totalPrice, durum: 'alindi' };
    const resimUrl = items[0]?.product.gorsel;
    setOrders((prev) => [order, ...prev]);
    setItems([]);
    bildirimEkle(id, 'Siparişin Alındı', `${id} numaralı siparişiniz alındı, hazırlanmaya başlanacak.`, resimUrl);

    let toplamGecikme = 0;
    DURUM_AKISI.forEach((asama) => {
      toplamGecikme += asama.gecikmeMs;
      const zamanlayici = setTimeout(() => {
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, durum: asama.durum } : o)));
        bildirimEkle(id, asama.baslik, asama.mesaj(id), resimUrl);
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
