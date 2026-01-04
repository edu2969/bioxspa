import { connectMongoDB } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import mongoose from "mongoose";
import RutaDespacho from "@/models/rutaDespacho";
import Venta from "@/models/venta";
import DetalleVenta from "@/models/detalleVenta";
import ItemCatalogo from "@/models/itemCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import { USER_ROLE } from "@/app/utils/constants";
import { IRutaDespacho } from "@/types/rutaDespacho";
import { IItemDeCargaView } from "@/types/types";
import User from "@/models/user";
import Cargo from "@/models/cargo";
import { IUser } from "@/types/user";

export async function GET(request: NextRequest) {
    try {
        console.log("GET request received for listado de descarga.");
        
        await connectMongoDB();
        console.log("MongoDB connected.");

        // Registrar modelos si no están registrados
        if (!mongoose.models.Venta) {
            mongoose.model("Venta", Venta.schema);
        }
        if (!mongoose.models.DetalleVenta) {
            mongoose.model("DetalleVenta", DetalleVenta.schema);
        }
        if (!mongoose.models.ItemCatalogo) {
            mongoose.model("ItemCatalogo", ItemCatalogo.schema);
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

        const { searchParams } = new URL(request.url);
        const rutaId = searchParams.get('rutaId');
        
        if (!rutaId) {
            return NextResponse.json({ ok: false, error: "rutaId es requerido" }, { status: 400 });
        }

        console.log(`Fetching rutaDespacho with ID: ${rutaId}`);
        const rutaDespacho = await RutaDespacho.findById(rutaId)
            .populate({
                path: 'ventaIds',
                model: 'Venta',
                select: '_id clienteId direccionDespachoId estado tipo comentario',
                populate: {
                    path: 'clienteId',
                    select: '_id nombre rut giro'
                }
            })
            .populate({
                path: 'cargaItemIds',
                model: 'ItemCatalogo',
                select: '_id codigo subcategoriaCatalogoId fechaMantencion',
                populate: {
                    path: 'subcategoriaCatalogoId',
                    model: 'SubcategoriaCatalogo',
                    select: '_id nombre cantidad unidad sinSifon categoriaCatalogoId',
                    populate: {
                        path: 'categoriaCatalogoId',
                        model: 'CategoriaCatalogo',
                        select: '_id nombre elemento esIndustrial esMedicinal gas'
                    }
                }
            })
            .lean<IRutaDespacho>();

        if (!rutaDespacho) {
            console.warn(`RutaDespacho not found for ID: ${rutaId}`);
            return NextResponse.json({ ok: false, error: "Ruta no encontrada" }, { status: 404 });
        }

        // Verificar que el usuario tenga acceso a esta ruta
        if (String(rutaDespacho.choferId._id) !== session.user.id) {
            console.warn("User doesn't have access to this ruta");
            return NextResponse.json({ ok: false, error: "Access denied" }, { status: 403 });
        }

        // Obtener detalles de venta para todas las ventas de la ruta
        const ventaIds = rutaDespacho.ventaIds.map(v => v._id);
        const detallesVenta = await DetalleVenta.find({
            ventaId: { $in: ventaIds }
        })
        .populate({
            path: 'subcategoriaCatalogoId',
            model: 'SubcategoriaCatalogo',
            select: '_id nombre cantidad unidad sinSifon categoriaCatalogoId',
            populate: {
                path: 'categoriaCatalogoId',
                model: 'CategoriaCatalogo',
                select: '_id nombre elemento esIndustrial esMedicinal gas'
            }
        })
        .populate({
            path: 'itemCatalogoIds',
            model: 'ItemCatalogo',
            select: '_id codigo fechaMantencion'
        })
        .lean();

        // Agrupar detalles por venta
        const detallesPorVenta = detallesVenta.reduce((acc, detalle) => {
            const ventaId = detalle.ventaId.toString();
            if (!acc[ventaId]) acc[ventaId] = [];
            acc[ventaId].push(detalle);
            return acc;
        }, {} as Record<string, any[]>);

        // Crear el listado de descarga según IListadoDescargaView
        const itemsDescarga: any[] = [];

        for (const venta of rutaDespacho.ventaIds) {
            const detalles = detallesPorVenta[venta._id.toString()] || [];
            
            for (const detalle of detalles) {
                const subcategoria = detalle.subcategoriaCatalogoId;
                const categoria = subcategoria?.categoriaCatalogoId;
                
                // Calcular restantes: multiplicador menos los ya escaneados en itemCatalogoIds
                const multiplicador = detalle.cantidad || 0;
                const yaEscaneados = detalle.itemCatalogoIds?.length || 0;
                const restantes = Math.max(0, multiplicador - yaEscaneados);

                // Crear IItemDeCargaView que extiende ICilindroView
                const itemDescarga: IItemDeCargaView = {
                    // Propiedades de ICilindroView
                    _id: subcategoria?._id?.toString() || "",
                    subcategoriaCatalogoId: subcategoria?._id?.toString() || "",
                    cantidad: subcategoria?.cantidad || 0,
                    unidad: subcategoria?.unidad || "",
                    nombreGas: categoria?.gas || categoria?.nombre || "",
                    sinSifon: subcategoria?.sinSifon || false,
                    elemento: categoria?.elemento || "",
                    esIndustrial: categoria?.esIndustrial || false,
                    esMedicinal: categoria?.esMedicinal || false,
                    vencido: false, 
                    multiplicador: multiplicador,
                    restantes: restantes
                };

                itemsDescarga.push(itemDescarga);
            }
        }

        console.log(`Returning listado de descarga con ${itemsDescarga.length} items`);
        
        // Buscar encargados de la dependencia
        const encargados = await User.find({
            role: {
                $in: [USER_ROLE.encargado, USER_ROLE.responsable, USER_ROLE.despacho]
            }
        }).lean();

        const cargos = await Cargo.find({
            dependenciaId: rutaDespacho.dependenciaId,
            userId: { $in: encargados.map(e => e._id) }
        }).populate({
            path: 'userId',
            select: 'name'
        }).lean();
        
        // Respuesta que respeta exactamente IListadoDescargaView
        return NextResponse.json({             
            encargado: cargos.map(c => (c.userId as IUser).name).join(", "),
            cilindros: itemsDescarga
        });

    } catch (error) {
        console.error("Error al obtener listado de descarga:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}