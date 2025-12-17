import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import RutaDespacho from "@/models/rutaDespacho";
import Vehiculo from "@/models/vehiculo";
import Venta from "@/models/venta";
import DetalleVenta from "@/models/detalleVenta";
import ItemCatalogo from "@/models/itemCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import Cliente from "@/models/cliente";
import { IGestorDeCargaView, IVentaActual, IDetalleVentaActual, ICilindro } from "@/components/prefabs/types";
import { TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";

export async function GET(req: Request) {
    try {
        await connectMongoDB();
        if (!mongoose.models.Cliente) {
            mongoose.model("Cliente", Cliente.schema);
        }
        const { searchParams } = new URL(req.url);
        const vehiculoId = searchParams.get("vehiculoId");
        
        if (vehiculoId == null) {
            return NextResponse.json({ error: "Missing vehiculoId parameter" }, { status: 400 });
        }

        // Buscar el vehículo y verificar que tenga chofer asignado
        const vehiculo = await Vehiculo.findById(vehiculoId);
        if (!vehiculo) {
            return NextResponse.json({ error: "Vehiculo not found" }, { status: 404 });
        }

        if (!vehiculo.choferIds || vehiculo.choferIds.length === 0) {
            return NextResponse.json({ error: "No chofer assigned to vehicle" }, { status: 400 });
        }

        // Buscar la ruta de despacho activa para el vehículo
        const rutaDespacho = await RutaDespacho.findOne({ 
            vehiculoId: vehiculoId,
            estado: { 
                $nin: [
                    TIPO_ESTADO_RUTA_DESPACHO.a_reasignar, 
                    TIPO_ESTADO_RUTA_DESPACHO.cancelado, TIPO_ESTADO_RUTA_DESPACHO.anulado,
                    TIPO_ESTADO_RUTA_DESPACHO.terminado
                ]
            }
         });
        if (!rutaDespacho) {
            return NextResponse.json({ error: "No active route found for vehicle" }, { status: 404 });
        }

        // Obtener los cilindros cargados en el vehículo
        const cilindros: ICilindro[] = [];
        if (rutaDespacho.cargaItemIds && rutaDespacho.cargaItemIds.length > 0) {
            const itemsCargados = await ItemCatalogo.find({ 
                _id: { $in: rutaDespacho.cargaItemIds } 
            }).populate('subcategoriaCatalogoId');

            for (const item of itemsCargados) {
                const subcategoria = await SubcategoriaCatalogo.findById(item.subcategoriaCatalogoId);
                const categoria = await CategoriaCatalogo.findById(subcategoria?.categoriaCatalogoId);
                
                cilindros.push({
                    elementos: categoria?.elemento || '',
                    peso: subcategoria?.cantidad || 0,
                    altura: 0, // No disponible en el schema actual
                    radio: 0,  // No disponible en el schema actual
                    sinSifon: subcategoria?.sinSifon || false,
                    esIndustrial: categoria?.esIndustrial || false,
                    esMedicinal: categoria?.esMedicinal || false,
                    estado: item.estado
                });
            }
        }

        // Obtener las ventas de la ruta
        const ventas = await Venta.find({ 
            _id: { $in: rutaDespacho.ventaIds } 
        }).populate('clienteId');

        const ventasActuales: IVentaActual[] = [];

        for (const venta of ventas) {
            const detallesVenta = await DetalleVenta.find({ ventaId: venta._id })
                .populate('subcategoriaCatalogoId')
                .populate('itemCatalogoIds');

            const detalles: IDetalleVentaActual[] = [];
            let totalCilindros = 0;
            let itemsCompletados = 0;

            for (const detalle of detallesVenta) {
                const subcategoria = await SubcategoriaCatalogo.findById(detalle.subcategoriaCatalogoId);
                const categoria = subcategoria ? await CategoriaCatalogo.findById(subcategoria.categoriaCatalogoId) : null;

                let tipo: 'cilindro' | 'servicio' | 'insumo' | 'flete' = 'cilindro';
                if (categoria) {
                    if (categoria.esIndustrial || categoria.esMedicinal) {
                        tipo = 'cilindro';
                    } else {
                        tipo = 'servicio';
                    }
                }

                const restantes = detalle.cantidad - (detalle.itemCatalogoIds?.length || 0);
                
                detalles.push({
                    tipo,
                    descripcion: detalle.glosa || subcategoria?.nombre || '',
                    cantidad: detalle.cantidad,
                    restantes,
                    multiplicador: 1,
                    unidad: subcategoria?.unidad || 'unidad',
                    elemento: categoria?.elemento,
                    esIndustrial: categoria?.esIndustrial,
                    esMedicinal: categoria?.esMedicinal,
                    sinSifon: subcategoria?.sinSifon
                });

                if (tipo === 'cilindro') {
                    totalCilindros += detalle.cantidad;
                    if (restantes === 0) itemsCompletados += detalle.cantidad;
                }
            }

            const porcentajeCompletado = totalCilindros > 0 ? (itemsCompletados / totalCilindros) * 100 : 0;

            let tipoVenta: 'preparacion' | 'retiroEnLocal' | 'ot' | 'traslado' | 'otros' = 'otros';
            switch (venta.tipo) {
                case 1: tipoVenta = 'preparacion'; break;
                case 2: tipoVenta = 'traslado'; break;
                case 3: tipoVenta = 'ot'; break;
                default: tipoVenta = 'otros';
            }

            ventasActuales.push({
                nombreCliente: venta.clienteId?.nombre || '',
                rutCliente: venta.clienteId?.rut || '',
                comentario: venta.comentario,
                tipo: tipoVenta,
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
            ok: true, 
            cilindros,
            gestorCarga 
        });

    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}