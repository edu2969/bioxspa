import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import RutaDespacho from "@/models/rutaDespacho";
import Venta from "@/models/venta";
import DetalleVenta from "@/models/detalleVenta";
import Cliente from "@/models/cliente";
import { IGestorDeCargaView, IVentaActual, IDetalleVentaActual, ICilindro } from "@/components/prefabs/types";
import { TIPO_CATEGORIA_CATALOGO, TIPO_ESTADO_RUTA_DESPACHO, USER_ROLE } from "@/app/utils/constants";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import Cargo from "@/models/cargo";
import User from "@/models/user";
import { IUser } from "@/types/user";
import { IRutaDespacho } from "@/types/rutaDespacho";

export async function GET() {
    try {
        console.log("GET /api/flota/gestorCarga called...");
        await connectMongoDB();
        if (!mongoose.models.Cliente) {
            mongoose.model("Cliente", Cliente.schema);
        }

        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const user = await User.findById(userId).select('role').lean<IUser>();
        if(!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }        
        const cargo = await Cargo.findOne({ userId });
        if (!cargo) {
            return NextResponse.json({ error: "User has no assigned cargo" }, { status: 400 });
        }
        const qry: {
            dependenciaId?: string;
            sucursalId?: string;
            estados?: { $in: number[] };
        } = cargo.dependenciaId ?
            { dependenciaId: cargo.dependenciaId } :
            { sucursalId: cargo.sucursalId };
        let atencionRecepcion = false;
        const estados = [TIPO_ESTADO_RUTA_DESPACHO.preparacion];
        if(user.role = USER_ROLE.conductor) {
            estados.push(TIPO_ESTADO_RUTA_DESPACHO.en_ruta);
        }
        if(user.role === USER_ROLE.encargado || user.role === USER_ROLE.responsable) {
            estados.push(TIPO_ESTADO_RUTA_DESPACHO.descarga);
            atencionRecepcion = true;
        }
        qry.estados = { $in: estados };
        const ventas = await Venta.find(qry).select('_id direccionDespachoId fecha').populate({
            path: 'clienteId',
            select: 'nombre rut direccionesDespacho',
            populate: {
                path: 'direccionesDespacho',
                select: 'nombre'
            }
        }).lean();

        const ventasActuales: IVentaActual[] = [];
        for (const venta of ventas) {
            const detallesVenta = await DetalleVenta.find({ ventaId: venta._id })
                .populate('subcategoriaCatalogoId')
                .populate('itemCatalogoIds');

            const detalles: IDetalleVentaActual[] = [];
            let totalCilindros = 0;
            let itemsCompletados = 0;
            const estadoVenta = venta.estado;
            const rutaDespacho = await RutaDespacho.findOne({ 
                ventaId: venta._id, 
                estado: { $in: estados } 
            })
            .populate({
                path: 'cargaItemIds.subcategoriaCatalogoId',
                model: 'SubcategoriaCatalogo',
                select: '_id'
            })
            .lean<IRutaDespacho>();

            const entregaEnLocal = !venta.direccionDespachoId;

            const contadoresSubcategoriasCarga: { [key: string]: number } = {};
            if(rutaDespacho && rutaDespacho.cargaItemIds) {
                for (const cargaItem of rutaDespacho.cargaItemIds) {
                    const subcatId = String(cargaItem.subcategoriaCatalogoId?._id);
                    contadoresSubcategoriasCarga[subcatId] = (contadoresSubcategoriasCarga[subcatId] || 0) + 1;
                }
            }
            const contadoresSubcategoriasVenta: { [key: string]: number } = {};
            for (const detalle of detallesVenta) {
                const subcatId = String(detalle.subcategoriaCatalogoId?._id);
                contadoresSubcategoriasVenta[subcatId] = (contadoresSubcategoriasVenta[subcatId] || 0) + detalle.cantidad;
            }

            for (const detalle of detallesVenta) {
                const tipo = detalle.tipo;

                const procesados = entregaEnLocal 
                    ? contadoresSubcategoriasVenta[String(detalle.subcategoriaCatalogoId?._id)] || 0
                    : contadoresSubcategoriasCarga[String(detalle.subcategoriaCatalogoId?._id)] || 0;

                const restantes = detalle.multiplicador - procesados;
                
                detalles.push({
                    tipo,
                    descripcion: detalle.glosa || detalle.subcategoria?.nombre || '',
                    cantidad: detalle.cantidad,
                    restantes,
                    multiplicador: detalle.multiplicador,
                    unidad: detalle.subcategoria.unidad || 'unidad',
                    elemento: detalle.subcategoria.categoria?.elemento,
                    esIndustrial: detalle.subcategoria.categoria?.esIndustrial,
                    esMedicinal: detalle.subcategoria.categoria?.esMedicinal,
                    sinSifon: detalle.subcategoria?.sinSifon
                });

                if (tipo === TIPO_CATEGORIA_CATALOGO.cilindro) {
                    totalCilindros += detalle.cantidad;
                    if (restantes === 0) itemsCompletados += detalle.cantidad;
                }
            }

            const porcentajeCompletado = totalCilindros > 0 ? (itemsCompletados / totalCilindros) * 100 : 0;

            ventasActuales.push({
                nombreCliente: venta.clienteId?.nombre || '',
                rutCliente: venta.clienteId?.rut || '',
                comentario: venta.comentario,
                tipo: venta.tipo,
                totalCilindros,
                detalles,
                porcentajeCompletado
            });
        }

        const porcentajeTotal = ventasActuales.length > 0 
            ? ventasActuales.reduce((sum, v) => sum + v.porcentajeCompletado, 0) / ventasActuales.length 
            : 0;

        const gestorCarga: IGestorDeCargaView = {
            ventas: ventasActuales,
            porcentajeCompletado: porcentajeTotal
        };

        return NextResponse.json({ 
            gestorCarga 
        });

    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}