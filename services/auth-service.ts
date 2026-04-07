'use client';

import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export async function signIn(email: string, password: string) {

  const supabase = createSupabaseBrowserClient();

  return await supabase.auth.signInWithPassword({
    email,
    password
  });

}

export async function signOut() {

  const supabase = createSupabaseBrowserClient();

  await supabase.auth.signOut();
}