import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { TIPO_CARGO } from "@/app/utils/constants";
import { getNUCode } from "@/lib/nuConverter";
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
import { TIPO_ESTADO_VENTA, TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";

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
        }).populate("dependenciaId").lean();

        const sucursalId = cargo.sucursalId ?? cargo.dependenciaId.sucursalId;
        const dependenciaId = cargo.dependenciaId._id;
        console.log(`Fetching choferes for dependenciaId: ${dependenciaId}`);
        const choferes = await Cargo.find({ dependenciaId, tipo: TIPO_CARGO.conductor }).populate("userId").lean();

        const choferIds = choferes?.map((chofer) => chofer.userId._id) || [];
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
                    direccionId: dependenciaId 
                }
            ]
        };
        
        const rutasDespacho = await RutaDespacho.find(rutaQuery)
            .select("ventaIds estado cargaItemIds choferId vehiculoId")      
            .populate({
                path: "cargaItemIds",
                model: "ItemCatalogo",
                select: "_id codigo subcategoriaCatalogoId",
            })
            .populate({
                path: "choferId",
                model: "User",
                select: "name"
            })
            .populate({
                path: "vehiculoId",
                model: "Vehiculo",
                select: "marca vehiculo patente"
            })
            .populate({
                path: "ventaIds",
                model: "Venta",
                select: "_id clienteId comentario createdAt",
                populate: {
                    path: "clienteId",
                    model: "Cliente",
                    select: "_id nombre telefono direccionesDespacho",
                    populate: {
                        path: "direccionesDespacho.direccionId",
                        model: "Direccion",
                        select: "_id nombre latitud longitud",
                    }
                }
            })           
            .lean();

        console.log("Fetching detalleVentas...");
        const dependencia = await Dependencia.findOne({ _id: dependenciaId }).lean();

        console.log("DEPENDENCIA", dependencia);
        if (!dependencia) {
            console.warn(`No dependencia found for dependenciaId: ${dependenciaId}`);
            return NextResponse.json({ ok: false, error: "No dependencia found for this dependencia" }, { status: 404 });
        }

        console.log("Mapping cargamentos...");
        const ventasDespachoEnLocal = await Venta.find({
            estado: { $in: [TIPO_ESTADO_VENTA.por_asignar, TIPO_ESTADO_VENTA.preparacion] },
            direccionDespachoId: null,
            sucursalId
        }).populate("clienteId").lean();
        console.log("Ventas en local", ventasDespachoEnLocal);

        // Buscar los detalles de venta que correspondan a esas ventas
        const ventaIds = rutasDespacho.flatMap(ruta => ruta.ventaIds.map(venta => venta._id)).concat(ventasDespachoEnLocal.map(venta => venta._id));
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

        console.log("Mapping cargamentos...");
        const cargamentos = rutasDespacho.map((ruta) => {
            let fechaVentaMasReciente = null;
            return {
                rutaId: ruta._id,
                ventas: ruta.ventaIds.map((venta) => {
                    const detallesFiltrados = detalleVentas.filter(
                        (detalle) => detalle.ventaId.toString() === venta._id.toString()
                    );     
                    return {
                        ventaId: venta._id,
                        fecha: venta.createdAt,
                        detalles: detallesFiltrados.map((detalle) => {
                            let newDetalle = {};
                            const subcategoria = detalle.subcategoriaCatalogoId;                            
                            const nuCode = subcategoria?.categoriaCatalogoId?.elemento
                                ? getNUCode(subcategoria.categoriaCatalogoId.elemento)
                                : null;

                            newDetalle = {
                                nombre: (subcategoria?.categoriaCatalogoId?.nombre + subcategoria?.nombre) || null,
                                multiplicador: detalle.cantidad,
                                cantidad: subcategoria?.cantidad || "??",
                                unidad: subcategoria?.unidad || null,
                                restantes: detalle.cantidad - ruta.cargaItemIds?.filter(ic => ic.subcategoriaCatalogoId === subcategoria._id).length || 0,
                                elemento: subcategoria?.categoriaCatalogoId?.elemento,
                                sinSifon: subcategoria?.sinSifon || false,
                                esIndustrial: subcategoria?.categoriaCatalogoId?.esIndustrial || false,
                                nuCode: nuCode,
                                subcategoriaId: subcategoria?._id || null, 
                            };                    

                            if (!fechaVentaMasReciente || new Date(venta.createdAt) > new Date(fechaVentaMasReciente)) {
                                fechaVentaMasReciente = venta.createdAt;
                            }
                            return newDetalle;
                        }),
                        comentario: venta.comentario || null,
                        cliente: {
                            nombre: venta.clienteId?.nombre || null,
                            rut: venta.clienteId?.rut || null,
                            direccion: venta.clienteId?.direccionId || null,
                            telefono: venta.clienteId?.telefono || null,
                            direccionesDespacho: venta.clienteId?.direccionesDespacho?.map((dir) => ({
                                _id: dir._id,
                                nombre: dir.nombre,
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
                items: ruta.cargaItemIds?.map((item) => ({
                    codigo: item.codigo,
                    _id: item._id
                })) || [],
                estado: ruta.estado,
            };
        });

        console.log("Adding ventas for despacho en local...");
        cargamentos.push(...ventasDespachoEnLocal.map((venta) => ({
            rutaId: null,
            ventas: [{
                ...venta,                
                detalles: detalleVentas.filter(dv => dv.ventaId === venta._id).map((venta) => {
                    const detallesFiltrados = detalleVentas.filter(
                        (detalle) => detalle.ventaId.toString() === venta._id.toString()
                    );     
                    return {
                        ventaId: venta._id,
                        fecha: venta.createdAt,
                        detalles: detallesFiltrados.map((detalle) => {
                            let newDetalle = {};
                            const subcategoria = detalle.subcategoriaCatalogoId;                            
                            const nuCode = subcategoria?.categoriaCatalogoId?.elemento
                                ? getNUCode(subcategoria.categoriaCatalogoId.elemento)
                                : null;

                            newDetalle = {
                                nombre: (subcategoria?.categoriaCatalogoId?.nombre + subcategoria?.nombre) || null,
                                multiplicador: detalle.cantidad,
                                cantidad: subcategoria?.cantidad || "??",
                                unidad: subcategoria?.unidad || null,
                                restantes: detalle.cantidad - ruta.cargaItemIds?.filter(ic => ic.subcategoriaCatalogoId === subcategoria._id).length || 0,
                                elemento: subcategoria?.categoriaCatalogoId?.elemento,
                                sinSifon: subcategoria?.sinSifon || false,
                                esIndustrial: subcategoria?.categoriaCatalogoId?.esIndustrial || false,
                                nuCode: nuCode,
                                subcategoriaId: subcategoria?._id || null, 
                            };                    

                            if (!fechaVentaMasReciente || new Date(venta.createdAt) > new Date(fechaVentaMasReciente)) {
                                fechaVentaMasReciente = venta.createdAt;
                            }
                            return newDetalle;
                        }),
                        comentario: venta.comentario || null,
                        cliente: {
                            nombre: venta.clienteId?.nombre || null,
                            rut: venta.clienteId?.rut || null,
                            direccion: venta.clienteId?.direccionId || null,
                            telefono: venta.clienteId?.telefono || null,
                            direccionesDespacho: venta.clienteId?.direccionesDespacho?.map((dir) => ({
                                _id: dir._id,
                                nombre: dir.nombre,
                                direccionId: dir.direccionId?._id || null,
                                latitud: dir.direccionId?.latitud || null,
                                longitud: dir.direccionId?.longitud || null
                            })) || []
                        }
                    }
                })
            }],
            nombreChofer: null,
            patenteVehiculo: null,
            fechaVentaMasReciente: venta.createdAt,
            cliente: {
                nombre: venta.clienteId?.nombre || null,
                rut: venta.clienteId?.rut || null,
                direccion: venta.clienteId?.direccionId || null,
                telefono: venta.clienteId?.telefono || null,
                direccionesDespacho: venta.clienteId?.direccionesDespacho?.map((dir) => ({
                    _id: dir._id,
                    nombre: dir.nombre,
                    direccionId: dir.direccionId?._id || null,
                    latitud: dir.direccionId?.latitud || null,
                    longitud: dir.direccionId?.longitud || null
                })) || []
            },
            estado: TIPO_ESTADO_RUTA_DESPACHO.preparacion,
            retiroEnLocal: true,
        })));

        console.log("Returning response with cargamentos.");
        return NextResponse.json({ ok: true, cargamentos });
    } catch (error) {
        console.error("ERROR", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await connectMongoDB();
        const { rutaId, scanCodes } = await request.json();

        if (!Array.isArray(scanCodes) || scanCodes.length === 0 || !rutaId) {
            return NextResponse.json({ error: "Invalid payload format. {rutaId, scanCodes[]}" }, { status: 400 });
        }

        // Buscar la ruta de despacho por rutaId
        const ruta = await RutaDespacho.findById(rutaId);
        if (!ruta) {
            return NextResponse.json({ error: "RutaDespacho not found" }, { status: 404 });
        }

        // Agregar historial de carga
        ruta.historialCarga.push({
            esCarga: true,
            fecha: new Date(),
            itemMovidoIds: scanCodes
        });

        ruta.cargaItemIds.push(...scanCodes);

        // Cambiar estado y agregar historial de estado
        ruta.estado = TIPO_ESTADO_RUTA_DESPACHO.orden_cargada;
        ruta.historialEstado.push({
            estado: TIPO_ESTADO_RUTA_DESPACHO.orden_cargada,
            fecha: new Date()
        });
        
        console.log("Updating item states...", ruta);

        await ruta.save();

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error updating item states:", error);
        return NextResponse.json({ error: "Error updating item states." }, { status: 500 });
    }
}