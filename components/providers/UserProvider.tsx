"use client";

import { createClient, User, Session } from '@supabase/supabase-js';
import { useEffect, useState, createContext, useContext } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UserContextType {
  user: User | null;
  session: Session | null;
}

export const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setSession(session);
    };

    fetchSession();

    // Listen for auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setSession(session);
    });

    return () => {
      subscription.subscription?.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, session }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}