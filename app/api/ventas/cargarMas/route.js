import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Vehiculo from "@/models/vehiculo";
import Cliente from "@/models/cliente";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import { TIPO_ESTADO_VENTA } from "@/app/utils/constants";
import DetalleVenta from "@/models/detalleVenta";
import Direccion from "@/models/direccion";
import ItemCatalogo from "@/models/itemCatalogo";
import Venta from "@/models/venta";

export async function GET(request) {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    if (!mongoose.models.ItemCatalogo) {
        mongoose.model("ItemCatalogo", ItemCatalogo.schema);
    }
    if (!mongoose.models.Direccion) {
        mongoose.model("Direccion", Direccion.schema);
    }
    if (!mongoose.models.CategoriaCatalogo) {
        mongoose.model("CategoriaCatalogo", CategoriaCatalogo.schema);
    }
    if (!mongoose.models.SubcategoriaCatalogo) {
        mongoose.model("SubcategoriaCatalogo", SubcategoriaCatalogo.schema);
    }
    if (!mongoose.models.Vehiculo) {
        mongoose.model("Vehiculo", Vehiculo.schema);
    }

    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get("fecha");
    if (!fecha) {
        return NextResponse.json({ error: "Falta el parámetro 'fecha'" }, { status: 400 });
    }

    const ultimaFecha = new Date(fecha);
    console.log("Fetching ventas in 'borrador' state > last date:", ultimaFecha);

    const ventas = await Venta.find({
        $or: [{
            estado: TIPO_ESTADO_VENTA.por_asignar,            
        }, {
            estado: {
                $in: [
                    TIPO_ESTADO_VENTA.pagado,
                    TIPO_ESTADO_VENTA.entregado
                ]
            }
        }],
        fecha: { $lt: ultimaFecha }
    })
    .sort({ fecha: -1 }) // Ordenar por fecha descendente (más reciente primero)
    .limit(25)
    .lean();
    console.log(`Fetched ${ventas.length} ventas in 'borrador' state`);

    const pedidos = await Promise.all(
        ventas.map(async (venta) => {
            // Fetch cliente details
            const cliente = await Cliente.findById(venta.clienteId).lean();
            const clienteNombre = cliente?.nombre || "Desconocido";
            const clienteRut = cliente?.rut || "Desconocido";

            // Fetch items for the venta
            const items = await DetalleVenta.find({ ventaId: venta._id }).lean();
            const itemsWithNames = await Promise.all(
                items.map(async (item) => {
                    const subcategoria = await SubcategoriaCatalogo.findById(item.subcategoriaCatalogoId).lean();
                    const categoria = subcategoria
                        ? await CategoriaCatalogo.findById(subcategoria.categoriaCatalogoId).lean()
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
                comentario: venta.comentario || "",
                clienteId: venta.clienteId,
                clienteNombre,
                clienteRut,
                estado: venta.estado,
                fecha: venta.fecha,
                items: itemsWithNames
            };
        })
    );
    
    return NextResponse.json({ pedidos });
}