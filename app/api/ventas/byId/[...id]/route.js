import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Venta from "@/models/venta";
import RutaDespacho from "@/models/rutaDespacho";
import Vehiculo from "@/models/vehiculo";
import User from "@/models/user";

export async function GET(request, { params }) {
    await connectMongoDB();

    const id = params?.id?.[0];
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "ID de venta inválido" }, { status: 400 });
    }

    // Buscar la venta y poblar historialEstados
    const venta = await Venta.findById(id).lean();
    if (!venta) {
        return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    }

    // Buscar la ruta de despacho asociada a la venta (si existe)
    const rutaDespacho = await RutaDespacho.findOne({ ventaIds: venta._id })
        .lean();

    let ruta = null;
    if (rutaDespacho) {
        // Buscar datos del vehículo
        let vehiculo = null;
        if (rutaDespacho.vehiculoId) {
            const v = await Vehiculo.findById(rutaDespacho.vehiculoId).lean();
            if (v) {
                vehiculo = {
                    _id: v._id,
                    patente: v.patente,
                    marca: v.marca,
                    modelo: v.modelo
                };
            }
        }

        // Buscar datos del chofer
        let chofer = null;
        if (rutaDespacho.choferId) {
            const c = await User.findById(rutaDespacho.choferId).lean();
            if (c) {
                chofer = {
                    _id: c._id,
                    nombre: c.name,
                    email: c.email
                };
            }
        }

        ruta = {
            _id: rutaDespacho._id,
            estado: rutaDespacho.estado,
            historialEstado: rutaDespacho.historialEstado,
            historialCarga: rutaDespacho.historialCarga,
            vehiculo,
            chofer
        };
    }

    return NextResponse.json({
        venta: {
            ...venta,
            historialEstados: venta.historialEstados
        },
        rutaDespacho: ruta
    });
}