import mongoose from "mongoose";
import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import User from "@/models/user";
import Vehiculo from "@/models/vehiculo";
import Cliente from "@/models/cliente";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import Cargo from "@/models/cargo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import { TIPO_ESTADO_VENTA, TIPO_CARGO, TIPO_ESTADO_RUTA_DESPACHO, TIPO_CHECKLIST } from "@/app/utils/constants";
import DetalleVenta from "@/models/detalleVenta";
import Direccion from "@/models/direccion";
import ItemCatalogo from "@/models/itemCatalogo";
import Venta from "@/models/venta";
import RutaDespacho from "@/models/rutaDespacho";
import Checklist from "@/models/checklist";

export async function GET() {
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

    console.log("Fetching ventas in 'borrador' state...");
    const ventas = await Venta.find({ estado: TIPO_ESTADO_VENTA.por_asignar }).lean();
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
                clienteId: venta.clienteId,
                clienteNombre,
                clienteRut,
                fechaCreacion: venta.createdAt,
                items: itemsWithNames,
                createdAt: venta.createdAt,
            };
        })
    );

    const choferesEnRuta = await RutaDespacho.find({
        estado: { 
            $gte: TIPO_ESTADO_RUTA_DESPACHO.en_ruta, 
            $lt: TIPO_ESTADO_RUTA_DESPACHO.terminado 
        }
    }).lean();
    const choferesIds = choferesEnRuta.map((ruta) => ruta.choferId);
    let qry = {
        tipo: TIPO_CARGO.conductor
    };
    if(choferesIds.length > 0) {
        qry.userId = { $nin: choferesIds };
    }
    const cargosChoferes = await Cargo.find(qry).lean();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const choferes = await Promise.all(
        cargosChoferes.map(async (cargo) => {
            const user = await User.findById(cargo.userId).lean();

            // Find the rutaDespacho where the user is the chofer
            const rutaDespacho = await RutaDespacho.findOne({ 
                choferId: user._id, 
                estado: { 
                    $gte: TIPO_ESTADO_RUTA_DESPACHO.preparacion, 
                    $lt: TIPO_ESTADO_RUTA_DESPACHO.en_ruta 
                }
            }).lean();

            let pedidos = [];

            if (rutaDespacho) {
                const ventas = await Venta.find({ _id: { $in: rutaDespacho.ventaIds } }).lean();
                pedidos = await Promise.all(
                    ventas.map(async (venta) => {
                        const cliente = await Cliente.findById(venta.clienteId).lean();
                        const nombreCliente = cliente?.nombre || "Desconocido";
                        const rutCliente = cliente?.rut || "Desconocido";

                        const detalleItems = await DetalleVenta.find({ ventaId: venta._id }).lean();
                        const items = await Promise.all(
                            detalleItems.map(async (item) => {
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
                            nombreCliente,
                            rutCliente,
                            items,
                        };
                    })
                );
            }

            // Check if checklist exists for today
            const checklistExists = await Checklist.findOne({
                userId: user._id,
                tipo: TIPO_CHECKLIST.vehiculo,
                fecha: {
                    $gte: today,
                    $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                },
                passed: true
            }).lean();

            return {
                _id: user._id,
                nombre: user.name,
                pedidos,
                checklist: !!checklistExists
            };
        })
    );

    const flotaEnTransito = await RutaDespacho.find({
        estado: { 
            $gte: TIPO_ESTADO_RUTA_DESPACHO.en_ruta, 
            $lt: TIPO_ESTADO_RUTA_DESPACHO.terminado }
    })
    .select("ruta vehiculoId choferId cargaItemIds estado ventaIds")
    // Poblar cada dirección de cada ruta
    .populate({
        path: "ruta.direccionDestinoId",
        model: "Direccion",
        select: "nombre"
    })
    // Poblar el vehículo asignado
    .populate({
        path: "vehiculoId",
        model: "Vehiculo",
        select: "patente marca"
    })
    // Poblar el chofer asignado
    .populate({
        path: "choferId",
        model: "User",
        select: "name"
    })
    // Poblar los items de carga y su jerarquía de catálogo
    .populate({
        path: "cargaItemIds",
        model: "ItemCatalogo",
        select: "subcategoriaCatalogoId codigo nombre",
        populate: {
            path: "subcategoriaCatalogoId",
            model: "SubcategoriaCatalogo",
            select: "cantidad unidad sinSifon nombreGas",
            populate: {
                path: "categoriaCatalogoId",
                model: "CategoriaCatalogo",
                select: "elemento esIndustrial esMedicinal"
            }
        }
    })
    .populate({
        path: "ventaIds",
        model: "Venta",
        select: "clienteId",
        populate: {
            path: "clienteId",
            model: "Cliente",
            select: "nombre"
        }
    })
    .lean();

    // Para cada ruta, poblar los detalles de venta con subcategoriaCatalogoId y cantidad
    for (const ruta of flotaEnTransito) {
        if (ruta.ventaIds && Array.isArray(ruta.ventaIds)) {
            for (const venta of ruta.ventaIds) {
                // Buscar los detalles de venta para esta venta
                const detalles = await DetalleVenta.find({ ventaId: venta._id })
                    .select("subcategoriaCatalogoId cantidad")
                    .lean();
                // Agregar los detalles al objeto venta
                venta.detalles = detalles;
            }
        }
    }

    return NextResponse.json({
        pedidos,
        choferes,
        flotaEnTransito
    });
}

export async function POST(request) {
    try {
        const { ventaId, choferId } = await request.json();

        console.log(">>>>", ventaId, choferId);
        // Validate input
        if (!ventaId || !choferId) {
            return NextResponse.json({ ok: false, error: "ventaId and choferId are required" }, { status: 400 });
        }

        const venta = await Venta.findByIdAndUpdate(
            ventaId,
            { estado: TIPO_ESTADO_VENTA.preparacion }
        ).lean();

        if (!venta) {
            return NextResponse.json({ ok: false, error: "Venta not found" }, { status: 404 });
        }

        // Find the chofer's cargo
        const cargo = await Cargo.findOne({ userId: choferId }).lean();
        if (!cargo) {
            return NextResponse.json({ ok: false, error: "Cargo for chofer not found" }, { status: 404 });
        }

        // Determine the first destinoId
        const destinoId = cargo.sucursalId || cargo.dependenciaId;
        if (!destinoId) {
            return NextResponse.json({ ok: false, error: "No valid destinoId found for chofer" }, { status: 400 });
        }

        // Check if the chofer already has a RutaDespacho in 'preparacion' state
        const rutaExistente = await RutaDespacho.findOne({
            choferId,
            estado: { $gte: TIPO_ESTADO_RUTA_DESPACHO.preparacion, $lt: TIPO_ESTADO_RUTA_DESPACHO.en_ruta }
        }).lean();

        if (rutaExistente) {
            // Check if the ventaId is already in the existing RutaDespacho
            if (rutaExistente.ventaIds && rutaExistente.ventaIds.includes(ventaId)) {
                return NextResponse.json({ ok: false, error: "La venta ya fue previamente agregada a la ruta del chofer" }, { status: 400 });
            }
            // Add the ventaId to the existing RutaDespacho
            await RutaDespacho.findByIdAndUpdate(
                rutaExistente._id,
                { $addToSet: { ventaIds: ventaId } } // Ensure ventaId is not duplicated
            );
            return NextResponse.json({ ok: true, message: "Venta added to existing RutaDespacho" });
        } else {            
            let vehiculoId = null;
            // Buscar el checklist de hoy para el chofer con passed=true
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const checklist = await Checklist.findOne({
                userId: choferId,
                fecha: { $gte: today },
                passed: true,
                tipo: TIPO_CHECKLIST.vehiculo
            }).lean();

            if (!checklist) {
                return NextResponse.json({ ok: false, error: "No existe checklist aprobado para el chofer hoy" }, { status: 500 });
            }

            vehiculoId = checklist.vehiculoId;

            // Create a new RutaDespacho
            const nuevaRutaDespacho = new RutaDespacho({
                vehiculoId, // Assign the vehicle if found
                choferId,
                estado: TIPO_ESTADO_RUTA_DESPACHO.preparacion,
                historialEstado: [{ estado: TIPO_ESTADO_RUTA_DESPACHO.preparacion, fecha: new Date() }],
                checklist: [],
                ventaIds: [ventaId],
            });

            await nuevaRutaDespacho.save();            
        }
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error in POST /asignacion:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}