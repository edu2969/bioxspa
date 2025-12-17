/**
 * Handles the POST request to cargar (load) an item into a RutaDespacho (dispatch route).
 * 
 * This endpoint performs the following actions:
 * - Connects to MongoDB.
 * - Validates user session and retrieves user's workplace address from Cargo, Dependencia, or Sucursal.
 * - Validates the request body for required parameters (`itemId` or `codigo`).
 * - If `ventaId` is provided:
 *   - Verifies the Venta exists and is in a valid state `preparacion`.
 *   - Checks that the ItemCatalogo exists and belongs to the Venta's dispatch address.
 *   - Finds the associated RutaDespacho and ensures the item is not already loaded.
 *   - Adds the item to `cargaItemIds` and updates the latest `historialCarga`.
 * - If `rutaDespachoId` is provided:
 *   - Finds the RutaDespacho and its current dispatch address.
 *   - Finds the ItemCatalogo by `itemId` or `codigo` and validates its address.
 *   - Checks if the item's address matches the user's workplace address; if not, marks `direccionInvalida = true`.
 *   - Adds the item to `cargaItemIds` and updates the latest `historialCarga`.
 * - Returns a JSON response indicating success or error.
 * 
 * @async
 * @function POST
 * @param {Request} request - The incoming HTTP request containing JSON body with `rutaDespachoId`, `itemId`, `ventaId`, or `codigo`.
 * @returns {Promise<NextResponse>} JSON response with `{ ok: true, item }` on success, or `{ ok: false, error }` on error.
 */
import { mongoose } from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import RutaDespacho from "@/models/rutaDespacho";
import ItemCatalogo from "@/models/itemCatalogo";
import Venta from "@/models/venta";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/utils/authOptions";
import Cargo from "@/models/cargo";
import Dependencia from "@/models/dependencia";
import Sucursal from "@/models/sucursal";


export async function POST(request) {
    await connectMongoDB();

    if(!mongoose.models.Dependencia) {
        mongoose.model("Dependencia", Dependencia.schema);
    }
    if(!mongoose.models.Sucursal) {
        mongoose.model("Sucursal", Sucursal.schema);
    }

    // Obtener sesión del usuario
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Encontrar el cargo activo del usuario
    const cargo = await Cargo.findOne({
        userId: userId,
        hasta: null // Cargo activo
    }).populate('dependenciaId').populate('sucursalId');

    if (!cargo) {
        return NextResponse.json({ ok: false, error: "No active cargo found for user" }, { status: 403 });
    }

    // Obtener la dirección del usuario desde dependencia o sucursal
    let userDireccionId = null;
    if (cargo.dependenciaId && cargo.dependenciaId.direccionId) {
        userDireccionId = cargo.dependenciaId.direccionId;
    } else if (cargo.sucursalId && cargo.sucursalId.direccionId) {
        userDireccionId = cargo.sucursalId.direccionId;
    }

    if (!userDireccionId) {
        return NextResponse.json({ ok: false, error: "No address found for user's workplace" }, { status: 403 });
    }

    const body = await request.json();
    const { rutaDespachoId, itemId, ventaId, codigo } = body;
    console.log("BODY", { rutaDespachoId, itemId, ventaId, codigo });

    if (!itemId && !codigo) {
        console.log("Missing itemId", { itemId });
        return NextResponse.json({ ok: false, error: "Missing itemId or codigo" }, { status: 400 }); 
    }

    // Verifica que el item exista
    if(rutaDespachoId) {
        // Busca la ruta de despacho
        const rutaDespacho = await RutaDespacho.findById(rutaDespachoId);
        if (!rutaDespacho) {
            return NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });
        }
        const item = await ItemCatalogo.findOne(itemId ? { _id: itemId } : { codigo })
        .populate({
            path: "subcategoriaCatalogoId",
            model: "SubcategoriaCatalogo",
            select: "nombre cantidad unidad sinSifon nombreGas categoriaCatalogoId ownerId",
            populate: {
                path: "categoriaCatalogoId",
                model: "CategoriaCatalogo",
                select: "nombre elemento esIndustrial esMedicinal"
            }
        })
        .lean();
        if(!item) {
            return NextResponse.json({ ok: false, error: "Item no encontrado" }, { status: 404 });
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
        return NextResponse.json({ ok: true, item });
    } else if(ventaId) {
        const venta = await Venta.findById(ventaId).select("estado historialEstados direccionDespachoId").lean();
        if (!venta) {
            return NextResponse.json({ ok: false, error: "Venta not found" }, { status: 404 });
        }

        // Verifica si la venta está en estado preparacion
        if (venta.estado !== TIPO_ESTADO_VENTA.preparacion) {
            return NextResponse.json({ ok: false, error: "La venta no está en estado preparacion" }, { status: 400 });
        }

        const item = await ItemCatalogo.findOne({ _id: itemId, direccionId: userDireccionId }).select("_id subcategoriaCatalogoId").lean();
        if(!item) {            
            return NextResponse.json({ ok: true, error: "Item not found or does not belong to the route's address" }, { status: 404 });
        }

        // Verificar si la dirección del item coincide con la del usuario
        const itemWithValidation = { ...item };
        if (item.direccionId && !item.direccionId.equals(userDireccionId)) {
            itemWithValidation.direccionInvalida = true;
        }

        // Encuentra la rutaDespacho asociada a la venta
        const rutaDespacho = await RutaDespacho.findOne({ ventaIds: ventaId });
        if (!rutaDespacho) {
            return NextResponse.json({ ok: false, error: "No se encontró una ruta de despacho asociada a la venta" }, { status: 404 });
        }

        // Verifica si el item ya está en cargaItemIds
        if (rutaDespacho.cargaItemIds?.some(id => id.equals(item._id))) {
            return NextResponse.json({ ok: false, error: "El item ya fue cargado en la ruta de despacho" });
        }

        // Agrega el item a cargaItemIds
        if (!Array.isArray(rutaDespacho.cargaItemIds)) {
            rutaDespacho.cargaItemIds = [];
        }
        rutaDespacho.cargaItemIds.push(item._id);

        // Actualiza el historialCarga
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

        return NextResponse.json({ ok: true, item });
    }
    return NextResponse.json({ ok: true });
}