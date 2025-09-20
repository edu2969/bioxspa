import { connectMongoDB } from "@/lib/mongodb";
import Sucursal from "@/models/sucursal";
import Venta from "@/models/venta";
import { NextResponse } from "next/server";
import { TIPO_CARGO, TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import User from "@/models/user";
import Cargo from "@/models/cargo";

// GET all sucursales: Trae _id y nombre de las sucursales a las cuales el usuario en sessión tiene acceso.
export async function GET() {
    try {
        await connectMongoDB();

        console.log("Fetching server session...");
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        console.log(`Fetching user with ID: ${userId}`);
        const user = await User.findById(userId).lean();
        if (!user) {
            console.warn(`User not found for ID: ${userId}`);
            return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
        }
        console.log("`Fetching cargo...");
        const cargos = await Cargo.find({ 
            userId,
            tipo: { $in: [
                TIPO_CARGO.gerente, TIPO_CARGO.encargado, 
                TIPO_CARGO.responsable, TIPO_CARGO.cobranza
            ] }
        }).populate("sucursalId dependenciaId").lean();

        if (cargos.length === 0) {
            console.warn(`Cargos not found for ID: ${userId}`);
            return NextResponse.json({ ok: false, error: "Cargos not found" }, { status: 404 });
        }

        let sucursalIds = []
        cargos.forEach(cargo => {
            sucursalIds.push(cargo.sucursalId ? cargo.sucursalId : cargo.dependenciaId.sucursalId);
        });

        const sucursales = await Sucursal.find({ _id: {
            $in: sucursalIds
        }, visible: true }).select("_id nombre").sort({ prioridad: 1 }).lean();

        const ventas = await Venta.find({ 
            estado: { 
            $in: [
                TIPO_ESTADO_VENTA.borrador, TIPO_ESTADO_VENTA.cotizacion,
                TIPO_ESTADO_VENTA.anulado, TIPO_ESTADO_VENTA.rechazado
            ]
            },
            porCobrar: false
        }).lean();

        // Contar ventas activas por sucursal
        const ventasPorSucursal = ventas.reduce((acc, venta) => {
            const sucursalId = venta.sucursalId;
            if (sucursalId) {
                acc[sucursalId] = (acc[sucursalId] || 0) + 1;
            }
            return acc;
        }, {});

        // Adornar sucursales con contador de ventas activas
        const sucursalesConVentas = sucursales.map(sucursal => ({
            ...sucursal,
            ventasActivas: ventasPorSucursal[sucursal._id.toString()] || 0
        }));

        return NextResponse.json({ sucursales: sucursalesConVentas });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}