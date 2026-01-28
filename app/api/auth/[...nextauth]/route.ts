/**
 * BIOX - NextAuth Route Migration Handler
 * Redirige las solicitudes de NextAuth a Supabase Auth
 */

import { NextRequest, NextResponse } from "next/server";
import { MigrationLogger } from "@/lib/supabase-helpers";

export async function GET(req: NextRequest, { params }: { params: { nextauth: string[] } }) {
  const { nextauth } = params;
  const action = nextauth?.[0];
  
  MigrationLogger.info('NextAuth route accessed, redirecting to Supabase', { action });

  // Redireccionar según la acción
  switch (action) {
    case 'signin':
      return NextResponse.redirect(new URL('/auth/login', req.url));
    
    case 'signout':
      return NextResponse.redirect(new URL('/auth/logout', req.url));
    
    case 'session':
      return NextResponse.redirect(new URL('/api/auth/session', req.url));
    
    default:
      return NextResponse.json({
        error: 'NextAuth has been migrated to Supabase Auth',
        message: 'Please use the new auth endpoints',
        endpoints: {
          login: '/api/auth/login',
          register: '/api/auth/register', 
          session: '/api/auth/session',
          logout: '/api/auth/login (DELETE)'
        }
      }, { status: 410 }); // Gone
  }
}

export async function POST(req: NextRequest, { params }: { params: { nextauth: string[] } }) {
  return GET(req, { params });
}