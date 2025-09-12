import { connectMongoDB } from "@/lib/mongodb";
import Sucursal from "@/models/sucursal";
import Venta from "@/models/venta";
import { NextResponse } from "next/server";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

// GET all sucursales
export async function GET() {
    try {
        await connectMongoDB();
        const sucursales = await Sucursal.find({ visible: true }).select("_id nombre").sort({ prioridad: 1 }).lean();

        const ventas = await Venta.find({ 
            estado: { 
            $nin: [
                TIPO_ESTADO_VENTA.borrador, TIPO_ESTADO_VENTA.anulado, 
                TIPO_ESTADO_VENTA.pagado, TIPO_ESTADO_VENTA.rechazado,
                TIPO_ESTADO_VENTA.entregado
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