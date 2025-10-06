import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { connectMongoDB } from "@/lib/mongodb";
import User from "@/models/user";
import RutaDespacho from "@/models/rutaDespacho";
import Vehiculo from "@/models/vehiculo";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";
import Cliente from "@/models/cliente";
import Direccion from "@/models/direccion";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import ItemCatalogo from "@/models/itemCatalogo";
import Venta from "@/models/venta";
import CheckList from "@/models/checklist";
import DetalleVenta from "@/models/detalleVenta";

export async function GET() {
    try {
        console.log("GET request received for asignacion chofer.");
        console.log("Connecting to MongoDB...");
        await connectMongoDB();
        console.log("MongoDB connected.");

        if (!mongoose.models.Cliente) {
            mongoose.model("Cliente", Cliente.schema);
        }
        if (!mongoose.models.Direccion) {
            mongoose.model("Direccion", Direccion.schema);
        }
        if (!mongoose.models.SubcategoriaCatalogo) {
            mongoose.model("SubcategoriaCatalogo", SubcategoriaCatalogo.schema);
        }
        if (!mongoose.models.CategoriaCatalogo) {
            mongoose.model("CategoriaCatalogo", CategoriaCatalogo.schema);
        }        
        if (!mongoose.models.ItemCatalogo) {
            mongoose.model("ItemCatalogo", ItemCatalogo.schema);
        }
        if (!mongoose.models.Venta) {
            mongoose.model("Venta", Venta.schema);
        }

        console.log("Fetching server session...");
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const choferId = session.user.id;
        console.log(`Fetching chofer with ID: ${choferId}`);
        const chofer = await User.findById(choferId).lean();
        if (!chofer) {
            console.warn(`Chofer not found for ID: ${choferId}`);
            return NextResponse.json({ ok: false, error: "Chofer not found" }, { status: 404 });
        }

        console.log(`Fetching rutasDespacho for choferId: ${choferId}`);
        const rutaDespacho = await RutaDespacho.findOne({
            choferId: choferId,
            estado: { $gte: TIPO_ESTADO_RUTA_DESPACHO.preparacion, $lt: TIPO_ESTADO_RUTA_DESPACHO.terminado }
        }).populate({
            path: "vehiculoId",
            model: "Vehiculo",
            select: "_id patente modelo marca",
        }).populate({
            path: "cargaItemIds",
            model: "ItemCatalogo",
            select: "_id codigo subcategoriaCatalogoId",
            populate: {
                path: "subcategoriaCatalogoId",
                model: "SubcategoriaCatalogo",
                select: "cantidad unidad nombreGas sinSifon",
                populate: {
                    path: "categoriaCatalogoId",
                    model: "CategoriaCatalogo",
                    select: "elemento esIndustrial esMedicinal"
                }
            }
        }).populate({
            path: "ventaIds",
            model: "Venta",
            select: "_id clienteId direccionDespachoId estado",
            populate: {
                path: "clienteId",
                model: "Cliente",
                select: "_id nombre direccionesDespacho",
                populate: {
                    path: "direccionesDespacho.direccionId",
                    model: "Direccion",
                    select: "_id nombre latitud longitud",
                }
            }
        }).populate({
            path: "ruta.direccionDestinoId",
            model: "Direccion",
            select: "_id nombre latitud longitud"
        })
        .lean();

        if (rutaDespacho && rutaDespacho.ventaIds && rutaDespacho.ventaIds.length > 0) {
            const ventaIds = rutaDespacho.ventaIds.map(v => v._id ? v._id : v);
            // Importar aquí para evitar ciclos si es necesario
            // Obtener los detalles de venta
            const detallesPorVenta = await DetalleVenta.find({
                ventaId: { $in: ventaIds }
            })
            .select("ventaId subcategoriaCatalogoId cantidad itemCatalogoIds")
            .populate({
                path: "subcategoriaCatalogoId",
                model: "SubcategoriaCatalogo",
                select: "nombre unidad cantidad sinSifon categoriaCatalogoId",
                populate: {
                    path: "categoriaCatalogoId",
                    model: "CategoriaCatalogo",
                    select: "nombre elemento esIndustrial esMedicinal"
                }
            })
            .lean();

            // Agrupar detalles por ventaId
            const detallesMap = {};
            detallesPorVenta.forEach(det => {
                const vId = det.ventaId.toString();
                if (!detallesMap[vId]) detallesMap[vId] = [];
                detallesMap[vId].push({
                    subcategoriaCatalogoId: det.subcategoriaCatalogoId,
                    cantidad: det.cantidad,
                    elemento: det.subcategoriaCatalogoId.categoriaCatalogoId.elemento,
                    nombre: det.subcategoriaCatalogoId.nombre,
                    sinSifon: det.subcategoriaCatalogoId.sinSifon,
                    unidad: det.subcategoriaCatalogoId.unidad,
                    capacidad: det.subcategoriaCatalogoId.cantidad,
                    esIndustrial: det.subcategoriaCatalogoId.categoriaCatalogoId.esIndustrial,
                    esMedicinal: det.subcategoriaCatalogoId.categoriaCatalogoId.esMedicinal,
                    itemCatalogoIds: det.itemCatalogoIds
                });
            });

            // Agregar el atributo detalles a cada venta en rutaDespacho.ventaIds
            rutaDespacho.ventaIds = rutaDespacho.ventaIds.map(venta => {
                const vId = (venta._id || venta).toString();
                return {
                    ...venta,
                    detalles: detallesMap[vId] || []
                };
            });
        }

        console.log(`Fetching vehiculos for choferId: ${choferId}`);
        const vehiculos = await Vehiculo.find({
            choferIds: new mongoose.mongo.ObjectId(choferId)
        }).lean();

        console.log("Returning response with rutasDespacho, vehiculos");
        return NextResponse.json({ ok: true, rutaDespacho, vehiculos });
    } catch (error) {
        console.error("ERROR", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST() {
    try {
        console.log("POST request received for asignacion chofer.");
        console.log("Connecting to MongoDB...");
        await connectMongoDB();
        console.log("MongoDB connected.");

        console.log("Fetching server session...");
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const choferId = session.user.id;
        
        // Buscar el checklist del usuario para hoy con passed: true y obtener vehiculoId
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const checklist = await CheckList.findOne({
            userId: choferId,
            passed: true,
            fecha: { $gte: today }
        }).lean();

        if (!checklist || !checklist.vehiculoId) {
            console.warn("No se encontró un checklist válido para el usuario hoy.");
            return NextResponse.json({ ok: false, error: "No se encontró un checklist válido para el usuario hoy" }, { status: 400 });
        }

        const vehiculoId = checklist.vehiculoId;

        console.log(`Fetching rutaDespacho for choferId: ${choferId}`);
        const rutaDespacho = await RutaDespacho.findOne({
            choferId: choferId,
            estado: TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada
        });
        
        if (!rutaDespacho) {
            console.warn(`RutaDespacho not found or not in "orden_confirmada' state for choferId: ${choferId}`);
            return NextResponse.json({ ok: true, rutaDespacho: null });
        }

        console.log(`Assigning choferId: ${choferId} to rutaDespacho ID: ${rutaDespacho._id}`);
        rutaDespacho.vehiculoId = vehiculoId;
        if(rutaDespacho.ventaIds.length === 1) {
            const venta = await Venta.findById(rutaDespacho.ventaIds[0])
                .select("clienteId").populate("clienteId")
                .select("direccionDespachoIds").populate("direccionDespachoIds").lean();
            if(venta.clienteId.direccionDespachoIds.length === 1) {
                rutaDespacho.ruta = [{
                    direccionId: venta.clienteId.direccionDespachoIds[0],
                    fechaArribo: null
                }]
            }
            rutaDespacho.estado = TIPO_ESTADO_RUTA_DESPACHO.seleccion_destino;
        }
        await rutaDespacho.save();

        console.log("Returning updated rutaDespacho.");
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("ERROR", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
