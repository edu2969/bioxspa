import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    console.log("[GET] /api/clientes/search - Request received");

    try {
        const { searchParams } = req.nextUrl;
        const query = searchParams.get("q");
        console.log(`[GET] Query parameter 'q': ${query}`);

        if (!query) {
            console.warn("[GET] Missing query parameter 'q'");
            return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
        }

        console.log("[GET] Searching for clientes...");
        const sanitizedQuery = query.trim();

        const { data: clientes, error } = await supabase
            .from("clientes")
            .select("id, nombre, rut")
            .or(`nombre.ilike.%${sanitizedQuery}%,rut.ilike.%${sanitizedQuery}%`);

        if (error) {
            console.error("[GET] Error fetching clientes:", error);
            return NextResponse.json({ error: "Error fetching clientes" }, { status: 500 });
        }

        console.log(`[GET] Found ${clientes.length} clientes`);
        return NextResponse.json({ ok: true, clientes });
    } catch (error) {
        console.error("[GET] ERROR!", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}