"use client";

import {
  useState,
  useEffect,
  useContext,
  createContext,
  ReactNode,
  useRef,
} from "react";

import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

import type {
  AuthResult,
  SessionInfo,
} from "@/lib/supabase/supabase-auth";

import type {
  SupabaseClient,
  User as SupabaseUser,
  Session,
} from "@supabase/supabase-js";

//
// ======================================================
// TIPOS
// ======================================================
//

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
  signIn: (
    email: string,
    password: string
  ) => Promise<AuthResult<User>>;

  signOut: () => Promise<void>;

  refreshSession: () => Promise<void>;

  hasCargoType: (cargoType: number) => boolean;

  hasCargo: (cargoTypes: number[]) => boolean;

  isSessionValid: () => boolean;

  validateSession: () => Promise<boolean>;

  getUserCargos: () => Cargo[];
}

//
// ======================================================
// CONTEXT
// ======================================================
//

const AuthContextLocal =
  createContext<AuthContextType | null>(null);

//
// ======================================================
// PROVIDER
// ======================================================
//

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(
    null
  );

  const [cargos, setCargos] = useState<Cargo[]>(
    []
  );

  const [sessionInfo, setSessionInfo] =
    useState<SessionInfo | null>(null);

  const [loading, setLoading] = useState(true);

  const initialized = useRef(false);

  const loadingUserRef = useRef(false);

  const supabaseRef =
    useRef<SupabaseClient | null>(null);

  //
  // ======================================================
  // CLIENT
  // ======================================================
  //

  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current =
        createSupabaseBrowserClient();
    }

    return supabaseRef.current;
  };

  //
  // ======================================================
  // LOAD USER DATA
  // ======================================================
  //

  const loadUserData = async (
    session: Session
  ): Promise<AuthResult<User>> => {
    try {
      if (loadingUserRef.current) {
        return {
          success: false,
          data: null,
          error: null as any,
          message: "Ya cargando usuario",
        };
      }

      loadingUserRef.current = true;

      const supabase = getSupabase();

      const userId = session.user.id;

      //
      // USUARIO
      //

      const {
        data: userData,
        error: userError,
      } = await supabase
        .from("usuarios")
        .select("id, email, nombre")
        .eq("id", userId)
        .single();

      if (userError) {
        throw userError;
      }

      //
      // CARGOS
      //

      const {
        data: cargosData,
        error: cargosError,
      } = await supabase
        .from("cargos")
        .select(`
          id,
          tipo,
          dependencia_id,
          sucursales (
            id,
            nombre
          )
        `)
        .eq("usuario_id", userId)
        .eq("activo", true)
        .is("hasta", null);

      if (cargosError) {
        console.warn(cargosError);
      }

      //
      // USUARIO ENRIQUECIDO
      //

      const enrichedUser: User = {
        id: userData.id,
        email: userData.email,
        nombre: userData.nombre,
        supabaseUser: session.user,
      };

      setUser(enrichedUser);

      //
      // CARGOS
      //

      setCargos(
        (cargosData || []).map((cargo: any) => ({
          id: cargo.id,
          dependenciaId:
            cargo.dependencia_id,
          tipo: cargo.tipo,
          sucursal: cargo.sucursales
            ? {
                id: cargo.sucursales.id,
                nombre:
                  cargo.sucursales.nombre,
              }
            : undefined,
        }))
      );

      //
      // SESSION INFO
      //

      setSessionInfo({
        user: session.user,
        session,
        isValid: true,
        expiresAt: session.expires_at
          ? new Date(
              session.expires_at * 1000
            )
          : null,
      });

      return {
        success: true,
        data: enrichedUser,
        error: null,
        message: "Usuario cargado",
      };
    } catch (error: any) {
      console.error(
        "❌ Error loadUserData",
        error
      );

      return {
        success: false,
        data: null,
        error,
        message: "Error cargando usuario",
      };
    } finally {
      loadingUserRef.current = false;
    }
  };

  //
  // ======================================================
  // SIGN IN
  // ======================================================
  //

  const signIn = async (
    email: string,
    password: string
  ): Promise<AuthResult<User>> => {
    try {
      setLoading(true);

      const supabase = getSupabase();

      console.log(
        "🔐 Iniciando login..."
      );

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      console.log(
        "🔐 Resultado login:",
        data,
        error
      );

      if (error) {
        return {
          success: false,
          data: null,
          error,
          message: error.message,
        };
      }

      if (!data.session) {
        return {
          success: false,
          data: null,
          error: new Error(
            "No existe sesión"
          ),
          message: "No existe sesión",
        };
      }

      return {
        success: true,
        data: {
          id: data.user.id,
          email: data.user.email || "",
          nombre:
            data.user.user_metadata?.name ||
            "",
          supabaseUser: data.user,
        },
        error: null,
        message: "Login exitoso",
      };
    } catch (error: any) {
      console.error(error);

      return {
        success: false,
        data: null,
        error,
        message:
          error?.message ||
          "Error desconocido",
      };
    } finally {
      setLoading(false);
    }
  };

  //
  // ======================================================
  // SIGN OUT
  // ======================================================
  //

  const signOut = async () => {
    try {
      setLoading(true);

      const supabase = getSupabase();

      await supabase.auth.signOut();

      setUser(null);
      setCargos([]);
      setSessionInfo(null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  //
  // ======================================================
  // REFRESH SESSION
  // ======================================================
  //

  const refreshSession = async () => {
    try {
      const supabase = getSupabase();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setUser(null);
        setCargos([]);
        setSessionInfo(null);
        return;
      }

      await loadUserData(session);
    } catch (error) {
      console.error(error);
    }
  };

  //
  // ======================================================
  // VALIDACIONES
  // ======================================================
  //

  const isSessionValid = () => {
    if (!sessionInfo) return false;

    if (
      sessionInfo.expiresAt &&
      sessionInfo.expiresAt < new Date()
    ) {
      return false;
    }

    return true;
  };

  const validateSession = async () => {
    try {
      const supabase = getSupabase();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      return !!session;
    } catch {
      return false;
    }
  };

  //
  // ======================================================
  // CARGOS
  // ======================================================
  //

  const hasCargoType = (
    cargoType: number
  ) => {
    return cargos.some(
      (x) => x.tipo === cargoType
    );
  };

  const hasCargo = (
    cargoTypes: number[]
  ) => {
    return cargos.some((x) =>
      cargoTypes.includes(x.tipo)
    );
  };

  const getUserCargos = () => cargos;

  //
  // ======================================================
  // INIT
  // ======================================================
  //

  useEffect(() => {
    if (initialized.current) return;

    initialized.current = true;

    const supabase = getSupabase();

    //
    // SESSION INICIAL
    //

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          await loadUserData(session);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    init();

    //
    // AUTH LISTENER
    //

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(
          "🔄 AUTH EVENT:",
          event
        );

        if (event === "SIGNED_OUT") {
          setUser(null);
          setCargos([]);
          setSessionInfo(null);
          return;
        }

        if (
          event === "SIGNED_IN" &&
          session
        ) {
          queueMicrotask(async () => {
            try {
              await loadUserData(session);
            } catch (err) {
              console.error(err);
            }
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  //
  // ======================================================
  // PROVIDER
  // ======================================================
  //

  return (
    <AuthContextLocal.Provider
      value={{
        user,
        cargos,
        loading,
        authenticated: !!user,
        sessionInfo,

        signIn,
        signOut,
        refreshSession,

        hasCargoType,
        hasCargo,
        getUserCargos,

        isSessionValid,
        validateSession,
      }}
    >
      {children}
    </AuthContextLocal.Provider>
  );
}

//
// ======================================================
// HOOKS
// ======================================================
//

export function useAuth() {
  const context =
    useContext(AuthContextLocal);

  if (!context) {
    throw new Error(
      "useAuth must be used within AuthProvider"
    );
  }

  return context;
}

export function useRequireAuth() {
  const { user, loading } = useAuth();

  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  return {
    user,
    loading,
  };
}