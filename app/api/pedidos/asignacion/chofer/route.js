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

export async function GET() {
    try {
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
            select: "_id clienteId",
            populate: {
                path: "clienteId",
                model: "Cliente",
                select: "_id nombre",
                populate: {
                    path: "direccionId",
                    model: "Direccion",
                    select: "_id nombre latitud longitud",
                }
            }
        })
        .lean();

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

export async function POST(req) {
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
        
        const body = await req.json();
        const { vehiculoId } = body;

        if (!vehiculoId) {
            console.warn("vehiculoId is missing in the request body.");
            return NextResponse.json({ ok: false, error: "vehiculoId is required" }, { status: 400 });
        }

        console.log(`Fetching rutaDespacho for choferId: ${choferId}`);
        const rutaDespacho = await RutaDespacho.findOne({
            choferId: choferId,
            estado: { $in: [TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada] }
        });
        
        if (!rutaDespacho) {
            console.warn(`RutaDespacho not found or not in "orden_confirmada' state for choferId: ${choferId}`);
            return NextResponse.json({ ok: true, rutaDespacho: null });
        }

        console.log(`Assigning choferId: ${choferId} to rutaDespacho ID: ${rutaDespacho._id}`);
        rutaDespacho.vehiculoId = vehiculoId;
        await rutaDespacho.save();

        console.log("Returning updated rutaDespacho.");
        return NextResponse.json({ ok: true, rutaDespacho });
    } catch (error) {
        console.error("ERROR", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
