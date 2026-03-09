import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabase/supabase-auth";
import { TIPO_CARGO } from "@/app/utils/constants";

export async function GET() {
    try {
        const supabase = await getSupabaseServerClient();
        const authResult = await getAuthenticatedUser();
        const authData = authResult.data;

        if (!authData || !authData.userData) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = authData.userData.id;
        const userCargos = (authData.userData.cargos || []).map((cargo) => cargo.tipo);

        // Preferir helpers de auth basados en cargos activos.
        const isConductor = authData.hasCargo(["conductor"]) || userCargos.includes(TIPO_CARGO.conductor);
        if (!isConductor) {
            return NextResponse.json({ ok: false, error: "User is not a conductor" }, { status: 403 });
        }

        // Obtener vehículos asignados por relación many-to-many.
        const { data: vcRows, error: vcError } = await supabase
            .from("vehiculo_conductores")
            .select("vehiculo_id")
            .eq("conductor_id", userId);

        if (vcError) {
            console.error("Error fetching vehiculo_conductores:", vcError);
            return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
        }

        const vehiculoIds = (vcRows || []).map((r) => r.vehiculo_id).filter(Boolean);
        if (vehiculoIds.length === 0) {
            return NextResponse.json({ ok: true, vehiculos: [] });
        }

        const { data: vehiculos, error: vehError } = await supabase
            .from("vehiculos")
            .select("id, marca, modelo, patente")
            .in("id", vehiculoIds);

        if (vehError) {
            console.error("Error fetching vehiculos:", vehError);
            return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
        }

        const result = (vehiculos || []).map((v) => ({
            _id: v.id,
            marca: v.marca,
            modelo: v.modelo,
            patente: v.patente,
        }));

        return NextResponse.json({ ok: true, vehiculos: result });
    } catch (error) {
        console.error("Error in GET /api/flota/porConductor:", error);
        return NextResponse.json({ ok: false, error: error?.message || "Internal server error" }, { status: 500 });
    }
}