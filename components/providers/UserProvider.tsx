"use client";

import type { User, Session } from '@supabase/supabase-js';
import { useAuth } from '@/context/AuthContext';

interface UserContextType {
  user: User | null;
  session: Session | null;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useUser(): UserContextType {
  const { user, sessionInfo } = useAuth();

  return {
    user: user?.supabaseUser || null,
    session: sessionInfo?.session || null
  };
}