import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { TIPO_CARGO } from "@/app/utils/constants";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/utils/authOptions";
import Cargo from "@/models/cargo";
import DetalleVenta from "@/models/detalleVenta";
import RutaDespacho from "@/models/rutaDespacho";
import Dependencia from "@/models/dependencia";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import User from "@/models/user";
import Vehiculo from "@/models/vehiculo";
import Venta from "@/models/venta";
import ItemCatalogo from "@/models/itemCatalogo";
import Cliente from "@/models/cliente";
import Direccion from "@/models/direccion";
import { TIPO_ESTADO_VENTA, TIPO_ESTADO_RUTA_DESPACHO, TIPO_ORDEN } from "@/app/utils/constants";
import { ICargo } from "@/types/cargo";
import { IVenta } from "@/types/venta";
import { IRutaDespacho } from "@/types/rutaDespacho";
import { ICargaDespachoView } from "@/types/types";

export async function GET() {
    try {
        console.log("Connecting to MongoDB...");
        await connectMongoDB();
        console.log("MongoDB connected.");

        if (!mongoose.models.User) {
            mongoose.model("User", User.schema);
        }
        if (!mongoose.models.Dependencia) {
            mongoose.model("Dependencia", Dependencia.schema);
        }
        if (!mongoose.models.SubcategoriaCatalogo) {
            mongoose.model("SubcategoriaCatalogo", SubcategoriaCatalogo.schema);
        }
        if (!mongoose.models.CategoriaCatalogo) {
            mongoose.model("CategoriaCatalogo", CategoriaCatalogo.schema);
        }
        if (!mongoose.models.Vehiculo) {
            mongoose.model("Vehiculo", Vehiculo.schema);
        }
        if (!mongoose.models.Venta) {
            mongoose.model("Venta", Venta.schema);
        }        
        if (!mongoose.models.ItemCatalogo) {
            mongoose.model("ItemCatalogo", ItemCatalogo.schema);
        }
        if (!mongoose.models.Cliente) {
            mongoose.model("Cliente", Cliente.schema);
        }
        if (!mongoose.models.Direccion) {
            mongoose.model("Direccion", Direccion.schema);
        }
        console.log("Fetching server session...");
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        console.log(`Fetching cargo for userId: ${userId}`);
        const cargo = await Cargo.findOne({ 
            userId, 
            tipo: { 
                $in: [
                    TIPO_CARGO.despacho,
                    TIPO_CARGO.responsable
                ]
            }
        }).populate([{
            path: "dependenciaId",
            model: "Dependencia",
            select: "_id direccionId",
        }, {
            path: "sucursalId",
            model: "Sucursal",
            select: "_id direccionId",
        }]).lean<ICargo>();

        if(!cargo) {
            console.warn(`No cargo found for userId: ${userId}`);
            return NextResponse.json({ ok: false, error: "User has no assigned cargo" }, { status: 400 });
        }

        let qry = cargo.dependenciaId ? {
            dependenciaId: cargo.dependenciaId
        } : {
            sucursalId: cargo.sucursalId
        };        

        const choferes = await Cargo.find({...qry, tipo: TIPO_CARGO.conductor }).populate("userId").lean<ICargo[]>();

        const choferIds = choferes?.map(c => c.userId._id) || [];
        console.log("Fetching rutasDespacho for choferes...");
        
        // Create a query that handles both cases
        const rutaQuery = { 
            choferId: { $in: choferIds },
            $or: [
                // For routes in preparacion state, no additional conditions
                { estado: TIPO_ESTADO_RUTA_DESPACHO.preparacion },
                // For routes in descarga state, check that direccionId matches dependenciaId
                { 
                    estado: TIPO_ESTADO_RUTA_DESPACHO.descarga,
                    direccionId: cargo.dependenciaId ? cargo.dependenciaId.direccionId : cargo.sucursalId?.direccionId 
                },
                { estado: TIPO_ESTADO_RUTA_DESPACHO.regreso_confirmado }
            ]
        };
        
        const rutasDespacho = await RutaDespacho.find(rutaQuery)
            .select("ventaIds estado cargaItemIds choferId vehiculoId")      
            .populate({
                path: "cargaItemIds",
                model: "ItemCatalogo",
                select: "_id codigo subcategoriaCatalogoId",
                populate: {
                    path: "subcategoriaCatalogoId",
                    model: "SubcategoriaCatalogo",
                    select: "nombre unidad categoriaCatalogoId cantidad sinSifon",
                    populate: {
                        path: "categoriaCatalogoId",
                        model: "CategoriaCatalogo",
                        select: "nombre tipo gas elemento esIndustrial"
                    }
                }
            })
            .populate({
                path: "choferId",
                model: "User",
                select: "name"
            })
            .populate({
                path: "vehiculoId",
                model: "Vehiculo",
                select: "marca modelo patente"
            })
            .populate({
                path: "ventaIds",
                model: "Venta",
                select: "_id clienteId estado comentario createdAt entregasEnLocal tipo",
                populate: {
                    path: "clienteId",
                    model: "Cliente",
                    select: "_id nombre rut telefono direccionesDespacho",
                    populate: {
                        path: "direccionesDespacho.direccionId",
                        model: "Direccion",
                        select: "_id nombre latitud longitud",
                    }
                }
            })           
            .lean<IRutaDespacho[]>();

        console.log("Fetching detalleVentas...");
        const dependencia = await Dependencia.findOne({ _id: cargo.dependenciaId }).lean();

        console.log("DEPENDENCIA", dependencia);
        if (!dependencia) {
            console.warn(`No dependencia found for dependenciaId: ${cargo.dependenciaId}`);
            return NextResponse.json({ ok: false, error: "No dependencia found for this dependencia" }, { status: 404 });
        }

        console.log("Mapping cargamentos en local...");
        const ventasDespachoEnLocal = await Venta.find({
            estado: { $in: [TIPO_ESTADO_VENTA.por_asignar, TIPO_ESTADO_VENTA.preparacion] },
            direccionDespachoId: null,
            sucursalId: cargo.sucursalId?._id
        }).populate("clienteId").lean<IVenta[]>();
        console.log("Ventas en local", ventasDespachoEnLocal);

        // Buscar los detalles de venta que correspondan a esas ventas
        const ventaIds = rutasDespacho.flatMap(ruta => ruta.ventaIds.map(venta => venta._id))
            .concat(ventasDespachoEnLocal.map(venta => venta._id));
        const detalleVentas = await DetalleVenta.find({ ventaId: { $in: ventaIds } })
            .populate({
                path: "subcategoriaCatalogoId",
                model: "SubcategoriaCatalogo",
                select: "nombre unidad categoriaCatalogoId cantidad sinSifon",
                populate: {
                    path: "categoriaCatalogoId",
                    model: "CategoriaCatalogo",
                    select: "nombre tipo gas elemento esIndustrial"
                }
            })
            .lean();

        console.log("Ids de detalles", detalleVentas.map(dv => dv._id));

        console.log("Mapping cargamentos...");
        const cargamentos: ICargaDespachoView[] = rutasDespacho.map((ruta) => {
            let fechaVentaMasReciente: Date | null = null;
            return {
                rutaId: String(ruta._id),
                ventas: ruta.ventaIds.map((venta) => {
                    const detallesFiltrados = detalleVentas.filter(
                        (detalle) => detalle.ventaId.toString() === venta._id.toString()
                    );     
                    return {
                        ventaId: String(venta._id),
                        tipo: venta.tipo,
                        fecha: venta.createdAt,
                        entregasEnLocal: (venta.entregasEnLocal || []).map(entrega => ({
                            nombreRecibe: entrega.nombreRecibe || null,
                            rutRecibe: entrega.rutRecibe || null,
                            createdAt: entrega.createdAt || new Date()
                        })),
                        detalles: detallesFiltrados.map((detalle) => {
                            const subcategoria = detalle.subcategoriaCatalogoId;
                            
                            if (!fechaVentaMasReciente || venta.createdAt > fechaVentaMasReciente) {
                                fechaVentaMasReciente = venta.createdAt;
                            }
                            
                            return {
                                multiplicador: Number(detalle.cantidad),
                                restantes: detalle.cantidad - ruta.cargaItemIds.filter(item => item.subcategoriaCatalogoId._id?.toString() === subcategoria._id.toString())?.length,
                                itemCatalogoIds: detalle.itemCatalogoIds || [],
                                subcategoriaCatalogoId: subcategoria, 
                            };
                        }),
                        comentario: venta.comentario || null,
                        cliente: {
                            nombre: venta.clienteId?.nombre || null,
                            rut: venta.clienteId?.rut || null,
                            direccion: venta.clienteId?.direccionId || null,
                            telefono: venta.clienteId?.telefono || null,
                            direccionesDespacho: venta.clienteId?.direccionesDespacho?.map((dir) => ({
                                nombre: dir.direccionId?.nombre || null,
                                direccionId: dir.direccionId?._id || null,
                                latitud: dir.direccionId?.latitud || null,
                                longitud: dir.direccionId?.longitud || null
                            })) || []
                        }
                    }
                }),
                nombreChofer: ruta.choferId.name,
                patenteVehiculo: ruta.vehiculoId?.patente || null,
                fechaVentaMasReciente,
                cargaItemIds: ruta.cargaItemIds?.map((item) => ({
                    _id: String(item._id),
                    subcategoriaCatalogoId: item.subcategoriaCatalogoId._id ?? "",                   
                })) || [],
                estado: ruta.estado
            };
        });

        console.log("Adding ventas for despacho en local...");
        cargamentos.push(
            ...ventasDespachoEnLocal.map((venta) => {
            let fechaVentaMasReciente = venta.createdAt;
            return {
                rutaId: null,
                ventas: [
                {
                    ventaId: String(venta._id),
                    tipo: venta.tipo,
                    fecha: venta.createdAt,
                    detalles: detalleVentas
                    .filter(detalle => detalle.ventaId.toString() === venta._id.toString())
                    .map((detalle) => {
                        const subcategoria = detalle.subcategoriaCatalogoId;
                        return {
                            multiplicador: Number(detalle.cantidad),
                            restantes: Number(detalle.cantidad) - (detalle.itemCatalogoIds?.length || 0), 
                            subcategoriaCatalogoId: subcategoria,
                            itemCatalogoIds: detalle.itemCatalogoIds || [],
                        };
                    }),
                    comentario: venta.comentario || null,
                    cliente: {
                    nombre: venta.clienteId?.nombre || null,
                    rut: venta.clienteId?.rut || null,
                    direccion: venta.clienteId?.direccionId || null,
                    telefono: venta.clienteId?.telefono || null,
                    direccionesDespacho: venta.clienteId?.direccionesDespacho?.map((dir) => ({
                        nombre: dir.direccionId?.nombre || null,
                        direccionId: String(dir.direccionId?._id) || null,
                        latitud: dir.direccionId?.latitud || null,
                        longitud: dir.direccionId?.longitud || null
                    })) || []
                    },
                    entregasEnLocal: (venta.entregasEnLocal || []).map(entrega => ({
                        nombreRecibe: entrega.nombreRecibe || null,
                        rutRecibe: entrega.rutRecibe || null,
                        createdAt: entrega.createdAt || new Date()
                    }))
                }
                ],
                nombreChofer: null,
                patenteVehiculo: null,
                fechaVentaMasReciente,
                cargaItemIds: [],
                estado: null,
                retiroEnLocal: true,
            }
            })
        );

        console.log("Returning response with cargamentos.");
        return NextResponse.json({ ok: true, cargamentos });
    } catch (error) {
        console.error("ERROR", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await connectMongoDB();
        const { rutaId } = await request.json();

        if (!rutaId) {
            return NextResponse.json({ error: "rutaId is required" }, { status: 400 });
        }

        // Buscar la ruta de despacho por rutaId
        const ruta = await RutaDespacho.findById(rutaId).populate('ventaIds');
        if (!ruta) {
            return NextResponse.json({ error: "RutaDespacho not found" }, { status: 404 });
        }

        // Obtener todas las ventas de esta ruta
        const ventaIds = (ruta.ventaIds as IVenta[]).map(venta => venta._id);

        // Buscar todos los detalles de estas ventas
        const detallesVentas = await DetalleVenta.find({ 
            ventaId: { $in: ventaIds } 
        });

        // Paso 2: Ajustar los "restantes" de cada detalle según la carga actual
        // Basado en la lógica de consolidadorDeCargamento de JefaturaDespacho.jsx
        // Primero, contar cuántos items hay por subcategoría en la carga actual
        const contadoresPorSubcat : { [key: string]: number } = {};
        if (Array.isArray(ruta.cargaItemIds)) {
            (ruta as IRutaDespacho).cargaItemIds.forEach(item => {
                // item puede ser ObjectId o documento, obtener subcategoriaCatalogoId
                let subcatId;
                if (item.subcategoriaCatalogoId) {
                    // Si es documento
                    subcatId = item.subcategoriaCatalogoId._id?.toString?.() || item.subcategoriaCatalogoId?.toString?.();
                } else if (item.subcategoriaCatalogoId) {
                    // Si es ObjectId
                    subcatId = String(item.subcategoriaCatalogoId);
                }
                if (!subcatId) return;
                contadoresPorSubcat[subcatId] = (contadoresPorSubcat[subcatId] || 0) + 1;
            });
        }

        // Ahora, para cada detalle, calcular los restantes como en consolidadorDeCargamento
        // Mejor lógica: recorre los detalles y descuenta del contador por subcategoría
        // Si todos los detalles quedan con restantes === 0, la carga está completa

        // Calcular la cantidad de items por subcategoría en la carga actual
        const cantidadPorSubcat: { [key: string]: number } = {};
        if (Array.isArray(ruta.cargaItemIds)) {
            // Los items pueden ser ObjectId, así que necesitamos poblarlos para obtener subcategoriaCatalogoId
            // Usamos el modelo ItemCatalogo para obtener la subcategoría de cada item
            const itemsCargados = await ItemCatalogo.find({ _id: { $in: ruta.cargaItemIds } }).select("_id subcategoriaCatalogoId").lean();
            itemsCargados.forEach(item => {
            const subcatId = item.subcategoriaCatalogoId?.toString();
            if (!subcatId) return;
                cantidadPorSubcat[subcatId] = (cantidadPorSubcat[subcatId] || 0) + 1;
            });
        }

        // Para cada detalle, verificar si la cantidad requerida está cubierta por la carga actual
        const cargaCompleta = detallesVentas.every(detalle => {
            const key = detalle.subcategoriaCatalogoId?._id?.toString?.() || detalle.subcategoriaCatalogoId?.toString?.();
            const cantidadRequerida = detalle.cantidad || 0;
            const cantidadDisponible = cantidadPorSubcat[key] || 0;
            return cantidadDisponible >= cantidadRequerida;
        });

        if (!cargaCompleta) {
            return NextResponse.json({
                error: "La carga no está completa. Faltan elementos por cargar.",
                message: "No se puede confirmar la carga hasta que todos los pedidos estén cubiertos."
            }, { status: 400 });
        }

        // Agregar historial de carga con los items nuevos
        ruta.historialCarga.push({
            esCarga: true,
            fecha: new Date(),
            itemMovidoIds: ruta.cargaItemIds || []
        });

        // Determinar el tipo de orden de las ventas asociadas
        const ventasRuta = await Venta.find({ _id: { $in: ventaIds } }).select("tipo estado").lean();
        const todasSonTraslado = ventasRuta.every(v => v.tipo === TIPO_ORDEN.traslado);

        if (todasSonTraslado) {
            ruta.estado = TIPO_ESTADO_RUTA_DESPACHO.terminado;
            ruta.historialEstado.push({
                estado: TIPO_ESTADO_RUTA_DESPACHO.terminado,
                fecha: new Date()
            });
            // Cambiar estado de las ventas a entregado
            await Venta.updateMany({ _id: { $in: ventaIds } }, {
                $set: { estado: TIPO_ESTADO_VENTA.entregado },
                $push: { historialEstados: { estado: TIPO_ESTADO_VENTA.entregado, fecha: new Date() } }
            });
        } else {
            ruta.estado = TIPO_ESTADO_RUTA_DESPACHO.orden_cargada;
            ruta.historialEstado.push({
                estado: TIPO_ESTADO_RUTA_DESPACHO.orden_cargada,
                fecha: new Date()
            });            
        }        
        await ruta.save();

        return NextResponse.json({ 
            ok: true
        });
        
    } catch (error) {
        console.error("Error updating item states:", error);
        return NextResponse.json({ 
            error: "Error updating item states.",
            details: error
        }, { status: 500 });
    }
}