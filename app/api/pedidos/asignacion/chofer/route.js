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

export async function GET() {
    try {
        await connectMongoDB();

        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const choferId = session.user.id;
        const chofer = await User.findById(choferId).lean();
        if (!chofer) {
            return NextResponse.json({ ok: false, error: "Chofer not found" }, { status: 404 });
        }

        const rutasDespacho = await RutaDespacho.findOne({
            choferId: choferId,
            estado: TIPO_ESTADO_RUTA_DESPACHO.preparacion
        }).lean();

        const vehiculos = await Vehiculo.find({
            choferIds: new mongoose.mongo.ObjectId(choferId)
        }).lean();

        if (rutasDespacho) {
            const ventas = await Venta.find({ _id: { $in: rutasDespacho.ventaIds } })
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

            rutasDespacho.ventas = ventas.map(venta => ({
                cliente: {
                    nombre: venta.clienteId.nombre,
                    rut: venta.clienteId.rut,
                    direccion: venta.clienteId.direccionId
                },
                fecha: venta.createdAt,
                items: venta.items
            }));
        }

        return NextResponse.json({ ok: true, rutasDespacho, vehiculos });
    } catch {
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
