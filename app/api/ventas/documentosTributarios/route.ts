import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    console.log("[GET /documentosTributarios] Request received");

    try {
        const { searchParams } = req.nextUrl;
        const venta = searchParams.get("venta") === "true";
        const compra = searchParams.get("compra") === "true";

        console.log("[GET /documentosTributarios] Fetching data...");

        let query = supabase
            .from("documentos_tributarios")
            .select('id, nombre, created_at');

        if (venta || compra) {
            const conditions = [];
            if (venta) conditions.push("venta.eq.true");
            if (compra) conditions.push("compra.eq.true");

            if (conditions.length === 1) {
                const [condition] = conditions[0].split(".");
                query = query.eq(condition, true);
            } else {
                query = query.or(conditions.join(","));
            }
        }

        const { data: documentosTributarios, error } = await query.order("created_at", { ascending: false });

        if (error) {
            console.error("[GET /documentosTributarios] Error fetching data:", error);
            return NextResponse.json({ ok: false, error: "Error fetching documentos tributarios" }, { status: 500 });
        }

        if (!documentosTributarios || documentosTributarios.length === 0) {
            console.warn("[GET /documentosTributarios] No documents found");
            return NextResponse.json({ ok: true, documentosTributarios: [] });
        }

        console.log("[GET /documentosTributarios] Successfully fetched data");
        return NextResponse.json({ ok: true, documentosTributarios });
    } catch (error) {
        console.error("[GET /documentosTributarios] Internal Server Error:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}