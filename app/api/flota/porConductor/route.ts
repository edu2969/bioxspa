import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { withAuthorization } from "@/lib/auth/apiAuthorization";
import { ROLES, USER_ROLE } from "@/app/utils/constants";

export const GET = withAuthorization(
    async (req, user) => {
        try {
            // Verify user cargo is conductor
            const { data: cargo, error: cargoError } = await supabase
                .from("cargos")
                .select("tipo")
                .eq("usuario_id", user.id)
                .single();

            if (cargoError) {
                console.error("Error fetching cargo:", cargoError);
                return NextResponse.json({ error: "Internal server error" }, { status: 500 });
            }

            if (!cargo) {
                return NextResponse.json({ error: "User has no assigned cargo" }, { status: 400 });
            }

            if (cargo.tipo !== USER_ROLE.conductor) {
                return NextResponse.json({ error: "User is not a conductor" }, { status: 403 });
            }

            // Fetch vehicle IDs assigned via vehiculo_conductores relationship
            const { data: vcRows, error: vcError } = await supabase
                .from("vehiculo_conductores")
                .select("vehiculo_id")
                .eq("conductor_id", user.id);

            if (vcError) {
                console.error("Error fetching vehiculo_conductores:", vcError);
                return NextResponse.json({ error: "Internal server error" }, { status: 500 });
            }

            const vehiculoIds = (vcRows || []).map((r: any) => r.vehiculo_id).filter(Boolean);

            if (vehiculoIds.length === 0) {
                return NextResponse.json({ vehiculos: [] });
            }

            const { data: vehiculos, error: vehError } = await supabase
                .from("vehiculos")
                .select("id, marca, modelo, patente")
                .in("id", vehiculoIds);

            if (vehError) {
                console.error("Error fetching vehiculos:", vehError);
                return NextResponse.json({ error: "Internal server error" }, { status: 500 });
            }

            const result = (vehiculos || []).map((v: any) => ({
                _id: v.id,
                marca: v.marca,
                modelo: v.modelo,
                patente: v.patente,
            }));

            return NextResponse.json({ vehiculos: result });
        } catch (error) {
            return NextResponse.json({ error: (error as Error).message }, { status: 500 });
        }
    },
    {
        resource: "flota",
        action: "read",
        allowedRoles: [ROLES.DRIVER],
    }
);