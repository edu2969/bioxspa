import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getAuthenticatedUser() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        async getAll() {
          const allCookies = await cookies();
          return allCookies.getAll().map(({ name, value }) => ({ name, value }));
        },
        async setAll(cookiesToSet) {
          const allCookies = await cookies();
          for (const { name, value, options } of cookiesToSet) {
            allCookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Fetch the authenticated user
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }
  

  const userId = user.id;  

  const { data: userData, error: userError } = await supabase
    .from("usuarios")
    .select("id, role")
    .eq("id", userId)
    .single();

  if (userError || !userData) {
    throw new Error("User not found");
  }

  return { user, userData };
}