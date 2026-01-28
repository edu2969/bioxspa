import { NextResponse } from "next/server";
import { migrateAuthEndpoint } from "@/lib/auth/apiMigrationHelper";
import { supabase } from "@/lib/supabase";

export const GET = migrateAuthEndpoint(async ({ user }) => {
    try {
        console.log("Fetching last venta update from Supabase");

        // Buscar la venta más reciente por updated_at
        const { data: lastVenta, error } = await supabase
            .from('ventas')
            .select('updated_at')
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
            throw error;
        }

        if (!lastVenta) {
            return NextResponse.json({ ok: true, updatedAt: null });
        }

        return NextResponse.json({ ok: true, updatedAt: lastVenta.updated_at });
    } catch (error) {
        console.error("Error fetching last venta update:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
});