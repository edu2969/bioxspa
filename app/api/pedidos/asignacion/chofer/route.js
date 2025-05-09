import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import { connectMongoDB } from "@/lib/mongodb";
import User from "@/models/user";
import RutaDespacho from "@/models/rutaDespacho";
import Vehiculo from "@/models/vehiculo";
import Venta from "@/models/venta";
import DetalleVenta from "@/models/detalleVenta";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";
import Cliente from "@/models/cliente";
import Direccion from "@/models/direccion";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";

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
            estado: { $in: [TIPO_ESTADO_RUTA_DESPACHO.preparacion, TIPO_ESTADO_RUTA_DESPACHO.carga] }
        }).lean();

        console.log(`Fetching vehiculos for choferId: ${choferId}`);
        const vehiculos = await Vehiculo.find({
            choferIds: new mongoose.mongo.ObjectId(choferId)
        }).lean();

        if (rutaDespacho) {
            console.log(`RutasDespacho found. Fetching ventas for rutaDespacho ID: ${rutaDespacho._id}`);
            const ventas = await Venta.find({ _id: { $in: rutaDespacho.ventaIds } })
                .populate({
                    path: "clienteId",
                    select: "nombre rut direccionId",
                    populate: {
                        path: "direccionId",
                        model: "Direccion",
                        select: "nombre direccionOriginal comuna ciudad region"
                    }
                })
                .select("createdAt itemCatalogoIds clienteId")
                .lean();

            for (const venta of ventas) {
                console.log(`Fetching detalleVentas for venta ID: ${venta._id}`);
                const detalleVentas = await DetalleVenta.find({ ventaId: venta._id })
                    .populate({
                        path: "subcategoriaCatalogoId",
                        model: "SubcategoriaCatalogo",
                        select: "nombre categoriaCatalogoId",
                        populate: {
                            path: "categoriaCatalogoId",
                            model: "CategoriaCatalogo",
                            select: "nombre"
                        }
                    })
                    .lean();

                venta.items = detalleVentas.map(detalle => ({
                    nombre: `${detalle.subcategoriaCatalogoId.categoriaCatalogoId.nombre} ${detalle.subcategoriaCatalogoId.nombre}`,
                    cantidad: detalle.cantidad
                }));
            }

            console.log("Mapping ventas to rutasDespacho.");
            rutaDespacho.ventas = ventas.map(venta => ({
                cliente: {
                    nombre: venta.clienteId.nombre,
                    rut: venta.clienteId.rut,
                    direccion: venta.clienteId.direccionId
                },
                fecha: venta.createdAt,
                items: venta.items
            }));
        } else {
            console.log("No rutasDespacho found for the chofer.");
        }

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
            estado: { $in: [TIPO_ESTADO_RUTA_DESPACHO.preparacion, TIPO_ESTADO_RUTA_DESPACHO.carga] }
        });
        
        if (!rutaDespacho) {
            console.warn(`RutaDespacho not found or not in 'preparacion' or "carga' state for choferId: ${choferId}`);
            return NextResponse.json({ ok: true, rutaDespacho: null });
        }

        console.log(`Assigning choferId: ${choferId} to rutaDespacho ID: ${rutaDespacho._id}`);
        rutaDespacho.vehiculoId = vehiculoId;
        rutaDespacho.estado = TIPO_ESTADO_RUTA_DESPACHO.carga;
        console.log("SAVING", rutaDespacho);
        await rutaDespacho.save();

        console.log("Returning updated rutaDespacho.");
        return NextResponse.json({ ok: true, rutaDespacho });
    } catch (error) {
        console.error("ERROR", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
