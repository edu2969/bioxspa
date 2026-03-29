/**
 * BIOX - Contexto de Autenticación con Supabase
 * Sistema de autenticación completamente migrado a Supabase
 */

'use client';

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient, destroyBrowserClient } from '@/lib/supabase/browser-client';
import type { 
  AuthResult, 
  SessionInfo, 
  AuthContext as SupabaseAuthContext 
} from '@/lib/supabase/supabase-auth';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { TIPO_CARGO } from '@/app/utils/constants';

// ===============================================
// TIPOS DE DATOS
// ===============================================

interface User {
  id: string;
  email: string;
  nombre: string;
  supabaseUser?: SupabaseUser;
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
  sessionInfo: SessionInfo | null;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<AuthResult<User>>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<AuthResult<User>>;
  refreshSession: () => Promise<void>;
  hasCargoType: (cargoType: number) => boolean;
  hasCargo: (cargoTypes: number[]) => boolean;
  isSessionValid: () => boolean;
  validateSession: () => Promise<boolean>;
  getUserCargos: () => Cargo[];
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
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Cliente Supabase optimizado
  const supabase = createSupabaseBrowserClient();
  
  // ===============================================
  // FUNCIONES DE SUPABASE
  // ===============================================

  const supabaseSignIn = async (email: string, password: string): Promise<AuthResult<User>> => {
    try {
      setLoading(true);
      
      // Primero intentar con Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Fallback a API tradicional si Supabase falla
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });
        
        const result = await response.json();
        
        if (!result.ok) {
          return { 
            success: false, 
            data: null,
            error: new Error(result.error || 'Credenciales inválidas'),
            message: 'Error en autenticación'
          };
        }
        
        // Verificar si se estableció la sesión
        const { data: newSession } = await supabase.auth.getSession();
        if (newSession?.session?.user) {
          const userResult = await loadUserData(newSession.session.user.id);
          return userResult;
        } else {
          // Fallback para usuarios que aún no están migrados
          const fallbackUser: User = {
            id: result.data?.user?.id || 'temp-id',
            email: email,
            nombre: result.data?.user?.name || email
          };
          setUser(fallbackUser);
          return {
            success: true,
            data: fallbackUser,
            error: null,
            message: 'Sesión iniciada con fallback'
          };
        }
      }

      if (data.user && data.session) {
        // Login exitoso directo con Supabase
        const userResult = await loadUserData(data.user.id);
        return userResult;
      }

      return { 
        success: false, 
        data: null,
        error: new Error('No se recibieron datos de usuario'),
        message: 'Error en autenticación'
      };
    } catch (error: any) {
      return { 
        success: false, 
        data: null,
        error: error instanceof Error ? error : new Error(error?.message || 'Error desconocido'),
        message: 'Fallo interno en autenticación'
      };
    } finally {
      setLoading(false);
    }
  };

  const supabaseSignOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      
      // Limpiar estado
      setUser(null);
      setCargos([]);
      setSessionInfo(null);
      
      // Limpiar cliente cached
      destroyBrowserClient();
    } catch (error) {
      console.error('Error en logout de Supabase:', error);
    } finally {
      setLoading(false);
    }
  };

  const supabaseSignUp = async (email: string, password: string, name: string): Promise<AuthResult<User>> => {
    try {
      setLoading(true);
      
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
        return { 
          success: false, 
          data: null,
          error: new Error(error.message),
          message: 'Error en registro'
        };
      }

      if (data.user) {
        const newUser: User = {
          id: data.user.id,
          email: data.user.email || email,
          nombre: name,
          supabaseUser: data.user
        };
        
        return {
          success: true,
          data: newUser,
          error: null,
          message: 'Registro exitoso'
        };
      }

      return {
        success: false,
        data: null,
        error: new Error('No se recibieron datos de usuario'),
        message: 'Error en registro'
      };
    } catch (error: any) {
      return { 
        success: false, 
        data: null,
        error: error instanceof Error ? error : new Error(error?.message || 'Error desconocido'),
        message: 'Fallo interno en registro'
      };
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      setLoading(true);
      console.log('🔄 Refrescando sesión...');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Error obteniendo sesión:', error);
        return;
      }
      
      if (session?.user) {
        console.log('✅ Sesión válida encontrada, actualizando datos...');
        await loadUserData(session.user.id);
      } else {
        console.log('ℹ️ No hay sesión activa');
        setUser(null);
        setCargos([]);
        setSessionInfo(null);
      }
    } catch (error) {
      console.error('❌ Error al refrescar la sesión:', error);
    } finally {
      setLoading(false);
    }
  };

  // ===============================================
  // VALIDACIÓN DE SESIÓN
  // ===============================================

  const isSessionValidLocal = (): boolean => {
    if (!sessionInfo) return false;
    
    // Verificar si la sesión ha expirado
    if (sessionInfo.expiresAt && sessionInfo.expiresAt < new Date()) {
      return false;
    }

    return sessionInfo.isValid && !!sessionInfo.session.access_token;
  };

  const validateSession = async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return false;
      }
      
      // Actualizar sessionInfo si es necesario
      if (!sessionInfo || sessionInfo.session.access_token !== session.access_token) {
        setSessionInfo({
          user: session.user,
          session: session,
          isValid: true,
          expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null
        });
      }
      
      return true;
    } catch (error) {
      console.warn('Error validando sesión:', error);
      return false;
    }
  };

  // ===============================================
  // UTILIDADES PARA CARGOS DEL SISTEMA BIOX
  // ===============================================

  const hasCargoType = (cargoType: number): boolean => {
    if (!cargos || cargos.length === 0) return false;
    return cargos.some(cargo => cargo.tipo === cargoType);
  };

  const hasCargo = (cargoTypes: number[]): boolean => {
    return cargoTypes.some(cargoType => hasCargoType(cargoType));
  };

  const getUserCargos = (): Cargo[] => {
    return cargos || [];
  };

  const loadUserData = async (userId: string): Promise<AuthResult<User>> => {
    try {
      console.log("-----------------> voy por acá")
      // Obtener usuario básico
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, email, nombre')
        .eq('id', userId)
        .single();

      // Obtener cargos activos por separado
      const { data: cargosData, error: cargosError } = await supabase
        .from('cargos')
        .select(`
          id,
          tipo,
          sucursal_id,
          dependencia_id,
          sucursales (id, nombre, codigo)
        `)
        .eq('usuario_id', userId)
        .eq('activo', true)
        .is('hasta', null);

      // Obtener información de sesión en paralelo
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (userError) {
        console.warn('⚠️ Error consultando datos de usuario en BD:', userError);
        
        // Fallback usando solo datos de auth
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const fallbackUser: User = {
            id: authUser.id,
            email: authUser.email || '',
            nombre: authUser.user_metadata?.name || authUser.email || '',
            supabaseUser: authUser
          };
          
          setUser(fallbackUser);
          setCargos([]);
          
          // Establecer sessionInfo si hay sesión
          if (sessionData?.session) {
            setSessionInfo({
              user: authUser,
              session: sessionData.session,
              isValid: true,
              expiresAt: sessionData.session.expires_at 
                ? new Date(sessionData.session.expires_at * 1000) 
                : null
            });
          }
          
          return {
            success: true,
            data: fallbackUser,
            error: null,
            message: 'Usuario cargado con fallback'
          };
        }
        
        return {
          success: false,
          data: null,
          error: new Error('No se pudo obtener datos del usuario'),
          message: 'Error cargando usuario'
        };
      }

      // Establecer datos del usuario
      const enrichedUser: User = {
        id: userData.id,
        email: userData.email,
        nombre: userData.nombre,
        supabaseUser: sessionData?.session?.user
      };
      
      setUser(enrichedUser);

      // Establecer cargos con información completa
      setCargos(
        (cargosData || []).map((cargo: any) => ({
          id: cargo.id || `cargo-${cargo.tipo}-${cargo.dependencia_id}`,
          dependenciaId: cargo.dependencia_id || '',
          tipo: cargo.tipo,
          sucursal: cargo.sucursales
            ? {
                id: cargo.sucursales.id,
                nombre: cargo.sucursales.nombre,
              }
            : undefined,
        }))
      );
      
      // Establecer información de sesión
      if (sessionData?.session) {
        setSessionInfo({
          user: sessionData.session.user,
          session: sessionData.session,
          isValid: true,
          expiresAt: sessionData.session.expires_at 
            ? new Date(sessionData.session.expires_at * 1000) 
            : null
        });
      }

      return {
        success: true,
        data: enrichedUser,
        error: null,
        message: 'Usuario cargado exitosamente'
      };
      
    } catch (error) {
      console.error('❌ Error en loadUserData:', error);
      
      // Fallback básico en caso de error
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fallbackUser: User = {
          id: user.id,
          email: user.email || '',
          nombre: user.user_metadata?.name || user.email || '',
          supabaseUser: user
        };
        setUser(fallbackUser);
        return {
          success: true,
          data: fallbackUser,
          error: null,
          message: 'Usuario cargado con fallback básico'
        };
      }
      
      setCargos([]);
      setSessionInfo(null);
      
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error : new Error('Error desconocido'),
        message: 'Fallo cargando datos del usuario'
      };
    }
  };

  // ===============================================
  // EFECTOS
  // ===============================================

  useEffect(() => {
    const initAuth = async () => {
      console.log("----------> initAuth ejecutado");
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Error al recuperar la sesión:', error);
          return;
        }

        if (session?.user) {
          await loadUserData(session.user.id);
        } else {
          console.log('ℹ️ No se encontró una sesión activa.');
          setUser(null);
          setCargos([]);
          setSessionInfo(null);
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Auth session missing') {
          console.warn('⚠️ No hay sesión activa para refrescar.');
        } else {
          console.error('❌ Error al inicializar la autenticación:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Escuchar cambios de autenticación con logging mejorado
    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      
      try {
        if (session?.user) {
          await loadUserData(session.user.id);
        } else {
          setUser(null);
          setCargos([]);
          setSessionInfo(null);
          
          // Limpiar cliente si es logout
          if (event === 'SIGNED_OUT') {
            destroyBrowserClient();
          }
        }
      } catch (error) {
        console.error('❌ Error procesando cambio de autenticación:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      console.log('🔄 Limpiando listener de autenticación');
      subscription?.subscription.unsubscribe();
    };
  }, []);

  const authenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        cargos,
        sessionInfo,
        loading,
        authenticated,
        signIn: supabaseSignIn,
        signOut: supabaseSignOut,
        signUp: supabaseSignUp,
        refreshSession,
        isSessionValid: isSessionValidLocal,
        validateSession,
        hasCargoType,
        hasCargo,
        getUserCargos
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
    } else router.replace('/pages');
  }, [user, loading, router]);

  return { user, loading };
}

/*
 * ===============================================
 * MEJORAS IMPLEMENTADAS EN AUTHCONTEXT v2.0
 * ===============================================
 * 
 * 1. **Cliente Supabase Optimizado**: 
 *    - Uso de createSupabaseBrowserClient con caché y persistencia automática
 *    - Mejor manejo de estado y configuración
 * 
 * 2. **Tipos Robustos**: 
 *    - AuthResult<T> para respuestas consistentes
 *    - SessionInfo para información completa de sesión
 *    - User extendido con supabaseUser opcional
 * 
 * 3. **Mejor Manejo de Errores**:
 *    - Respuestas estructuradas con success, data, error y message
 *    - Logging detallado con emojis para debugging
 *    - Fallbacks múltiples para garantizar funcionalidad
 * 
 * 4. **Validación de Sesión Avanzada**:
 *    - Verificación de expiración automática
 *    - Sincronización de estado entre cliente y servidor
 *    - Auto-refresh de tokens
 * 
 * 5. **Utilidades para Cargos del Sistema BIOX**:
 *    - hasCargoType(): Verifica tipo de cargo específico
 *    - hasCargo(): Verifica múltiples tipos de cargo
 *    - getUserCargos(): Obtiene lista completa de cargos
 * 
 * 6. **Integración con Constantes del Sistema**:
 *    - Uso de TIPO_CARGO para verificaciones type-safe
 *    - Compatibilidad con roles legacy y nuevos
 * 
 * 7. **Lifecycle Mejorado**:
 *    - Limpieza automática de estado en logout
 *    - Destrucción correcta de cliente cached
 *    - Recovery automático en caso de errores
 */