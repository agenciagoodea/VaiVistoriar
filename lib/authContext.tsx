
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

type UserRole = 'ADMIN' | 'BROKER' | 'PJ';

interface UserProfile {
  full_name: string;
  avatar_url: string;
  email: string;
  subscription_expires_at?: string | null;
  current_session_id?: string | null;
}

interface AuthContextValue {
  session: Session | null;
  role: UserRole;
  status: string;
  userProfile: UserProfile | null;
  loading: boolean;
  daysRemaining: number | null;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  role: 'ADMIN',
  status: 'Ativo',
  userProfile: null,
  loading: true,
  daysRemaining: null,
});

const CACHE_KEY_ROLE = 'vvist_role';
const CACHE_KEY_STATUS = 'vvist_status';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(
    () => (localStorage.getItem(CACHE_KEY_ROLE) as UserRole) || 'ADMIN'
  );
  const [status, setStatus] = useState<string>(
    () => localStorage.getItem(CACHE_KEY_STATUS) || 'Ativo'
  );
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  const loadProfile = useCallback(async (sess: Session | null) => {
    setSession(sess);

    if (!sess?.user) {
      // Limpar cache ao deslogar
      localStorage.removeItem(CACHE_KEY_ROLE);
      localStorage.removeItem(CACHE_KEY_STATUS);
      setLoading(false);
      return;
    }

    // Buscar apenas colunas necessárias — query mínima
    const { data: profile } = await supabase
      .from('broker_profiles')
      .select('role, status, full_name, avatar_url, subscription_expires_at, current_session_id')
      .eq('user_id', sess.user.id)
      .single();

    if (profile) {
      const resolvedRole = (profile.role as UserRole) || 'BROKER';
      const resolvedStatus = profile.status || 'Ativo';

      setRole(resolvedRole);
      setStatus(resolvedStatus);

      // Persistir em cache para evitar spinner no reload
      localStorage.setItem(CACHE_KEY_ROLE, resolvedRole);
      localStorage.setItem(CACHE_KEY_STATUS, resolvedStatus);

      setUserProfile({
        full_name: profile.full_name || sess.user.email?.split('@')[0] || 'Usuário',
        avatar_url:
          profile.avatar_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            profile.full_name || sess.user.email || ''
          )}&background=0D8ABC&color=fff`,
        email: sess.user.email || '',
        subscription_expires_at: profile.subscription_expires_at,
        current_session_id: profile.current_session_id,
      });

      // Calcular dias restantes do plano
      if (profile.subscription_expires_at) {
        const expiresAt = new Date(profile.subscription_expires_at);
        const diff = expiresAt.getTime() - Date.now();
        setDaysRemaining(Math.ceil(diff / (1000 * 60 * 60 * 24)));
      }
    } else if (sess.user.user_metadata?.role) {
      const metaRole = sess.user.user_metadata.role as UserRole;
      setRole(metaRole);
      setStatus('Ativo');
      localStorage.setItem(CACHE_KEY_ROLE, metaRole);
      localStorage.setItem(CACHE_KEY_STATUS, 'Ativo');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // Única chamada getSession — inicializa o estado
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadProfile(session);
    });

    // Escuta mudanças de auth — filtra apenas eventos relevantes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.location.hash = '#/reset-password';
        return;
      }
      // Só recarrega perfil em eventos que realmente mudam o estado
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
        loadProfile(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  return (
    <AuthContext.Provider value={{ session, role, status, userProfile, loading, daysRemaining }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
