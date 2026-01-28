import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    console.log("Checking if user exists in Supabase...");
    const { email } = await req.json();
    
    const { data: user, error } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking user existence:', error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    
    console.log("user exists: ", !!user);
    return NextResponse.json({ user: user || null });
  } catch (error) {
    console.log('Error in userExists:', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}