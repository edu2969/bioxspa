import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET(req, props) {
    const params = await props.params;
    console.log("getById from Supabase...", params);
    
    const { data: user, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', params.id)
        .single();
    
    if (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json({ error: `User ${params.id} not found` }, { status: 404 });
    }
    
    // Remove password from response
    delete user.password;
    
    return NextResponse.json({ user });
}

export async function POST(req, props) {
    const params = await props.params;
    const body = await req.json();
    console.log("Updating user in Supabase...", body, params);
    
    const userData = {
        name: body.name,
        email: body.email,
        role: body.role,
        rut: body.rut,
        gender: body.gender,
        birth_date: body.birthDate ? new Date(body.birthDate) : null,
        avatar_img: body.avatarImg,
        client_id: body.clientId,
    }
    
    if(params.id && body.password && (body.repassword === body.password)) { 
        userData.password = await bcrypt.hash(body.password, 10);
    }
    
    const { data: userUpdated, error } = await supabase
        .from('usuarios')
        .update(userData)
        .eq('id', params.id)
        .select('*')
        .single();
    
    if (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Remove password from response
    delete userUpdated.password;
    
    return NextResponse.json(userUpdated);
}


