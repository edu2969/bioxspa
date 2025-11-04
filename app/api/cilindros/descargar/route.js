import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import RutaDespacho from "@/models/rutaDespacho";
import ItemCatalogo from "@/models/itemCatalogo";
import DetalleVenta from "@/models/detalleVenta";
import Venta from "@/models/venta";
import Cargo from "@/models/cargo";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { TIPO_CARGO, TIPO_ORDEN } from "@/app/utils/constants";
import Sucursal from "@/models/sucursal";
import Dependencia from "@/models/dependencia";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";

export async function POST(request) {
    await connectMongoDB();

    const body = await request.json();
    const { rutaDespachoId, codigo } = body;

    if (!mongoose.models.SubcategoriaCatalogo) {
        mongoose.model("SubcategoriaCatalogo", SubcategoriaCatalogo.schema);
    }
    if (!mongoose.models.CategoriaCatalogo) {
        mongoose.model("CategoriaCatalogo", CategoriaCatalogo.schema);
    }

    if (!rutaDespachoId || !codigo) {
        return NextResponse.json({ ok: false, error: "Missing rutaDespachoId or codigo" }, { status: 400 });
    }

    // Busca el item por código
    const item = await ItemCatalogo.findOne({ codigo })
        .select("_id codigo subcategoriaCatalogoId")
        .populate({            
            path: "subcategoriaCatalogoId",
            model: "SubcategoriaCatalogo",
            select: "nombre unidad categoriaCatalogoId cantidad sinSifon",
            populate: {
                path: "categoriaCatalogoId",
                model: "CategoriaCatalogo",
                select: "nombre tipo gas elemento esIndustrial"
            }
        }).lean();

    console.log("Item encontrado:", item);

    if (!item) {
        return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
    }

    // Busca la ruta de despacho
    const rutaDespacho = await RutaDespacho.findById(rutaDespachoId);
    if (!rutaDespacho) {
        return NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });
    }

    // Verifica que el item pertenezca a la venta de la última dirección arribada
    const ultimaDireccion = rutaDespacho.ruta[rutaDespacho.ruta.length - 1].direccionDestinoId;
    const venta = await Venta.findOne({ _id: { $in: rutaDespacho.ventaIds } }).select("_id tipo direccionDespachoId").lean();
    const detalles = await DetalleVenta.find({ ventaId: venta._id }).select("itemCatalogoIds").lean();

    if (venta.tipo === TIPO_ORDEN.traslado) {
        if (!mongoose.models.Sucursal) {
            mongoose.model("Sucursal", Sucursal.schema);
        }
        if (!mongoose.models.Dependencia) {
            mongoose.model("Dependencia", Dependencia.schema);
        }
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;
        const cargo = await Cargo.findOne({
            userId,
            tipo: {
                $in: [
                    TIPO_CARGO.despacho,
                    TIPO_CARGO.responsable
                ]
            }
        }).populate(["dependenciaId", "sucursalId"]).lean();

        if (!cargo) {
            return NextResponse.json({ ok: false, error: "Cargo not found" }, { status: 403 });
        }

        // Obtener direcciones asociadas al cargo
        let direccionesCargo = [];
        if (cargo.sucursalId) {
            const sucursal = await Sucursal.findById(cargo.sucursalId).lean();
            if (sucursal && sucursal.direccionId) {
                direccionesCargo.push(String(sucursal.direccionId));
            }
        }
        if (cargo.dependenciaId) {
            const dependencia = await Dependencia.findById(cargo.dependenciaId).lean();
            if (dependencia && dependencia.direccionId) {
                direccionesCargo.push(String(dependencia.direccionId));
            }
        }

        if (!direccionesCargo.includes(String(ultimaDireccion))) {
            return NextResponse.json({ ok: false, error: "No autorizado para descargar en esta dirección" }, { status: 403 });
        }

        if (!rutaDespacho.cargaItemIds.some(id => String(id) === String(item._id))) {
            return NextResponse.json({ ok: false, error: "El item no está en la ruta de despacho" }, { status: 400 });
        }

        // Descargar el item: remover de cargaItemIds y crear/actualizar DetalleVenta
        rutaDespacho.cargaItemIds = rutaDespacho.cargaItemIds.filter(id => String(id) !== String(item._id));

        // Busca el detalle de venta correspondiente donde debería agregarse el item
        let detalleExistente = null;
        for (const detalle of detalles) {
            if (
                Array.isArray(detalle.itemCatalogoIds) &&
                detalle.itemCatalogoIds.length > 0 &&
                detalle.itemCatalogoIds.some(id => String(id) === String(item._id))
            ) {
                // Ya existe el item en este detalle, error: ya descargado
                return NextResponse.json({ ok: false, error: "El item ya fue descargado en esta venta" }, { status: 400 });
            }
            // Si el detalle es de tipo retiro y corresponde a la subcategoría del item, lo usamos
            if (
                Array.isArray(detalle.itemCatalogoIds) &&
                detalle.subcategoriaCatalogoId._id &&
                String(detalle.subcategoriaCatalogoId) === String(itemCompleto.subcategoriaCatalogoId?._id) &&
                detalle.tipo === 2 // tipo retiro
            ) {
                detalleExistente = detalle;
            }
        }

        if (detalleExistente) {
            await DetalleVenta.updateOne(
                { _id: detalleExistente._id },
                { $addToSet: { itemCatalogoIds: item._id } }
            );
        } else {
            const nuevoDetalle = new DetalleVenta({
                ventaId: venta._id,
                glosa: `Retiro de ${item.subcategoriaCatalogoId?.nombre || 'cilindro'}`,
                codigo: item.codigo,
                subcategoriaCatalogoId: item.subcategoriaCatalogoId,
                itemCatalogoIds: [item._id],
                tipo: venta.tipo, 
                cantidad: 1,
                especifico: 0,
                neto: 0,
                iva: 0,
                total: 0
            });
            await nuevoDetalle.save();
        }

        await rutaDespacho.save();

        if (rutaDespacho.cargaItemIds.length === 0) {
            await Venta.updateOne({ _id: venta._id }, { estado: 99 });
        }

        return NextResponse.json({
            ok: true,
            ...item
        });
    }

    // Resto de tipos de orden
    const perteneceAlCliente = detalles.some(detalle =>
        Array.isArray(detalle.itemCatalogoIds) &&
        detalle.itemCatalogoIds.some(id => String(id) === String(item._id))
    );

    if (!perteneceAlCliente) {
        return NextResponse.json({ ok: false, error: "El item no pertenece al cliente" }, { status: 403 });
    }

    rutaDespacho.cargaItemIds = rutaDespacho.cargaItemIds.filter(id => !id.equals(item._id));

    const historial = rutaDespacho.historialCarga;
    const now = new Date();

    if (
        historial.length > 0 &&
        historial[historial.length - 1].esCarga === false
    ) {
        const ultimo = historial[historial.length - 1];
        if (!ultimo.itemMovidoIds.some(id => id.equals(item._id))) {
            ultimo.itemMovidoIds.push(item._id);
            ultimo.fecha = now;
        }
    } else {
        historial.push({
            esCarga: false,
            fecha: now,
            itemMovidoIds: [item._id]
        });
    }

    await rutaDespacho.save();

    return NextResponse.json({
        ok: true,
        ...item        
    });
}
