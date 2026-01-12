import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
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
import { IVenta } from "@/types/venta";
import { IDetalleVenta } from "@/types/detalleVenta";
import { ICargo } from "@/types/cargo";
import { ISucursal } from "@/types/sucursal";
import { IDependencia } from "@/types/dependencia";
import { IItemCatalogo } from "@/types/itemCatalogo";

export async function POST(request: NextRequest) {
    await connectMongoDB();

    const body = await request.json();
    const { rutaId, codigo } = body;

    if (!mongoose.models.SubcategoriaCatalogo) {
        mongoose.model("SubcategoriaCatalogo", SubcategoriaCatalogo.schema);
    }
    if (!mongoose.models.CategoriaCatalogo) {
        mongoose.model("CategoriaCatalogo", CategoriaCatalogo.schema);
    }

    console.log("RutaId:", rutaId, "Codigo:", codigo);

    if (!rutaId || !codigo) {
        return NextResponse.json({ ok: false, error: "Missing rutaId or codigo" }, { status: 400 });
    }

    // Busca el item por código
    const item = await ItemCatalogo.findOne({ codigo })
        .select("_id codigo subcategoriaCatalogoId")
        .populate({            
            path: "subcategoriaCatalogoId",
            model: "SubcategoriaCatalogo",
            select: "_id nombre unidad categoriaCatalogoId cantidad sinSifon",
            populate: {
                path: "categoriaCatalogoId",
                model: "CategoriaCatalogo",
                select: "nombre tipo gas elemento esIndustrial"
            }
        }).lean<IItemCatalogo>();

    console.log("Item encontrado:", item);

    if (!item) {
        return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
    }

    // Busca la ruta de despacho
    const rutaDespacho = await RutaDespacho.findById(rutaId);
    if (!rutaDespacho) {
        return NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });
    }

    // Verifica que el item pertenezca a la venta de la última dirección arribada
    const ultimaDireccion = rutaDespacho.ruta[rutaDespacho.ruta.length - 1].direccionDestinoId;
    const venta = await Venta.findOne({ _id: { $in: rutaDespacho.ventaIds } }).select("_id tipo direccionDespachoId").lean<IVenta>();

    if(!venta) {
        return NextResponse.json({ ok: false, error: "Venta not found in rutaDespacho" }, { status: 404 });
    }

    const detalles = await DetalleVenta.find({ ventaId: venta?._id })
        .select("itemCatalogoIds cantidad subcategoriaCatalogoId")
        .populate({
            path: "subcategoriaCatalogoId",
            model: "SubcategoriaCatalogo",
            select: "_id"
        })
        .populate({
            path: "itemCatalogoIds",
            model: "ItemCatalogo",
            select: "_id"
        })
        .lean<IDetalleVenta[]>();

    // ORDEN DE TRASLADO
    if (venta && venta.tipo === TIPO_ORDEN.traslado) {
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
        }).populate(["dependenciaId", "sucursalId"]).lean<ICargo>();

        if (!cargo) {
            return NextResponse.json({ ok: false, error: "Cargo not found" }, { status: 403 });
        }

        // Obtener direcciones asociadas al cargo
        let direccionesCargo = [];
        if (cargo.sucursalId) {
            const sucursal = await Sucursal.findById(cargo.sucursalId._id).lean<ISucursal>();
            if (sucursal && sucursal.direccionId?._id) {
                direccionesCargo.push(String(sucursal.direccionId._id));
            }
        }
        if (cargo.dependenciaId) {
            const dependencia = await Dependencia.findById(cargo.dependenciaId._id).lean<IDependencia>();
            if (dependencia && dependencia.direccionId?._id) {
                direccionesCargo.push(String(dependencia.direccionId._id));
            }
        }

        if (!direccionesCargo.includes(String(ultimaDireccion))) {
            return NextResponse.json({ ok: false, error: "No autorizado para descargar en esta dirección" }, { status: 403 });
        }

        if (!rutaDespacho.cargaItemIds.some((i: IItemCatalogo) => String(i._id) === String(item._id))) {
            return NextResponse.json({ ok: false, error: "El item no está en la ruta de despacho" }, { status: 400 });
        }

        // Descargar el item: remover de cargaItemIds y crear/actualizar DetalleVenta
        rutaDespacho.cargaItemIds = rutaDespacho.cargaItemIds.filter((i: IItemCatalogo) => String(i._id) !== String(item._id));

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
                detalle.subcategoriaCatalogoId?._id &&
                String(detalle.subcategoriaCatalogoId._id) === String(item.subcategoriaCatalogoId?._id) &&
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
    
    // OTRO TIPO DE ORDEN | VENTA
    const perteneceAlCliente = detalles.some(detalle =>
        String(detalle.subcategoriaCatalogoId?._id) === String(item.subcategoriaCatalogoId._id)
    );

    if (!perteneceAlCliente) {
        return NextResponse.json({ ok: false, error: "El item no pertenece al cliente" }, { status: 403 });
    }

    // Identifica que el cilindro esté cargado
    const estaCargado = rutaDespacho.cargaItemIds.some((i: IItemCatalogo) => String(i._id) === String(item._id));
    if (!estaCargado) {
        return NextResponse.json({ ok: false, error: "El item no está cargado en la ruta de despacho" }, { status: 400 });
    }

    console.log("Detalles", detalles);
    const detalleDisponible = detalles.find(detalle =>
        String(detalle.subcategoriaCatalogoId?._id) === String(item.subcategoriaCatalogoId._id) &&
        (!Array.isArray(detalle.itemCatalogoIds) ||
        detalle.itemCatalogoIds.length < detalle.cantidad)
    );
    
    if (!detalleDisponible) {
        return NextResponse.json({ ok: false, error: "No hay espacio en los detalles de la venta para este item" }, { status: 400 });
    }

    await DetalleVenta.updateOne(
        { _id: detalleDisponible._id },
        { $addToSet: { itemCatalogoIds: item._id } }
    );

    rutaDespacho.cargaItemIds = rutaDespacho.cargaItemIds.filter((i: IItemCatalogo) => String(i._id) !== String(item._id));

    const historial = rutaDespacho.historialCarga;
    const now = new Date();

    if (
        historial.length > 0 &&
        historial[historial.length - 1].esCarga === false
    ) {
        const ultimo = historial[historial.length - 1];
        if (!ultimo.itemMovidoIds.some((item: IItemCatalogo) => String(item._id) === String(item._id))) {
            ultimo.itemMovidoIds.push(String(item._id));
            ultimo.fecha = now;
        }
    } else {
        historial.push({
            esCarga: false,
            fecha: now,
            itemMovidoIds: [String(item._id)]
        });
    }

    await rutaDespacho.save();   

    return NextResponse.json({
        ok: true,
        ...item        
    });
}
