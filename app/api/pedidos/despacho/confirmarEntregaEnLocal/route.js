import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Venta from "@/models/venta";
import DetalleVenta from "@/models/detalleVenta";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function POST(request) {
    await connectMongoDB();

    const { ventaId, nombreRecibe, rutRecibe } = await request.json();
    if (!ventaId || nombreRecibe === undefined || rutRecibe === undefined) {
        return NextResponse.json({ ok: false, error: "ventaId, nombreRecibe and rutRecibe are required" }, { status: 400 });
    }

    // Obtiene los detalles de la venta
    const detalles = await DetalleVenta.find({ ventaId }).lean();
    if (detalles.length === 0) {
        return NextResponse.json({ ok: false, error: "No existen detalles para la venta" }, { status: 404 });
    }

    // Obtiene la venta actual
    const venta = await Venta.findById(ventaId).select("estado historialEstados entregasEnLocal tipo").lean();
    if (!venta) {
        return NextResponse.json({ ok: false, error: "Venta not found" }, { status: 404 });
    }

    // Reúne todos los itemCatalogoIds de los detalles
    const allDetalleItemIds = detalles.flatMap(d => Array.isArray(d.itemCatalogoIds) ? d.itemCatalogoIds.map(id => id.toString()) : []);
    // Reúne todos los itemCatalogoIds ya entregados
    const entregados = venta.entregasEnLocal?.flatMap(e => Array.isArray(e.itemCargadoIds) ? e.itemCargadoIds.map(id => id.toString()) : []) || [];
    // Filtra los nuevos items escaneados
    const nuevosItems = allDetalleItemIds.filter(id => !entregados.includes(id));

    // Si hay nuevos items, inserta una nueva entrega
    if (nuevosItems.length > 0) {
        const nuevaEntrega = {
            nombreRecibe: nombreRecibe || "",
            rutRecibe: rutRecibe || "",
            itemCargadoIds: nuevosItems,
            fecha: new Date()
        };
        await Venta.findByIdAndUpdate(ventaId, {
            $push: { entregasEnLocal: nuevaEntrega }
        });
    }

    // Verifica si todos los detalles tienen la cantidad de itemCatalogoIds igual a cantidad
    let completa = true;
    for (const detalle of detalles) {
        const itemCount = Array.isArray(detalle.itemCatalogoIds) ? detalle.itemCatalogoIds.length : 0;
        if (itemCount < detalle.cantidad) {
            completa = false;
            break;
        }
    }

    // Actualiza el estado de la venta si corresponde
    const nuevoEstado = completa ? TIPO_ESTADO_VENTA.entregado : TIPO_ESTADO_VENTA.por_asignar;
    if (venta.estado !== nuevoEstado) {
        venta.historialEstados.push({ estado: nuevoEstado, fecha: new Date() });
        await Venta.findByIdAndUpdate(ventaId, { estado: nuevoEstado, historialEstados: venta.historialEstados });
    }

    return NextResponse.json({ ok: true, estado: nuevoEstado });
}