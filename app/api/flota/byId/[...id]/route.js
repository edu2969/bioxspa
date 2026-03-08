import { NextResponse } from "next/server";
import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";

// Se obtiene el vehículo por ID y sus choferes asociados
export async function GET(request, { params }) {
    try {
        const { user } = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        console.log("params:", params);
        
        const { id } = params; // id es un array por [...id]
        const vehiculoId = Array.isArray(id) ? id[0] : id;

        if (!vehiculoId) {
            return NextResponse.json({ error: "ID de vehículo no proporcionado" }, { status: 400 });
        }

        // Buscar el vehículo por ID con relaciones
        const { data: vehiculo, error: vehiculoError } = await supabase
            .from("vehiculos")
            .select(`
                id,
                temporal_id,
                patente,
                marca,
                modelo,
                numero_motor,
                numero_chasis,
                ano,
                empresa_id,
                cliente_id,
                revision_tecnica,
                fecha_vencimiento_extintor,
                direccion_destino_id,
                posicion_latitud,
                posicion_longitud,
                created_at,
                updated_at,
                cliente:clientes(id, nombre, rut),
                direccion_destino:direcciones(id, direccion_cliente, latitud, longitud)
            `)
            .eq("id", vehiculoId)
            .single();

        if (vehiculoError || !vehiculo) {
            return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
        }

        // Buscar choferes asociados al vehículo a través de la tabla de relación
        const { data: vehiculoConductores, error: conductoresError } = await supabase
            .from("vehiculo_conductores")
            .select(`
                conductor:usuarios(
                    id,
                    nombre,
                    email,
                    role_legacy,
                    active,
                    persona_id,
                    created_at,
                    updated_at
                )
            `)
            .eq("vehiculo_id", vehiculoId);

        if (conductoresError) {
            console.error("Error fetching conductores:", conductoresError);
            return NextResponse.json({ error: "Error al obtener conductores" }, { status: 500 });
        }

        // Transformar datos para mantener compatibilidad con frontend
        const vehiculoTransformed = {
            _id: vehiculo.id,
            temporalId: vehiculo.temporal_id,
            patente: vehiculo.patente,
            marca: vehiculo.marca,
            modelo: vehiculo.modelo,
            numeroMotor: vehiculo.numero_motor,
            numeroChasis: vehiculo.numero_chasis,
            ano: vehiculo.ano,
            empresaId: vehiculo.empresa_id,
            clienteId: vehiculo.cliente_id,
            revisionTecnica: vehiculo.revision_tecnica,
            fechaVencimientoExtintor: vehiculo.fecha_vencimiento_extintor,
            direccionDestinoId: vehiculo.direccion_destino_id,
            posicionLatitud: vehiculo.posicion_latitud,
            posicionLongitud: vehiculo.posicion_longitud,
            createdAt: vehiculo.created_at,
            updatedAt: vehiculo.updated_at,
            cliente: vehiculo.cliente,
            direccionDestino: vehiculo.direccion_destino
        };

        const choferesAdornados = (vehiculoConductores || []).map(vc => {
            const chofer = vc.conductor;
            return {
                _id: chofer?.id,
                name: chofer?.nombre,
                email: chofer?.email,
                role: chofer?.role_legacy,
                active: chofer?.active,
                personaId: chofer?.persona_id,
                createdAt: chofer?.created_at,
                updatedAt: chofer?.updated_at,
            };
        }).filter(chofer => chofer._id); // Filtrar conductores válidos

        return NextResponse.json({
            ok: true,
            vehiculo: vehiculoTransformed,
            choferes: choferesAdornados,
        });

    } catch (error) {
        console.error("Error in vehicle GET endpoint:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}

// Se elimina el vehículo por ID
export async function DELETE(request, { params }) {
    try {
        const { user } = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const { id } = params;
        const vehiculoId = Array.isArray(id) ? id[0] : id;

        if (!vehiculoId) {
            return NextResponse.json({ error: "ID de vehículo no proporcionado" }, { status: 400 });
        }

        // Verificar que el vehículo existe antes de eliminarlo
        const { data: vehiculoExists, error: checkError } = await supabase
            .from("vehiculos")
            .select("id, patente")
            .eq("id", vehiculoId)
            .single();

        if (checkError || !vehiculoExists) {
            return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
        }

        // Eliminar relaciones de conductores primero (por las foreign keys)
        const { error: deleteRelationsError } = await supabase
            .from("vehiculo_conductores")
            .delete()
            .eq("vehiculo_id", vehiculoId);

        if (deleteRelationsError) {
            console.error("Error deleting vehicle-conductor relations:", deleteRelationsError);
            return NextResponse.json({ error: "Error al eliminar relaciones de conductores" }, { status: 500 });
        }

        // Eliminar el vehículo
        const { error: deleteVehiculoError } = await supabase
            .from("vehiculos")
            .delete()
            .eq("id", vehiculoId);

        if (deleteVehiculoError) {
            console.error("Error deleting vehicle:", deleteVehiculoError);
            return NextResponse.json({ error: "Error al eliminar vehículo" }, { status: 500 });
        }

        console.log(`Vehicle ${vehiculoExists.patente} deleted successfully by user ${user.id}`);

        return NextResponse.json({ 
            ok: true,
            message: "Vehículo eliminado correctamente",
            vehiculo: vehiculoExists
        });

    } catch (error) {
        console.error("Error in vehicle DELETE endpoint:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}