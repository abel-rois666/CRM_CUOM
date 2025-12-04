// context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Referencia para detectar cambios reales en el token
  const lastTokenRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // 1. Carga inicial (Aquí SÍ mostramos loading)
    const initSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (initialSession) {
            setSession(initialSession);
            setUser(initialSession.user);
            lastTokenRef.current = initialSession.access_token;
            // Cargar perfil
            await fetchProfile(initialSession.user.id);
        }
      } catch (error) {
        console.error("Error inicializando sesión:", error);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // 2. Suscripción a cambios (Actualización SILENCIOSA)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      
      // Si el token es idéntico, no hacemos nada (evita re-renders al cambiar tabs)
      if (newSession?.access_token === lastTokenRef.current) {
          return; 
      }

      lastTokenRef.current = newSession?.access_token;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
          // CAMBIO CLAVE: Ya no activamos setLoading(true) aquí.
          // La actualización del perfil ocurre en segundo plano sin bloquear la UI.
          fetchProfile(newSession.user.id); 
      } else if (!newSession) {
          // Si es logout, limpiamos perfil
          setProfile(null);
          // Aquí tampoco hace falta loading, la redirección a Login la maneja App.tsx al ver session null
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
        const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
        if (error) {
            console.error('Error fetching profile:', error);
        } else {
            setProfile(data);
        }
    } catch (err) {
        console.error("Error crítico en perfil:", err);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    lastTokenRef.current = undefined;
  };
  
  const value = {
    session,
    user,
    profile,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};