/**
 * NEXT.JS MIDDLEWARE
 * 
 * Middleware robusto con autenticación Supabase integrada
 * Maneja sesiones de manera segura sin bloquear el pipeline
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware-client";

export async function middleware(request: NextRequest) {
  try {
    // Crear respuesta inicial
    const response = NextResponse.next();

    // Crear cliente Supabase para middleware
    const supabase = createSupabaseMiddlewareClient(request, response, {
      skipAuth: false,
      onAuthError: (error) => {
        console.warn('Auth error in middleware:', error.message);
      }
    });

    // Verificar usuario de manera no bloqueante
    try {
      await supabase.auth.getUser();
    } catch (authError) {
      // No fallar el middleware por errores de auth
      console.warn('Auth verification failed in middleware:', authError);
    }

    return response;

  } catch (error) {
    // Middleware nunca debe fallar completamente
    console.error('Error in middleware:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Aplica middleware a todas las rutas excepto:
     * - api (API routes)
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (favicon)
     * - robots.txt, sitemap.xml (SEO files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};