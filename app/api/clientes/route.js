import { getSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        const supabase = await getSupabaseServerClient();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) {
            return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
        }

        const { data: cliente, error } = await supabase
            .from("clientes")
            .select(`
                id,
                nombre,
                giro,
                rut,
                direccion_id,
                telefono,
                email,
                email_intercambio,
                orden_compra,
                arriendo,
                cilindros_min,
                cilindros_max,
                activo,
                en_quiebra,
                direcciones_despacho:cliente_direcciones_despacho(direccion_id(id, direccion_cliente, latitud, longitud)),
                documento_tributario_id,
                credito,
                meses_aumento,
                envio_factura,
                envio_reporte,
                seguimiento,
                reporte_deuda,
                notificacion,
                comentario,
                contacto,
                dias_de_pago,
                url_web
            `)
            .eq("id", id)
            .single();

        if (error) {
            console.error("[GET] Error fetching cliente:", error);
            return NextResponse.json({ error: "Cliente not found" }, { status: 404 });
        }

        return NextResponse.json({
            ok: true, cliente: {
                id: cliente.id,
                nombre: cliente.nombre,
                giro: cliente.giro,
                rut: cliente.rut,
                direccion: {
                    id: cliente.direccion_id
                },
                telefono: cliente.telefono,
                email: cliente.email,
                emailIntercambio: cliente.email_intercambio,
                envioReporte: cliente.envio_reporte,
                envioFactura: cliente.envio_factura,
                ordenCompra: cliente.orden_compra,
                arriendo: cliente.arriendo,
                cilindrosMin: cliente.cilindros_min,
                cilindrosMax: cliente.cilindros_max,
                activo: cliente.activo,
                enQuiebra: cliente.en_quiebra,
                direccionesDespacho: cliente.direcciones_despacho.map(d => ({
                    id: d.direccion_id.id,
                    direccionCliente: d.direccion_id.direccion_cliente,
                    latitud: d.direccion_id.latitud,
                    longitud: d.direccion_id.longitud
                })),
                documentoTributarioId: cliente.documento_tributario_id,
                credito: cliente.credito,
                mesesAumento: cliente.meses_aumento,
                reporteDeuda: cliente.reporte_deuda,
                notificacion: cliente.notificacion,
                seguimiento: cliente.seguimiento,
                contacto: cliente.contacto,
                urlWeb: cliente.url_web,
                diasDePago: cliente.dias_de_pago,
                comentario: cliente.comentario
            }
        });
    } catch (error) {
        console.error("[GET] ERROR!", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const supabase = await getSupabaseServerClient();
        const { data: authResult } = await getAuthenticatedUser();
        if (!authResult || !authResult.userData) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const entity = await req.json();
        console.log("[POST] Datos recibidos:", entity);

        const payload = {
            nombre: entity.nombre,
            rut: entity.rut,
            giro: entity.giro,
            telefono: entity.telefono,
            email: entity.email,
            email_intercambio: entity.emailIntercambio,
            comentario: entity.comentario,
            contacto: entity.contacto,
            url_web: entity.urlWeb,
            dias_de_pago: entity.diasDePago,
            credito: entity.credito,
            cilindros_max: entity.cilindrosMax,
            cilindros_min: entity.cilindrosMin,
            meses_aumento: entity.mesesAumento?.split(",") || [],
            envio_factura: entity.envioFactura,
            envio_reporte: entity.envioReporte,
            reporte: entity.reporte,
            seguimiento: entity.seguimiento,
            orden_compra: entity.ordenCompra,
            reporte_deuda: entity.reporteDeuda,
            arriendo: entity.arriendo, 
            notificacion: entity.notificacion,
            activo: entity.activo,
            en_quiebra: entity.enQuiebra
        }

        if(entity.id) {
            const { data: existingCliente, error: fetchError } = await supabase
                .from("clientes")
                .select("id")
                .eq("id", entity.id)
                .single();

            if (fetchError && fetchError.code !== "PGRST116") {
                console.error("[POST] Error checking existing cliente:", fetchError);
                return NextResponse.json({ error: "Error checking existing cliente" }, { status: 500 });
            }

            const { error: updateError } = await supabase
                .from("clientes")
                .update(payload)
                .eq("id", entity.id);

            if (updateError) {
                console.error("[POST] Error updating cliente:", updateError);
                return NextResponse.json({ error: "Error updating cliente" }, { status: 500 });
            }

            console.log("[POST] Cliente actualizado correctamente");
            return NextResponse.json({ ok: true, cliente: entity });
        } 

        const { data: newCliente, error: createError } = await supabase
            .from("clientes")
            .insert(payload)
            .single();

        if (createError) {
            console.error("[POST] Error creating cliente:", createError);
            return NextResponse.json({ error: "Error creating cliente" }, { status: 500 });
        }

        console.log("[POST] Nuevo cliente creado:", newCliente);
        return NextResponse.json({ ok: true, cliente: newCliente });        
    } catch (error) {
        console.error("[POST] ERROR!", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}