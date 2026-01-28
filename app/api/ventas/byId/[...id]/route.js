import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
    const id = params?.id?.[0];
    
    // Validate UUID format (Supabase uses UUIDs)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
        return NextResponse.json({ error: "ID de venta inválido" }, { status: 400 });
    }

    // Find the venta using Supabase
    const { data: venta, error: ventaError } = await supabase
        .from('ventas')
        .select('*')
        .eq('id', id)
        .single();
        
    if (ventaError || !venta) {
        return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    }

    // Find the ruta de despacho associated with the venta (if it exists)
    const { data: rutaDespacho, error: rutaError } = await supabase
        .from('rutas_despacho')
        .select(`
            *,
            vehiculos (
                id,
                patente,
                marca,
                modelo
            ),
            users (
                id,
                name,
                email
            )
        `)
        .contains('venta_ids', [id])
        .single();

    let ruta = null;
    if (rutaDespacho) {
        // Buscar datos del vehículo
        let vehiculo = null;
        if (rutaDespacho.vehiculoId) {
            const v = await Vehiculo.findById(rutaDespacho.vehiculoId).lean();
            if (v) {
                vehiculo = {
                    _id: v._id,
                    patente: v.patente,
                    marca: v.marca,
                    modelo: v.modelo
                };
            }
        }

    let ruta = null;
    if (rutaDespacho) {
        ruta = {
            _id: rutaDespacho.id,
            estado: rutaDespacho.estado,
            historial_estado: rutaDespacho.historial_estado,
            historial_carga: rutaDespacho.historial_carga,
            vehiculo: rutaDespacho.vehiculos ? {
                _id: rutaDespacho.vehiculos.id,
                patente: rutaDespacho.vehiculos.patente,
                marca: rutaDespacho.vehiculos.marca,
                modelo: rutaDespacho.vehiculos.modelo
            } : null,
            chofer: rutaDespacho.users ? {
                _id: rutaDespacho.users.id,
                nombre: rutaDespacho.users.name,
                email: rutaDespacho.users.email
            } : null
        };
    }

    return NextResponse.json({
        venta: {
            ...venta,
            historialEstados: venta.historial_estados
        },
        rutaDespacho: ruta
    });
}