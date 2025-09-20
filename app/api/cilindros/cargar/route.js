import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import RutaDespacho from "@/models/rutaDespacho";
import ItemCatalogo from "@/models/itemCatalogo";
import DetalleVenta from "@/models/detalleVenta";
import Venta from "@/models/venta";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

// filepath: d:/git/bioxspa/app/api/cilindros/cargar/route.js

export async function POST(request) {
    await connectMongoDB();

    const body = await request.json();
    const { rutaDespachoId, itemId, ventaId } = body;

    if (!itemId) {
        console.log("Missing itemId", { itemId });
        return NextResponse.json({ ok: false, error: "Missing itemId" }, { status: 400 }); 
    }

    // Verifica que el item exista
    const item = await ItemCatalogo.findById(itemId).select("_id subcategoriaCatalogoId").lean();
    if (!item) {
        return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
    }
    console.log("ITEM", item);
    if(ventaId) {
        const detalles = await DetalleVenta.find({ ventaId }).lean();
        console.log("DETALLES", detalles);
        // Verifica si el item ya fue cargado previamente en algún detalle de la venta        
        const itemIdStr = item._id.toString();
        console.log("ITEMIDSTR", itemIdStr);
        const existe = detalles.some(detalle =>
            Array.isArray(detalle.itemCatalogoIds) &&
            detalle.itemCatalogoIds?.some(id => id.toString() === itemIdStr)
        );
        console.log("EXISTE?", existe);
        if (existe) {
            return NextResponse.json({ ok: false, error: "El item ya fue cargado previamente en la venta" });
        }

        // Si no existe, agrega el item al arreglo de itemCatalogoIds del primer detalle
        if (detalles.length === 0) {
            return NextResponse.json({ ok: false, error: "No existen detalles para la venta" });
        }
        console.log(">>>>>");
        // Busca el detalle donde la subcategoriaCatalogoId coincide con la del item
        const detalleCoincidente = detalles.find(detalle =>
            detalle.subcategoriaCatalogoId &&
            detalle.subcategoriaCatalogoId.toString() === item.subcategoriaCatalogoId.toString()
        );
        console.log("DETALLE COINCIDENTE", detalleCoincidente);
        if (!detalleCoincidente) {
            return NextResponse.json({ ok: false, error: "No existe detalle con la misma subcategoría que el item" });
        }
        const detalleParaActualizar = await DetalleVenta.findById(detalleCoincidente._id);
        if(detalleParaActualizar && detalleParaActualizar.itemCatalogoIds?.length === detalleParaActualizar.cantidad) {
            return NextResponse.json({ ok: false, error: "No se pueden agregar más items a este detalle, ya se alcanzó la cantidad máxima." });
        }
        if (!Array.isArray(detalleParaActualizar.itemCatalogoIds)) {
            detalleParaActualizar.itemCatalogoIds = [];
        }
        detalleParaActualizar.itemCatalogoIds.push(item._id);
        await detalleParaActualizar.save();
        const venta = await Venta.findById(ventaId).select("estado historialEstados").lean();
        if(venta.estado == TIPO_ESTADO_VENTA.por_asignar) {            
            venta.estado = TIPO_ESTADO_VENTA.preparacion;
            venta.historialEstados.push({ estado: TIPO_ESTADO_VENTA.preparacion, fecha: new Date() });
            await Venta.findByIdAndUpdate(ventaId, { estado: venta.estado, historialEstados: venta.historialEstados });
        }
    } else if(rutaDespachoId) {
        // Busca la ruta de despacho
        const rutaDespacho = await RutaDespacho.findById(rutaDespachoId);
        if (!rutaDespacho) {
            return NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });
        }
        // Agrega el item a cargaItemIds si no está
        if (!rutaDespacho.cargaItemIds?.some(id => id.equals(item._id))) {
            rutaDespacho.cargaItemIds.push(item._id);
        }
        // Obtiene el historial más reciente
        const lastHistorial = rutaDespacho.historialCarga[rutaDespacho.historialCarga.length - 1];

        if (lastHistorial && lastHistorial.esCarga) {
            // Si el item ya existe en itemMovidoIds, arroja error
            if (lastHistorial.itemMovidoIds.some(id => id.equals(item._id))) {
                return NextResponse.json({ ok: false, error: "El item ya fue cargado en el último historial" }, { status: 400 });
            }
            // Si no, agrega el item a itemMovidoIds
            lastHistorial.itemMovidoIds.push(item._id);
        } else {
            // Si no hay historial reciente de carga, agrega uno nuevo
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