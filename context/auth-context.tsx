import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { OdemeYontemi } from '@/lib/odeme-yontemleri';
import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  role: 'customer' | 'admin';
  ad: string | null;
  telefon: string | null;
  tercih_odeme_yontemi: OdemeYontemi;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  // Telefon + SMS kodu (OTP) ile giriş; ilk girişte hesap otomatik açılır.
  sendOtp: (telefon: string) => Promise<string | null>;
  verifyOtp: (telefon: string, kod: string) => Promise<{ error: string | null; adGerekli: boolean }>;
  setAd: (ad: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<string | null>;
  setTercihOdemeYontemi: (yontem: OdemeYontemi) => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile((data as Profile) ?? null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) loadProfile(newSession.user.id);
      else setProfile(null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const sendOtp = async (telefon: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone: telefon });
    return error ? error.message : null;
  };

  const verifyOtp = async (telefon: string, kod: string) => {
    const { data, error } = await supabase.auth.verifyOtp({ phone: telefon, token: kod, type: 'sms' });
    if (error || !data.user) return { error: error?.message ?? 'Doğrulama başarısız.', adGerekli: false };
    const { data: p } = await supabase.from('profiles').select('ad').eq('id', data.user.id).single();
    return { error: null, adGerekli: !p?.ad?.trim() };
  };

  const setAd = async (ad: string) => {
    if (!session) return 'Giriş yapmalısınız.';
    const { error } = await supabase.from('profiles').update({ ad }).eq('id', session.user.id);
    if (error) return error.message;
    setProfile((prev) => (prev ? { ...prev, ad } : prev));
    return null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Kişisel veriler silinir, sipariş kayıtları anonimleşir (bkz. migration-007 hesabimi_sil).
  const deleteAccount = async () => {
    const { error } = await supabase.rpc('hesabimi_sil');
    if (error) return error.message;
    await supabase.auth.signOut();
    return null;
  };

  const setTercihOdemeYontemi = async (yontem: OdemeYontemi) => {
    if (!session) return 'Giriş yapmalısınız.';
    const { error } = await supabase
      .from('profiles')
      .update({ tercih_odeme_yontemi: yontem })
      .eq('id', session.user.id);
    if (error) return error.message;
    setProfile((prev) => (prev ? { ...prev, tercih_odeme_yontemi: yontem } : prev));
    return null;
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, profile, loading, sendOtp, verifyOtp, setAd, signOut, deleteAccount, setTercihOdemeYontemi }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
