import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Cliente from "@/models/cliente";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import DetalleVenta from "@/models/detalleVenta";
import Venta from "@/models/venta";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import { IVenta } from "@/types/venta";
import { ICliente } from "@/types/cliente";
import { IDetalleVenta } from "@/types/detalleVenta";
import { ISubcategoriaCatalogo } from "@/types/subcategoriaCatalogo";
import { ICategoriaCatalogo } from "@/types/categoriaCatalogo";

export async function GET(request: NextRequest) {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    if (!mongoose.models.CategoriaCatalogo) {
        mongoose.model("CategoriaCatalogo", CategoriaCatalogo.schema);
    }
    if (!mongoose.models.SubcategoriaCatalogo) {
        mongoose.model("SubcategoriaCatalogo", SubcategoriaCatalogo.schema);
    }

    const { searchParams } = new URL(request.url);
    const sucursalId = searchParams.get("sucursalId");
    if (!sucursalId) {
        return NextResponse.json({ ok: false, error: "sucursalId is required" }, { status: 400 });
    }

    console.log("Fetching ventas in 'borrador' state...");
    const ventas = await Venta.find({
        sucursalId,
        estado: {
            $in: [
                TIPO_ESTADO_VENTA.por_asignar,
                TIPO_ESTADO_VENTA.pagado,
                TIPO_ESTADO_VENTA.entregado,
                TIPO_ESTADO_VENTA.cerrado,
            ]
        }
    })
    .sort({ fecha: -1 }) // Ordenar por fecha descendente (más reciente primero)
    .limit(25)
    .lean<IVenta[]>();
    console.log(`Fetched ${ventas.length} ventas in 'borrador' state`);

    const pedidos = await Promise.all(
        ventas.map(async (venta: IVenta) => {
            // Fetch cliente details
            const cliente = await Cliente.findById(venta.clienteId).lean<ICliente>();
            const clienteNombre = cliente?.nombre || "Desconocido";
            const clienteRut = cliente?.rut || "Desconocido";

            // Fetch items for the venta
            const items = await DetalleVenta.find({ ventaId: venta._id }).lean<IDetalleVenta[]>();
            const itemsWithNames = await Promise.all(
                items.map(async (item) => {
                    const subcategoria = await SubcategoriaCatalogo.findById(item.subcategoriaCatalogoId).lean<ISubcategoriaCatalogo>();
                    const categoria = subcategoria
                        ? await CategoriaCatalogo.findById(subcategoria.categoriaCatalogoId).lean<ICategoriaCatalogo>()
                        : null;

                    const categoriaNombre = categoria?.nombre || "Desconocido";
                    const subcategoriaNombre = subcategoria?.nombre || "Desconocido";

                    return {
                        ...item,
                        nombre: `${categoriaNombre} - ${subcategoriaNombre}`,
                    };
                })
            );

            return {
                _id: venta._id,
                tipo: venta.tipo,
                comentario: venta.comentario || "",
                clienteId: venta.clienteId,
                clienteNombre,
                clienteRut,
                estado: venta.estado,
                despachoEnLocal: false,
                fecha: venta.fecha,
                items: itemsWithNames
            };
        })
    );

    return NextResponse.json({
        pedidos
    });
}