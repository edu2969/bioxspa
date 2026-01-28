import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        const { searchParams } = req.nextUrl;
        const query = searchParams.get('q');

        if (!query) {
            return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
        }

        const { data: users, error } = await supabase
            .from('usuarios')
            .select('*')
            .or(`name.ilike.%${query}%,email.ilike.%${query}%`);

        if (error) {
            console.error('Error searching users:', error);
            return NextResponse.json({ error: "Search failed" }, { status: 500 });
        }

        return NextResponse.json({ ok: true, users });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}