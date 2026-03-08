import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { USER_ROLE } from "@/app/utils/constants";

export async function GET(request) {
    try {
        const supabase = await getSupabaseServerClient();
        const { data: authResult } = await getAuthenticatedUser();
        const userId = authResult?.userData?.id;

        if (!authResult || !authResult.userData || !userId) {
            console.warn("[GET /aCargo] Missing userId parameter.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        console.log(`[GET /aCargo] Fetching sucursales for userId: ${userId}`);

        // Buscar cargos del usuario con tipo gerente, cobranza o encargado
        const tiposCargo = [USER_ROLE.gerente, USER_ROLE.cobranza, USER_ROLE.encargado];

        const { data: cargos, error: cargosError } = await supabase
            .from("cargos")
            .select('sucursal_id, sucursales: sucursales (id, nombre, visible)')
            .eq("usuario_id", userId)
            .in("tipo", tiposCargo)
            .or(`hasta.is.null,hasta.gte.${new Date().toISOString()}`);

        if (cargosError) {
            console.error("[GET /aCargo] Error fetching cargos:", cargosError);
            return NextResponse.json({ ok: false, error: "Error fetching cargos" }, { status: 500 });
        }

        // Filtrar sucursales visibles y mapear al formato esperado
        const sucursales = cargos
            .filter((cargo) => cargo.sucursales?.visible === true)
            .map((cargo) => ({
                _id: cargo.sucursales.id,
                nombre: cargo.sucursales.nombre,
            }));

        return NextResponse.json({ ok: true, sucursales });
    } catch (error) {
        console.error("[GET /aCargo] Internal Server Error:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}