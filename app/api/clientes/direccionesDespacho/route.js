import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req) {
    const { data: authResult } = await getAuthenticatedUser();
    if (!authResult || !authResult.userData) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const entity = await req.json();

    console.log("Entity ---->", entity);

    const supabase = await getSupabaseServerClient();

    if(entity.direccion?.id) {
        const { data: direccion, error: errorDireccion } = await supabase
            .from('direcciones')
            .select('direccion_cliente, latitud, longitud, place_id, comentario')
            .eq('id', entity.direccion.id)
            .single();

        if(errorDireccion) {
            console.log("[POST] DireccionDespacho: Error al buscar direccion", errorDireccion);
            return NextResponse.json({ ok: false, error: "Error al buscar direccion" }, { status: 500 });
        }

        if(direccion && (
            direccion.direccion_cliente !== entity.direccion.direccionCliente 
            || direccion.latitud !== entity.direccion.latitud
            || direccion.longitud !== entity.direccion.longitud
            || direccion.place_id !== entity.direccion.placeId
            || direccion.comentario !== entity.direccion.comentario)
        ) {
            const { error: uptDireccionError } = await supabase
                .from('direcciones')
                .update({
                    direccion_cliente: entity.direccion.direccionCliente,
                    latitud: entity.direccion.latitud,
                    longitud: entity.direccion.longitud,
                    place_id: entity.direccion.placeId,
                    comentario: entity.direccion.comentario
                })
                .eq('id', entity.direccion.id);

            if(uptDireccionError) {
                console.error("[POST] DireccionesDespacho: Error al actualizar", uptDireccionError);
                return NextResponse.json({ ok: false, error: "Error al actualizar la dirección de despacho"}, { status: 500 });
            }
        } 
    } else {        
        const { data: direccionPlaceId, error: errorDireccionPlaceId } = await supabase
            .from('direcciones')
            .select('id')
            .eq('place_id', entity.direccion.placeId)
            .single();

        console.log("DireccionPlaceId: ", direccionPlaceId);
        
        let direccionId = "";
        if(direccionPlaceId) {
            direccionId = direccionPlaceId.id;
            const { data: uptDireccion, error: uptDirecicon } = await supabase
                .from('direcciones')
                .update({
                    direccion_cliente: entity.direccion.direccionCliente,
                    latitud: entity.direccion.latitud,
                    longitud: entity.direccion.longitud,
                    place_id: entity.direccion.placeId,
                    comentario: entity.direccion.comentario
                });
        } else {
            const { data: direccion, error: errorInsDireccion } = await supabase
                .from('direcciones')
                .insert({
                    direccion_cliente: entity.direccion.direccionCliente,
                    latitud: entity.direccion.latitud,
                    longitud: entity.direccion.longitud,
                    place_id: entity.direccion.placeId,
                    comentario: entity.direccion.comentario
                })
                .select('id')
                .single();

            if(errorInsDireccion) {
                console.log("Error al insertar la dirección: ", errorInsDireccion);
                return NextResponse.json({ ok: true, error: "Error al insertar" }, { status: 500 });
            }
            if(!direccion) {
                console.log("[POST] DireccionesDespacho: Error al obtener la dirección insertada");
                return NextResponse("[POST] DIreccionesDespacho: Error al obtener la dirección insertada");
            }
            direccionId = direccion.id;
        }
        console.log("Se obtiene", direccionId);

        const { data: insertDireccionDespacho, error: errorInsertDireccionDespacho } = await supabase
            .from('cliente_direcciones_despacho')
            .insert({
                cliente_id: entity.clienteId,
                direccion_id: direccionId
            });

        if(errorInsertDireccionDespacho) {
            console.error("[POST] DireccionesDespacho: Error al intentar insertar direccion de despacho", errorInsertDireccionDespacho);
            return NextResponse.json({ ok: false, error: "Error al insertar direccion de despacho"}, { status: 500 });
        }      
    }
    
    return NextResponse.json({ ok: true });
}