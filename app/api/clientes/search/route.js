import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Cliente from "@/models/cliente";

export async function GET(req) {
    console.log("[GET] /api/clientes/search - Request received");
    try {
        await connectMongoDB();
        console.log("[GET] Connected to MongoDB");

        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');
        console.log(`[GET] Query parameter 'q': ${query}`);

        if (!query) {
            console.warn("[GET] Missing query parameter 'q'");
            return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
        }
        console.log("[GET] Searching for clientes...");
        const clientes = await Cliente.find({
            nombre: { $regex: query, $options: "i" } 
        })
        .select("_id nombre rut");

        console.log(`[GET] Found ${clientes.length} clientes`);
        return NextResponse.json({ ok: true, clientes });
    } catch (error) {
        console.error("[GET] ERROR!", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}