import { NextResponse } from "next/server";
import Venta from "@/models/venta";
import Cliente from "@/models/cliente";
import User from "@/models/user";
import DetalleVenta from "@/models/detalleVenta";
import Persona from "@/models/persona";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import Precio from "@/models/precio";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import { connectMongoDB } from "@/lib/mongodb";

// filepath: d:/git/bioxspa/app/api/pedidos/borradores/route.js

export async function GET(request) {
    await connectMongoDB();

    const { searchParams } = new URL(request.url);
    const sucursalId = searchParams.get("sucursalId");
    if (!sucursalId) {
        return NextResponse.json({ ok: false, error: "sucursalId is required" }, { status: 400 });
    }

    // Buscar ventas en estado "borrador"
    const ventas = await Venta.find({
        sucursalId,
        estado: {
            $in: [
                TIPO_ESTADO_VENTA.borrador, TIPO_ESTADO_VENTA.cotizacion,
                TIPO_ESTADO_VENTA.anulado, TIPO_ESTADO_VENTA.rechazado
            ]
        },
    }).lean();

    // Enriquecer ventas
    const pedidos = await Promise.all(
        ventas.map(async (venta) => {
            const cliente = await Cliente.findById(venta.clienteId).lean();
            const solicitante = await User.findById(venta.solicitanteId || venta.vendedorId).lean();

            // Obtener teléfono desde Persona si existe
            let telefono = "";
            if (solicitante && solicitante.personaId) {
                const persona = await Persona.findById({ userId: solicitante._id }).lean();
                telefono = persona?.telefono || "";
            }

            // Traer detalles de venta
            const detalles = await DetalleVenta.find({ ventaId: venta._id }).lean();

            // Enriquecer detalles con catálogo
            const items = await Promise.all(
                detalles.map(async (item) => {
                    let subcat = null;
                    let cat = null;
                    if (item.subcategoriaCatalogoId) {
                        subcat = await SubcategoriaCatalogo.findById(item.subcategoriaCatalogoId).lean();
                        if (subcat && subcat.categoriaCatalogoId) {
                            // Importar aquí para evitar ciclos si es necesario
                            const CategoriaCatalogo = (await import('@/models/categoriaCatalogo')).default;
                            cat = await CategoriaCatalogo.findById(subcat.categoriaCatalogoId).lean();
                        }
                    }
                    return {
                        producto: (cat && subcat) ? `${cat.nombre} - ${subcat.nombre}` : "",
                        capacidad: subcat?.cantidad ? `${subcat.cantidad} ${subcat.unidad || ""}`.trim() : "",
                        cantidad: item.cantidad,
                        precio: item.neto || undefined,
                        subcategoriaCatalogoId: item.subcategoriaCatalogoId || null,
                    };
                })
            );

            return {
                _id: venta._id.toString(),
                cliente: cliente
                    ? { nombre: cliente.nombre, rut: cliente.rut, _id: cliente._id.toString() }
                    : { nombre: "Sin cliente", rut: "" },
                solicitante: solicitante
                    ? {
                        _id: solicitante._id.toString(),
                        nombre: solicitante.name || solicitante.nombre || "",
                        telefono,
                    }
                    : { _id: "", nombre: "", telefono: "" },
                fecha: venta.fecha || venta.createdAt,
                items,
            };
        })
    );

    return NextResponse.json({ pedidos });
}

export async function POST(request) {
    await connectMongoDB();
    console.log("Conexión a MongoDB establecida en POST /borradores");

    const body = await request.json();
    console.log("Body recibido:", body);

    const { ventaId, precios, eliminar } = body;

    if (!ventaId) {
        console.warn("Falta ventaId en la solicitud");
        return NextResponse.json({ ok: false, error: "Falta ventaId" }, { status: 400 });
    }

    const venta = await Venta.findById(ventaId);
    if (!venta) {
        console.warn(`Venta no encontrada: ${ventaId}`);
        return NextResponse.json({ ok: false, error: "Venta no encontrada" }, { status: 404 });
    }

    if (eliminar) {
        // Anular venta
        venta.estado = TIPO_ESTADO_VENTA.anulado;
        await venta.save();
        console.log(`Venta ${ventaId} anulada`);
        return NextResponse.json({ ok: true, estado: "anulado" });
    }

    if (!Array.isArray(precios) || precios.length === 0) {
        console.warn("No se enviaron precios");
        return NextResponse.json({ ok: false, error: "Debe enviar precios" }, { status: 400 });
    }

    // Guardar precios para el cliente
    for (const { subcategoriaCatalogoId, precio } of precios) {
        if (!subcategoriaCatalogoId || !precio) {
            console.warn("Precio o subcategoriaCatalogoId faltante en item:", { subcategoriaCatalogoId, precio });
            continue;
        }
        // Buscar si ya existe un precio para este cliente y subcategoria
        let precioDoc = await Precio.findOne({
            clienteId: venta.clienteId,
            subcategoriaCatalogoId: subcategoriaCatalogoId,
        });
        if (precioDoc) {
            // Actualizar historial y valor
            precioDoc.historial.push({
                valor: precio,
                fecha: new Date(),
                varianza: precio - precioDoc.valor,
            });
            precioDoc.valor = precio;
            precioDoc.valorBruto = precio;
            precioDoc.fechaDesde = new Date();
            await precioDoc.save();
            console.log(`Precio actualizado para cliente ${venta.clienteId}, subcategoria ${subcategoriaCatalogoId}: ${precio}`);
        } else {
            // Crear nuevo precio
            await Precio.create({
                clienteId: venta.clienteId,
                subcategoriaCatalogoId: subcategoriaCatalogoId,
                valor: precio,
                valorBruto: precio,
                impuesto: 0,
                moneda: "CLP",
                historial: [{
                    valor: precio,
                    fecha: new Date(),
                    varianza: 0,
                }],
                fechaDesde: new Date(),
            });
            console.log(`Precio creado para cliente ${venta.clienteId}, subcategoria ${subcategoriaCatalogoId}: ${precio}`);
        }
    }

    // Cambiar estado a "por_asignar"
    venta.estado = TIPO_ESTADO_VENTA.por_asignar;
    await venta.save();
    console.log(`Venta ${ventaId} cambiada a estado 'por_asignar'`);

    return NextResponse.json({ ok: true, estado: "por_asignar" });
}