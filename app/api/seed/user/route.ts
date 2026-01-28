/**
 * BIOX - Seeder temporal para crear usuario de prueba
 * Solo para testing del sistema de login migrado
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    // Verificar si ya existe el usuario
    const { data: existingUser, error: findError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', 'test@biox.com')
      .single();
      
    if (existingUser) {
      return NextResponse.json({
        ok: true,
        message: "Usuario ya existe",
        user: { email: existingUser.email, name: existingUser.name }
      });
    }
    
    // Crear usuario de prueba
    const hashedPassword = await bcrypt.hash("password123", 10);
    
    const { data: newUser, error: createError } = await supabase
      .from('usuarios')
      .insert([{
        name: "Usuario Prueba",
        email: "test@biox.com", 
        password: hashedPassword,
        role: 1, // gerente
        active: true
      }])
      .select('*')
      .single();
      
    if (createError) {
      console.error("Error creating test user:", createError);
      return NextResponse.json({
        ok: false,
        error: createError.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      ok: true,
      message: "Usuario de prueba creado",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    });
    
  } catch (error: any) {
    console.error("Error creando usuario:", error);
    return NextResponse.json({
      ok: false,
      error: error.message
    }, { status: 500 });
  }
}