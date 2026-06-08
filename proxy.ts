/**
 * NEXT.JS PROXY (antes "middleware")
 *
 * En Next.js 16 el middleware se renombró a "proxy". Next.js solo detecta este
 * archivo si está en la raíz del proyecto (junto a `app/`) como `proxy.ts` y
 * exporta una función llamada `proxy` (o un default). El objeto `config` debe
 * declararse estáticamente en este mismo archivo.
 *
 * Maneja la sesión de Supabase de forma no bloqueante en cada request.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware-client";

export async function proxy(request: NextRequest) {
  try {
    const response = NextResponse.next();

    const supabase = createSupabaseMiddlewareClient(request, response, {
      skipAuth: false,
      onAuthError: (error) => {
        console.warn("Auth error in proxy:", error.message);
      },
    });

    // Verificar/refrescar sesión de manera no bloqueante.
    try {
      await supabase.auth.getUser();
    } catch (authError) {
      console.warn("Auth verification failed in proxy:", authError);
    }

    return response;
  } catch (error) {
    // El proxy nunca debe fallar completamente.
    console.error("Error in proxy:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Aplica el proxy a todas las rutas excepto:
     * - api (API routes)
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (favicon)
     * - robots.txt, sitemap.xml (SEO files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
