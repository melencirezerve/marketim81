import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';
import { useCatalog, type Product } from '@/context/catalog-context';
import type { OdemeYontemi } from '@/lib/odeme-yontemleri';
import { supabase } from '@/lib/supabase';
import { bildirimIzniIste, telefonBildirimiGoster } from '@/services/push-notifications';

export type CartItem = {
  product: Product;
  miktar: number;
};

export type OrderStatus = 'alindi' | 'hazirlaniyor' | 'yolda' | 'kapinda' | 'iptal';

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
  araToplam: number;
  teslimatUcreti: number;
  kampanyaAdi: string | null;
  indirim: number;
  toplam: number;
  durum: OrderStatus;
  odemeYontemi: OdemeYontemi;
  teslimatAdresi: string | null;
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

// Durumu admin panel değiştirir; müşteri Realtime ile anında görür ve bildirim alır.
const DURUM_BILDIRIMI: Partial<Record<OrderStatus, { baslik: string; mesaj: (id: string) => string }>> = {
  hazirlaniyor: {
    baslik: 'Siparişin Hazırlanıyor',
    mesaj: (id) => `${id} numaralı siparişiniz hazırlanıyor.`,
  },
  yolda: {
    baslik: 'Siparişin Yola Çıktı',
    mesaj: (id) => `${id} numaralı siparişiniz kurye ile yola çıktı.`,
  },
  kapinda: {
    baslik: 'Siparişin Kapında',
    mesaj: (id) => `${id} numaralı siparişiniz kapınızda!`,
  },
  iptal: {
    baslik: 'Siparişin İptal Edildi',
    mesaj: (id) => `${id} numaralı siparişiniz iptal edildi.`,
  },
};

const siparisSatiriniCevir = (o: any): Order => ({
  id: o.id,
  tarih: o.created_at,
  durum: o.durum,
  araToplam: Number(o.ara_toplam ?? o.toplam),
  teslimatUcreti: Number(o.teslimat_ucreti ?? 0),
  kampanyaAdi: o.kampanya_adi ?? null,
  indirim: Number(o.indirim_tutari ?? 0),
  toplam: Number(o.toplam),
  odemeYontemi: o.odeme_yontemi,
  teslimatAdresi: o.teslimat_adresi,
  items: (o.order_items ?? []).map((it: any) => ({
    productId: it.product_id,
    ad: it.ad,
    fiyat: Number(it.fiyat),
    gorsel: it.gorsel_url,
    miktar: it.miktar,
  })),
});

type CartContextValue = {
  items: CartItem[];
  addToCart: (product: Product, miktar?: number) => void;
  increase: (productId: string) => void;
  decrease: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  totalCount: number;
  totalPrice: number;
  orders: Order[];
  placeOrder: (adresId: string, odemeYontemi: OdemeYontemi) => Promise<string>;
  cancelOrder: (orderId: string) => Promise<void>;
  reorder: (order: Order) => number;
  notifications: AppNotification[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  notificationPreferences: NotificationPreferences;
  setNotificationPreference: (key: NotificationPreferenceKey, value: boolean) => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Oturum her yenilendiğinde user nesnesi değişir; abonelik ve yükleme kimliğe bağlı olsun.
  const userId = user?.id;
  const { products, refresh: katalogYenile } = useCatalog();
  const [items, setItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationPreferences, setNotificationPreferencesState] = useState<NotificationPreferences>(
    VARSAYILAN_BILDIRIM_TERCIHLERI
  );
  const notificationPreferencesRef = useRef(notificationPreferences);
  const kendiIptalim = useRef(new Set<string>());

  useEffect(() => {
    notificationPreferencesRef.current = notificationPreferences;
  }, [notificationPreferences]);

  useEffect(() => {
    bildirimIzniIste().catch(() => {});
  }, []);

  const siparisleriYukle = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('orders')
      .select(
        'id, durum, ara_toplam, teslimat_ucreti, kampanya_adi, indirim_tutari, toplam, odeme_yontemi, teslimat_adresi, created_at, order_items(product_id, ad, fiyat, gorsel_url, miktar)'
      )
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return;
    setOrders(data.map(siparisSatiriniCevir));
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setOrders([]);
      return;
    }
    siparisleriYukle();

    const kanal = supabase
      // Benzersiz ad: supabase.channel() aynı adlı kanal varsa onu döndürür; önceki
      // abonelik henüz kaldırılırken aynı adla açılırsa yeni abonelik hiç kurulmuyordu.
      .channel(`siparislerim-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `customer_id=eq.${userId}` },
        (payload) => {
          const yeni = payload.new as { id: string; durum: OrderStatus };
          setOrders((prev) => prev.map((o) => (o.id === yeni.id ? { ...o, durum: yeni.durum } : o)));
          // Müşterinin kendi iptali için bildirim gösterme (ekranda zaten görüyor).
          if (yeni.durum === 'iptal' && kendiIptalim.current.has(yeni.id)) return;
          const bildirim = DURUM_BILDIRIMI[yeni.durum];
          if (bildirim) bildirimEkle(yeni.id, bildirim.baslik, bildirim.mesaj(yeni.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(kanal);
    };
    // bildirimEkle yalnızca ref ve setState kullanıyor; her render'da yeniden abone olmamak için deps dışında.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, siparisleriYukle]);

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

  // Katalogdaki güncel stok; sepetteki ürün nesnesi eklendiği andaki kopya olabilir.
  const stokBul = (product: Product) => products.find((p) => p.id === product.id)?.stok ?? product.stok;

  const addToCart = (product: Product, miktar = 1) => {
    const stok = stokBul(product);
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      const yeniMiktar = Math.min((existing?.miktar ?? 0) + miktar, stok);
      if (yeniMiktar <= 0) return prev;
      if (existing) {
        return prev.map((item) => (item.product.id === product.id ? { ...item, miktar: yeniMiktar } : item));
      }
      return [...prev, { product, miktar: yeniMiktar }];
    });
  };

  const increase = (productId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId && item.miktar < stokBul(item.product)
          ? { ...item, miktar: item.miktar + 1 }
          : item
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

  const placeOrder = async (adresId: string, odemeYontemi: OdemeYontemi) => {
    if (!user) throw new Error('Sipariş vermek için giriş yapmalısınız.');

    // Fiyat, toplam, teslimat ücreti ve stok kontrolü sunucuda (siparis_olustur).
    const { data: id, error } = await supabase.rpc('siparis_olustur', {
      p_kalemler: items.map((item) => ({ product_id: item.product.id, miktar: item.miktar })),
      p_adres_id: adresId,
      p_odeme_yontemi: odemeYontemi,
    });
    if (error) {
      // Stok/fiyat hatasıysa uygulamadaki katalog eskimiş olabilir.
      katalogYenile();
      throw new Error(error.message);
    }

    const resimUrl = items[0]?.product.gorsel;
    setItems([]);
    await siparisleriYukle();
    katalogYenile();
    bildirimEkle(id, 'Siparişin Alındı', `${id} numaralı siparişiniz alındı, hazırlanmaya başlanacak.`, resimUrl);
    return id as string;
  };

  const cancelOrder = async (orderId: string) => {
    kendiIptalim.current.add(orderId);
    const { error } = await supabase.rpc('siparis_iptal', { p_order_id: orderId });
    if (error) {
      kendiIptalim.current.delete(orderId);
      throw new Error(error.message);
    }
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, durum: 'iptal' } : o)));
    katalogYenile();
  };

  // Siparişteki hâlâ satışta olan ürünleri sepete ekler; hiç ya da tam
  // eklenemeyen (tükenmiş / stok yetersiz) kalem sayısını döner.
  const reorder = (order: Order) => {
    let eksik = 0;
    order.items.forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product || product.stok <= 0) {
        eksik++;
        return;
      }
      if (product.stok < item.miktar) eksik++;
      addToCart(product, item.miktar);
    });
    return eksik;
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
        cancelOrder,
        reorder,
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
