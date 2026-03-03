/**
 * BIOX - Contexto de Autenticación con Supabase
 * Sistema de autenticación completamente migrado a Supabase
 */

'use client';

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';

// ===============================================
// TIPOS DE DATOS
// ===============================================

interface User {
  id: string;
  email: string;
  nombre: string;
  rol: number;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ===============================================
// PROVIDER PRINCIPAL
// ===============================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  
  // Cliente de Supabase para browser - Lazy initialization
  const [supabase, setSupabase] = useState<ReturnType<typeof createSupabaseBrowserClient> | null>(null);
  
  // Inicializar cliente en useEffect para evitar SSR issues
  useEffect(() => {
    try {
      const client = createSupabaseBrowserClient();
      setSupabase(client);
    } catch (error) {
      console.error('Error inicializando Supabase client:', error);
      setLoading(false); // Si no hay Supabase, no cargar indefinidamente
    }
  }, []);
  
  // ===============================================
  // FUNCIONES DE SUPABASE
  // ===============================================

  const supabaseSignIn = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Cliente Supabase no disponible');
    }
    
    try {
      // Primero intentar con Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });
        
        const result = await response.json();
        
        if (!result.ok) {
          return { success: false, error: result.error || 'Credenciales inválidas' };
        }
        
        // Intentar obtener sesión de Supabase nuevamente (el usuario pudo haber sido migrado)
        const { data: newSession } = await supabase.auth.getSession();
        if (newSession?.session?.user) {
          await loadUserData(newSession.session.user.id);
        } else {
          // Si no hay sesión en Supabase, usar datos básicos
          throw new Error('Usuario autenticado pero no se pudo obtener sesión de Supabase');
        }
        
        return { success: true };
      }

      if (data.user) {
        // Login exitoso directo con Supabase
        await loadUserData(data.user.id);
        return { success: true };
      }

      return { success: false, error: 'No user data returned' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const supabaseSignOut = async () => {
    if (!supabase) return;
    
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
    }
  };

  const supabaseSignUp = async (email: string, password: string, name: string) => {
    if (!supabase) {
      throw new Error('Cliente Supabase no disponible');
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const refreshSession = async () => {
    // Evitar refrescos innecesarios si ya hay una carga en progreso
    if (isLoadingUser || !supabase) {
      console.log('Carga de usuario en progreso o cliente no disponible, omitiendo refresh...');
      return;
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('Refrescando sesión para el usuario:', session.user.id);
        await loadUserData(session.user.id);
      }
    } catch (error) {
      console.error('Error al refrescar la sesión:', error);
    }
  };

  const loadUserData = async (userId: string) => {
    // Evitar llamadas duplicadas
    if (isLoadingUser || !supabase) {
      console.log('Ya hay una carga de usuario en progreso o cliente no disponible, omitiendo...');
      return;
    }
    
    try {
      console.log('Iniciando loadUserData para el usuario:', userId);
      setIsLoadingUser(true);
      
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select(`
          id,
          email,
          nombre,
          rol
        `)
        .eq('id', userId)
        .maybeSingle();
      
      if (userError || !userData) {
        console.error('Error al cargar datos del usuario:', userError);
        throw userError;
      }

      setUser({
        id: userData.id,
        email: userData.email,
        nombre: userData.nombre,
        rol: userData.rol
      });
    } catch (error) {
      console.error('Error en loadUserData:', error);
      throw error;
    } finally {
      setIsLoadingUser(false);
    }
  }
            

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    let mounted = true;
    let authInitialized = false;
    
    const initAuth = async () => {
      try {
        console.log('Intentando recuperar la sesión de Supabase...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error al recuperar la sesión:', error);
          return;
        }

        console.log("Sessión recuperada:", session);

        if (mounted) {
          if (session?.user) {
            console.log('Sesión encontrada:', session);
            await loadUserData(session.user.id);
          } else {
            console.log('No se encontró una sesión activa.');
            setUser(null);
          }
          authInitialized = true;
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Auth session missing') {
          console.warn('No hay sesión activa para refrescar.');
        } else {
          console.error('Error al inicializar la autenticación:', error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          authInitialized = true;
        }
      }
    };

    initAuth();

    // Escuchar cambios de autenticación - solo para eventos importantes
    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Cambio en el estado de autenticación:', event);
      
      if (!mounted) return;
      
      // Esperar a que la inicialización termine para evitar race conditions
      if (!authInitialized) {
        console.log('Auth aún inicializando, omitiendo onAuthStateChange');
        return;
      }
      
      // Para evitar race conditions, debounce los eventos SIGNED_IN
      if (event === 'SIGNED_IN' && session?.user) {
        // Solo procesar si no hay una carga de usuario en progreso
        if (!isLoadingUser) {
          await loadUserData(session.user.id);
        } else {
          console.log('Carga de usuario ya en progreso, omitiendo onAuthStateChange');
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.subscription.unsubscribe();
    };
  }, [supabase]); // Dependencia: solo ejecutar cuando supabase esté disponible

  const authenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authenticated,
        signIn: supabaseSignIn,
        signOut: supabaseSignOut,
        signUp: supabaseSignUp,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ===============================================
// HOOKS DE USO
// ===============================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  return { user, loading };
}