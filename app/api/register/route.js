import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Creating user in Supabase...", name, email);
    
    // Check if user already exists
    const { data: existingUser } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', email)
        .single();
        
    if (existingUser) {
        return NextResponse.json({ message: "User already exists." }, { status: 400 });
    }
    
    // Create new user in Supabase
    const { data: newUser, error } = await supabase
        .from('usuarios')
        .insert([{ name, email, password: hashedPassword }])
        .select('*')
        .single();
        
    if (error) {
        console.error('Error creating user in Supabase:', error);
        return NextResponse.json({ message: "Error creating user." }, { status: 500 });
    }
    
    console.log("User registered successfully:", newUser.email);
    return NextResponse.json({ message: "User registered." }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "An error occurred while registering the user." },
      { status: 500 }
    );
  }
}
  }
}