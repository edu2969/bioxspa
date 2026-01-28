/**
 * BIOX - Contexto de Autenticación con Supabase
 * Sistema de autenticación completamente migrado a Supabase
 */

'use client';

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MigrationLogger } from '@/lib/migration-utils';

// ===============================================
// TIPOS DE DATOS
// ===============================================

interface User {
  id: string;
  email: string;
  nombre: string;
}

interface Cargo {
  id: string;
  dependenciaId: string;
  tipo: number;
  sucursal?: {
    id: string;
    nombre: string;
  };
}

interface AuthState {
  user: User | null;
  cargos: Cargo[];
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
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ===============================================
  // FUNCIONES DE SUPABASE
  // ===============================================

  const supabaseSignIn = async (email: string, password: string) => {
    try {
      MigrationLogger.info('Attempting Supabase login', { email });
      
      // Primero intentar con Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        MigrationLogger.error('Supabase login failed', error);
        
        // Si falla Supabase, intentar con el endpoint de migración
        MigrationLogger.info('Attempting fallback login with migration', { email });
        
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });
        
        const result = await response.json();
        
        if (!result.ok) {
          MigrationLogger.error('Migration login also failed', result.error);
          return { success: false, error: result.error || 'Credenciales inválidas' };
        }
        
        // Login exitoso con migración
        MigrationLogger.success('Migration login successful');
        
        // Intentar obtener sesión de Supabase nuevamente (el usuario pudo haber sido migrado)
        const { data: newSession } = await supabase.auth.getSession();
        if (newSession?.session?.user) {
          await loadUserData(newSession.session.user.id);
        } else {
          // Si no hay sesión en Supabase, usar datos básicos
          setUser({
            id: result.data?.user?.id || 'temp-id',
            email: email,
            nombre: result.data?.user?.name || email
          });
        }
        
        return { success: true };
      }

      if (data.user) {
        // Login exitoso directo con Supabase
        await loadUserData(data.user.id);
        MigrationLogger.success('Supabase login successful', data.user);
        return { success: true };
      }

      return { success: false, error: 'No user data returned' };
    } catch (error: any) {
      MigrationLogger.error('Supabase login error', error);
      return { success: false, error: error.message };
    }
  };

  const supabaseSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setCargos([]);
      MigrationLogger.info('Supabase logout successful');
    } catch (error) {
      MigrationLogger.error('Supabase logout error', error);
    }
  };

  const supabaseSignUp = async (email: string, password: string, name: string) => {
    try {
      MigrationLogger.info('Attempting Supabase registration', { email });
      
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
        MigrationLogger.error('Supabase registration failed', error);
        return { success: false, error: error.message };
      }

      MigrationLogger.success('Supabase registration successful', { userId: data.user?.id });
      return { success: true };
    } catch (error: any) {
      MigrationLogger.error('Supabase registration error', error);
      return { success: false, error: error.message };
    }
  };

  const refreshSession = async () => {
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
    try {
      console.log('Iniciando loadUserData para el usuario:', userId);
      // Obtener usuario completo con sus cargos
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select(`
          id,
          email,
          nombre,
          cargos (
            tipo,
            sucursal_id,
            dependencia_id,
            desde,
            hasta,
            sucursales (id, nombre, codigo)
          )
        `)
        .eq('id', userId)
        .is('cargos.hasta', null) // Solo cargos activos
        .single();

      console.log("USER loadUserData --------------->", userData, userError);
      
      if (userError) {
        MigrationLogger.error('Error loading user data from Supabase', userError);
        
        // Fallback: usar datos básicos del auth
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser({
            id: user.id,
            email: user.email || '',
            nombre: user.user_metadata?.name || user.email || ''
          });
        }
        setCargos([]);
        return;
      }

      // Establecer datos del usuario
      setUser({
        id: userData.id,
        email: userData.email,
        nombre: userData.nombre
      });

      // Establecer cargos con información completa
      setCargos(
        (userData.cargos || []).map((cargo: any) => ({
          id: cargo.id || '', // Provide a default or map the correct field
          dependenciaId: cargo.dependencia_id || '', // Map the correct field
          tipo: cargo.tipo,
          sucursal: cargo.sucursales
            ? {
                id: cargo.sucursales.id,
                nombre: cargo.sucursales.nombre,
              }
            : undefined,
        }))
      );
      
      console.log('Cargos cargados desde Supabase:', userData.cargos);
      
      MigrationLogger.success('User data loaded successfully', { 
        userId: userData.id,
        cargosCount: userData.cargos?.length || 0 
      });
      
    } catch (error) {
      console.error('Error en loadUserData:', error);
      // Fallback básico
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser({
          id: user.id,
          email: user.email || '',
          nombre: user.user_metadata?.name || user.email || ''
        });
      }
      setCargos([]);
    }
  };

  // ===============================================
  // EFECTOS
  // ===============================================

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('Intentando recuperar la sesión de Supabase...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error al recuperar la sesión:', error);
          return;
        }

        if (session?.user) {
          console.log('Sesión encontrada:', session);
          await loadUserData(session.user.id);
        } else {
          console.log('No se encontró una sesión activa.');
          setUser(null);
          setCargos([]);
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Auth session missing') {
          console.warn('No hay sesión activa para refrescar.');
        } else {
          console.error('Error al inicializar la autenticación:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Escuchar cambios de autenticación
    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Cambio en el estado de autenticación:', event);
      if (session?.user) {
        await loadUserData(session.user.id);
      } else {
        setUser(null);
        setCargos([]);
      }
      setLoading(false);
    });

    return () => subscription?.subscription.unsubscribe();
  }, []);

  const authenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        cargos,
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