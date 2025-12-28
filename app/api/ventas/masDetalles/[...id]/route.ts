import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/utils/authOptions";
import { connectMongoDB } from "@/lib/mongodb";
import Venta from "@/models/venta";
import Cliente from "@/models/cliente";
import User from "@/models/user";
import Sucursal from "@/models/sucursal";
import Dependencia from "@/models/dependencia";
import Direccion from "@/models/direccion";
import DocumentoTributario from "@/models/documentoTributario";
import DetalleVenta from "@/models/detalleVenta";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import ItemCatalogo from "@/models/itemCatalogo";
import RutaDespacho from "@/models/rutaDespacho";
import Vehiculo from "@/models/vehiculo";
import mongoose from "mongoose";
import { IVenta } from "@/types/venta";
import { IDetalleVenta } from "@/types/detalleVenta";

export async function GET(request: Request, { params }: { params: Promise<{ id: string[] }> }) {
    try {
        console.log("Connecting to MongoDB...");
        await connectMongoDB();
        console.log("MongoDB connected.");

        // Register models if not already registered
        if (!mongoose.models.User) {
            mongoose.model("User", User.schema);
        }
        if (!mongoose.models.Sucursal) {
            mongoose.model("Sucursal", Sucursal.schema);
        }
        if (!mongoose.models.Dependencia) {
            mongoose.model("Dependencia", Dependencia.schema);
        }
        if (!mongoose.models.Direccion) {
            mongoose.model("Direccion", Direccion.schema);
        }
        if (!mongoose.models.DocumentoTributario) {
            mongoose.model("DocumentoTributario", DocumentoTributario.schema);
        }
        if (!mongoose.models.Venta) {
            mongoose.model("Venta", Venta.schema);
        }
        if (!mongoose.models.DetalleVenta) {
            mongoose.model("DetalleVenta", DetalleVenta.schema);
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
        if (!mongoose.models.RutaDespacho) {
            mongoose.model("RutaDespacho", RutaDespacho.schema);
        }
        if (!mongoose.models.Vehiculo) {
            mongoose.model("Vehiculo", Vehiculo.schema);
        }
        if (!mongoose.models.Cliente) {
            mongoose.model("Cliente", Cliente.schema);
        }

        console.log("Fetching server session...");
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        // Await params before accessing its properties
        const resolvedParams = await params;
        const ventaId = resolvedParams.id[0];
        console.log(`Fetching venta details for ID: ${ventaId}`);

        if (!mongoose.Types.ObjectId.isValid(ventaId)) {
            return NextResponse.json({ ok: false, error: "Invalid venta ID" }, { status: 400 });
        }

        const venta = await Venta.findById(ventaId)
            .populate({
                path: "clienteId",
                model: "Cliente",
                select: "nombre giro email telefono rut"
            })
            .populate({
                path: "vendedorId",
                model: "User",
                select: "name email"
            })
            .populate({
                path: "documentoTributarioId",
                model: "DocumentoTributario",
                select: "nombre"
            })
            .populate({
                path: "comentariosCobro.userId",
                model: "User",
                select: "name email"
            })
            .lean<IVenta>();

        if (!venta) {
            console.warn(`No venta found for ID: ${ventaId}`);
            return NextResponse.json({ ok: false, error: "Venta not found" }, { status: 404 });
        }

        console.log("Fetching detalles de venta...");
        // Buscar detalles de venta con poblaciones completas
        const detallesVenta = await DetalleVenta.find({ ventaId: ventaId })
            .populate({
                path: "subcategoriaCatalogoId",
                model: "SubcategoriaCatalogo",
                populate: {
                    path: "categoriaCatalogoId",
                    model: "CategoriaCatalogo"
                }
            })
            .populate({
                path: "itemCatalogoIds",
                model: "ItemCatalogo"
            })
            .lean<IDetalleVenta[]>();

        const ventaDetails = {
            _id: venta._id,
            fecha: venta.fecha,
            estado: venta.estado,
            porCobrar: venta.porCobrar,
            valorNeto: venta.valorNeto,
            valorIva: venta.valorIva,
            valorTotal: venta.valorTotal,
            vendedor: {
                _id: venta.vendedorId?._id,
                nombre: venta.vendedorId?.name,
                email: venta.vendedorId?.email
            },
            cliente: {
                _id: venta.clienteId?._id,
                nombre: venta.clienteId?.nombre,
                giro: venta.clienteId?.giro,
                email: venta.clienteId?.email,
                telefono: venta.clienteId?.telefono,
                rut: venta.clienteId?.rut
            },
            entregasEnLocal: venta.entregasEnLocal || [],
            // Nuevos campos agregados
            detalles: detallesVenta?.map(detalle => ({
                _id: detalle._id,
                estado: 'Pendiente',
                glosa: detalle.glosa,
                codigo: detalle.codigo,
                codigoCilindro: detalle.codigoCilindro,
                subcategoriaCatalogoId: detalle.subcategoriaCatalogoId ? {
                    _id: detalle.subcategoriaCatalogoId._id,
                    nombre: detalle.subcategoriaCatalogoId.nombre,
                    cantidad: detalle.subcategoriaCatalogoId.cantidad,
                    unidad: detalle.subcategoriaCatalogoId.unidad,
                    sinSifon: detalle.subcategoriaCatalogoId.sinSifon,
                    urlImagen: detalle.subcategoriaCatalogoId.urlImagen,
                    categoriaCatalogoId: detalle.subcategoriaCatalogoId.categoriaCatalogoId ? {
                        _id: detalle.subcategoriaCatalogoId.categoriaCatalogoId._id,
                        nombre: detalle.subcategoriaCatalogoId.categoriaCatalogoId.nombre,
                        tipo: detalle.subcategoriaCatalogoId.categoriaCatalogoId.tipo,
                        elemento: detalle.subcategoriaCatalogoId.categoriaCatalogoId.elemento,
                        esIndustrial: detalle.subcategoriaCatalogoId.categoriaCatalogoId.esIndustrial,
                        esMedicinal: detalle.subcategoriaCatalogoId.categoriaCatalogoId.esMedicinal
                    } : null
                } : null,
                itemCatalogoIds: detalle.itemCatalogoIds?.map(item => ({
                    _id: item._id,
                    codigo: item.codigo,
                    estado: item.estado
                })) || [],
                tipo: detalle.tipo,
                cantidad: detalle.cantidad,
                especifico: detalle.especifico,
                neto: detalle.neto,
                iva: detalle.iva,
                total: detalle.total
            })) || []
        };

        console.log("Returning venta details.");
        return NextResponse.json({ ok: true, venta: ventaDetails });

    } catch (error) {
        console.error("ERROR", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}