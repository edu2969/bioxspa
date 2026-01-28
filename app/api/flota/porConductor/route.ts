import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { migrateAuthEndpoint } from "@/lib/auth/apiMigrationHelper";
import { USER_ROLE } from "@/app/utils/constants";

export const GET = migrateAuthEndpoint(async ({ user }) => {
    try {
        // Verify user cargo is conductor
        const { data: cargo, error: cargoError } = await supabase
            .from('cargos')
            .select('tipo')
            .eq('user_id', user.id)
            .single();

        if (cargoError) {
            console.error('Error fetching cargo:', cargoError);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        if (!cargo) {
            return NextResponse.json({ error: 'User has no assigned cargo' }, { status: 400 });
        }

        if (cargo.tipo !== USER_ROLE.conductor) {
            return NextResponse.json({ error: 'User is not a conductor' }, { status: 403 });
        }

        // Fetch vehicles assigned to the conductor
        const { data: vehiculos, error } = await supabase
            .from('vehiculos')
            .select('id, marca, modelo, patente, chofer_ids')
            .contains('chofer_ids', [user.id]);

        if (error) {
            console.error('Error fetching vehiculos:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        const result = (vehiculos || []).map(v => ({
            _id: v.id,
            marca: v.marca,
            modelo: v.modelo,
            patente: v.patente
        }));

        return NextResponse.json({ vehiculos: result });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
});