import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import RutaDespacho from "@/models/rutaDespacho";
import ItemCatalogo from "@/models/itemCatalogo";
import DetalleVenta from "@/models/detalleVenta";
import Venta from "@/models/venta";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function POST(request) {
    await connectMongoDB();

    const body = await request.json();
    const { rutaDespachoId, itemId, ventaId } = body;

    if (!itemId) {
        return NextResponse.json({ ok: false, error: "Missing itemId" }, { status: 400 });
    }

    // Busca el item y su subcategoría
    const item = await ItemCatalogo.findById(itemId).select("_id subcategoriaCatalogoId stockActual").lean();
    if (!item) {
        return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
    }

    // Verifica que la subcategoría exista
    const subcategoria = await SubcategoriaCatalogo.findById(item.subcategoriaCatalogoId).select("_id").lean();
    if (!subcategoria) {
        return NextResponse.json({ ok: false, error: "Subcategoria not found" }, { status: 404 });
    }

    // Actualiza el stock del item (resta 1)
    await ItemCatalogo.findByIdAndUpdate(item._id, { $inc: { stockActual: -1 } });

    if (ventaId) {
        // Busca los detalles de la venta
        const detalles = await DetalleVenta.find({ ventaId }).lean();
        // Busca el detalle con la misma subcategoría
        const detalleCoincidente = detalles.find(detalle =>
            detalle.subcategoriaCatalogoId &&
            detalle.subcategoriaCatalogoId.toString() === item.subcategoriaCatalogoId.toString()
        );
        if (!detalleCoincidente) {
            return NextResponse.json({ ok: false, error: "No existe detalle con la misma subcategoría que el item" });
        }
        // Verifica si ya fue escaneado
        const itemIdStr = item._id.toString();
        if (detalleCoincidente.itemCatalogoIds?.some(id => id.toString() === itemIdStr)) {
            return NextResponse.json({ ok: false, error: "El item ya fue cargado previamente en el detalle" });
        }
        // Verifica que no se exceda la cantidad
        if (detalleCoincidente.itemCatalogoIds?.length === detalleCoincidente.cantidad) {
            return NextResponse.json({ ok: false, error: "No se pueden agregar más items a este detalle, ya se alcanzó la cantidad máxima." });
        }
        // Inicializa itemCatalogoIds si es null
        if (!Array.isArray(detalleCoincidente.itemCatalogoIds)) {
            await DetalleVenta.findByIdAndUpdate(detalleCoincidente._id, {
                $set: { itemCatalogoIds: [] }
            });
        }
        // Actualiza el detalle
        await DetalleVenta.findByIdAndUpdate(detalleCoincidente._id, {
            $push: { itemCatalogoIds: item._id }
        });

        // Actualiza estado de la venta si corresponde
        const venta = await Venta.findById(ventaId).select("estado historialEstados").lean();
        if (venta.estado === TIPO_ESTADO_VENTA.por_asignar) {
            venta.estado = TIPO_ESTADO_VENTA.preparacion;
            venta.historialEstados.push({ estado: TIPO_ESTADO_VENTA.preparacion, fecha: new Date() });
            await Venta.findByIdAndUpdate(ventaId, {
                estado: venta.estado,
                historialEstados: venta.historialEstados
            });
        }
    } else if (rutaDespachoId) {
        // Busca la ruta de despacho
        const rutaDespacho = await RutaDespacho.findById(rutaDespachoId);
        if (!rutaDespacho) {
            return NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });
        }
        // Agrega el item a cargaItemIds si no está
        if (!rutaDespacho.cargaItemIds?.some(id => id.equals(item._id))) {
            rutaDespacho.cargaItemIds.push(item._id);
        }
        // Manejo del historial de carga
        const lastHistorial = rutaDespacho.historialCarga[rutaDespacho.historialCarga.length - 1];
        if (lastHistorial && lastHistorial.esCarga) {
            if (lastHistorial.itemMovidoIds.some(id => id.equals(item._id))) {
                return NextResponse.json({ ok: false, error: "El item ya fue cargado en el último historial" }, { status: 400 });
            }
            lastHistorial.itemMovidoIds.push(item._id);
        } else {
            rutaDespacho.historialCarga.push({
                esCarga: true,
                fecha: new Date(),
                itemMovidoIds: [item._id]
            });
        }
        await rutaDespacho.save();
    }

    return NextResponse.json({ ok: true });
}