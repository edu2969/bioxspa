import { connectMongoDB } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Venta from "@/models/venta";
import DetalleVenta from "@/models/detalleVenta";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import { IVenta } from "@/types/venta";
import { generateBIDeuda } from "@/lib/bi/deudaGenerator";

export async function POST(request: NextRequest) {
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
    const venta = await Venta.findById(ventaId).select("estado historialEstados entregasEnLocal tipo").lean<IVenta>();
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
        venta.historialEstados?.push({ estado: nuevoEstado, fecha: new Date() });
        await Venta.findByIdAndUpdate(ventaId, { estado: nuevoEstado, historialEstados: venta.historialEstados });
        
        // Si la entrega está completa, generar registros de BI
        if (completa && nuevoEstado === TIPO_ESTADO_VENTA.entregado) {
            const ventaCompleta = await Venta.findById(ventaId).lean();
            if (ventaCompleta) {
                console.log(`Generando BI para entrega local completa - Venta: ${ventaId}`);
                await generateBIDeuda(ventaCompleta);
            }
        }
    }

    return NextResponse.json({ ok: true, estado: nuevoEstado });
}