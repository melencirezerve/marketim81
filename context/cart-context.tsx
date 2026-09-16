import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Product } from '@/data/products';

export type CartItem = {
  product: Product;
  miktar: number;
};

export type Order = {
  id: string;
  tarih: string;
  items: CartItem[];
  toplam: number;
};

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
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

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
    const order: Order = { id, tarih: new Date().toISOString(), items, toplam: totalPrice };
    setOrders((prev) => [order, ...prev]);
    setItems([]);
    return id;
  };

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
