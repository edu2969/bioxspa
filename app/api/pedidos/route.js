import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Venta from "@/models/venta";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";

export async function GET() {
    try {
        console.log("Fetching Pedidos...");
        await connectMongoDB();

        const ventas = await Venta.find({
            estado: { $in: [TIPO_ESTADO_VENTA.preparacion, TIPO_ESTADO_VENTA.reparto] },
        })
            .populate("clienteId", "nombre rut direccion")
            .populate({
                path: "detalleVentas",
                populate: [
                    {
                        path: "itemsCatalogoId",
                        select: "codigo createdAt",
                    },
                    {
                        path: "subcategoriaCatalogoId",
                        select: "nombre categoriaCatalogoId",
                        populate: {
                            path: "categoriaCatalogoId",
                            select: "nombre",
                        },
                    },
                ],
            })
            .sort({ updatedAt: -1 });

        const result = ventas.map((venta) => ({
            cliente: {
                nombre: venta.clienteId?.nombre,
                rut: venta.clienteId?.rut,
                direccion: venta.clienteId?.direccion,
            },
            fechaPedido: venta.updatedAt,
            detalles: venta.detalleVentas.map((detalle) => ({
                nombreCategoria:
                    detalle.subcategoriaCatalogoId?.categoriaCatalogoId?.nombre +
                    " " +
                    detalle.subcategoriaCatalogoId?.nombre,
                itemCatalogo:
                    detalle.itemsCatalogoId?.codigo +
                    " " +
                    detalle.itemsCatalogoId?.createdAt,
            })),
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching Pedidos:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}