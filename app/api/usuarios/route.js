import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    console.log("Getting all users from Supabase...");
    
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: "Error fetching users" }, { status: 500 });
    }
    
    return NextResponse.json({ usuarios });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const params = await req.json();
    console.log("Users POST to Supabase...", params);

    if (params._id || params.id) {
      // Update existing user
      const { data: existingUser, error: findError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', params._id || params.id)
        .single();

      if (findError) {
        console.error('Error finding user:', findError);
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const updateData = { ...params };
      delete updateData._id;
      delete updateData.id;

      const { data: updatedUser, error: updateError } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', params._id || params.id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Error updating user:', updateError);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
      }

      return NextResponse.json(updatedUser);
    }

    // Check if user already exists by email
    const { data: existingUser, error: existsError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', params.email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    // Hash password and create new user
    const hashedPassword = await bcrypt.hash(params.password, 10);
    const userData = { ...params, password: hashedPassword };
    
    const { data: newUser, error: createError } = await supabase
      .from('usuarios')
      .insert([userData])
      .select('*')
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json({ error: "User creation failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      id: newUser.id
    });
  } catch (error) {
    console.error("ERROR in POST users", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}