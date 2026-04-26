import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function POST(request) {    
    const body = await request.json();
    const { itemId, direccionId } = body;

    if(!itemId || !direccionId) {
        console.log(`Faltan parámetros itemId ${itemId} - direccionId ${direccionId}`);
        return NextResponse.json({ ok: false, error: "Faltan parámetros" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, direccionValida: true });
}