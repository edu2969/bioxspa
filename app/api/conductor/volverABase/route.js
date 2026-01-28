import { NextResponse } from "next/server";
import { migrateAuthEndpoint } from "@/lib/auth/apiMigrationHelper";
import { supabase } from "@/lib/supabase";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";
import { TIPO_CARGO } from "@/app/utils/constants";

export const POST = migrateAuthEndpoint(async ({ user }, req) => {
    try {
        console.log("POST request received for volverABase from Supabase.");

        if (!user || !user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const choferId = user.id;
        const body = await req.json();
        const { rutaId } = body;

        if (!rutaId) {
            console.warn("rutaId is missing in the request body.");
            return NextResponse.json({ 
                ok: false, 
                error: "rutaId is required" 
            }, { status: 400 });
        }

        // Find the rutaDespacho using Supabase
        const { data: rutaDespacho, error: rutaError } = await supabase
            .from('rutas_despacho')
            .select('*')
            .eq('id', rutaId)
            .eq('chofer_id', choferId)
            .single();
        
        if (rutaError || !rutaDespacho) {
            console.warn(`RutaDespacho not found for ID: ${rutaId}`, rutaError);
            return NextResponse.json({ 
                ok: false, 
                error: "RutaDespacho not found" 
            }, { status: 404 });
        }

        // Find the driver's cargo (position) that corresponds to conductor (driver) type
        const { data: cargo, error: cargoError } = await supabase
            .from('cargos')
            .select('*')
            .eq('user_id', choferId)
            .eq('tipo', TIPO_CARGO.conductor)
            .single();

        if (cargoError || !cargo) {
            console.warn(`No conductor cargo found for user ID: ${choferId}`, cargoError);
            return NextResponse.json({ 
                ok: false, 
                error: "No conductor cargo found for user" 
            }, { status: 404 });
        }

        // Get the dependencia associated with the cargo
        const { data: dependencia, error: depError } = await supabase
            .from('dependencias')
            .select('*')
            .eq('id', cargo.dependencia_id)
            .single();

        if (depError || !dependencia) {
            console.warn(`Dependencia not found for ID: ${cargo.dependencia_id}`, depError);
            return NextResponse.json({ 
                ok: false, 
                error: "Dependencia not found" 
            }, { status: 404 });
        }

        // Get the direccion ID from the dependencia
        const direccionId = dependencia.direccion_id;

        if (!direccionId) {
            console.warn(`DireccionId not found in dependencia ID: ${dependencia.id}`);
            return NextResponse.json({ 
                ok: false, 
                error: "DireccionId not found in dependencia" 
            }, { status: 404 });
        }

        // Update the ruta array by adding the new destination
        const newRutaDestination = {
            direccionDestinoId: direccionId,
            fecha: null
        };

        const updatedRuta = [...(rutaDespacho.ruta || []), newRutaDestination];

        // Update estado to regreso and add new route destination
        const { error: updateError } = await supabase
            .from('rutas_despacho')
            .update({
                estado: TIPO_ESTADO_RUTA_DESPACHO.regreso,
                ruta: updatedRuta,
                updated_at: new Date()
            })
            .eq('id', rutaId);

        if (updateError) {
            console.error('Error updating rutaDespacho:', updateError);
            return NextResponse.json({ 
                ok: false, 
                error: "Error updating rutaDespacho" 
            }, { status: 500 });
        }

        console.log(`Updated rutaDespacho ID: ${rutaId} to estado: ${TIPO_ESTADO_RUTA_DESPACHO.regreso}`);
        return NextResponse.json({ 
            ok: true, 
            message: "Viaje iniciado correctamente"
        });
    } catch (error) {
        console.error("ERROR", error);
        return NextResponse.json({ 
            ok: false, 
            error: "Internal Server Error" 
        }, { status: 500 });
    }
});