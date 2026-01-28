/**
 * BIOX - Endpoint temporal para registrar usuarios en Supabase Auth
 * Solo para testing del sistema de login migrado
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();
    
    // Crear usuario en Supabase Auth usando admin client
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name: name
      },
      email_confirm: true // Auto-confirmar email para testing
    });
    
    if (error) {
      console.error("Error creando usuario en Supabase:", error);
      return NextResponse.json({
        ok: false,
        error: error.message
      }, { status: 400 });
    }
    
    return NextResponse.json({
      ok: true,
      message: "Usuario creado en Supabase Auth",
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name
      }
    });
    
  } catch (error: any) {
    console.error("Error en registro Supabase:", error);
    return NextResponse.json({
      ok: false,
      error: error.message
    }, { status: 500 });
  }
}