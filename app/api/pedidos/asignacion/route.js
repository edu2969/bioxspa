import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import User from "@/models/user";
import Vehiculo from "@/models/vehiculo";
import Cliente from "@/models/cliente";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import Cargo from "@/models/cargo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import { TIPO_ESTADO_VENTA, TIPO_CARGO, TIPO_ESTADO_RUTA_DESPACHO } from "@/app/utils/constants";
import DetalleVenta from "@/models/detalleVenta";
import Direccion from "@/models/direccion";
import Venta from "@/models/venta";
import RutaDespacho from "@/models/rutaDespacho";

export async function GET() {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    console.log("Fetching ventas in 'borrador' state...");
    const ventas = await Venta.find({ estado: TIPO_ESTADO_VENTA.borrador }).lean();
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

    const cargosChoferes = await Cargo.find({ tipo: TIPO_CARGO.conductor }).lean();
    const choferes = await Promise.all(
        cargosChoferes.map(async (cargo) => {
            const user = await User.findById(cargo.userId).lean();

            // Find the rutaDespacho where the user is the chofer
            const rutaDespacho = await RutaDespacho.findOne({ 
                choferId: user._id, 
                estado: { $in: [TIPO_ESTADO_RUTA_DESPACHO.preparacion, TIPO_ESTADO_RUTA_DESPACHO.carga] }
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

            return {
                _id: user._id,
                nombre: user.name,
                pedidos,
            };
        })
    );

    const vehiculosEnTransito = await Vehiculo.find({ direccionDestinoId: { $ne: null } }).lean();
    const flotaEnTransito = await Promise.all(
        vehiculosEnTransito.map(async (vehiculo) => {
            const direccionDestino = await Direccion.findById(vehiculo.direccionDestinoId).lean();
            return {
                ...vehiculo,
                direccionDestinoNombre: direccionDestino?.nombre || "Desconocida"
            };
        })
    );

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
            estado: { $in: [TIPO_ESTADO_RUTA_DESPACHO.preparacion, TIPO_ESTADO_RUTA_DESPACHO.carga] }
        }).lean();

        if (rutaExistente) {
            console.log("---------->", rutaExistente, ventaId);
            // Add the ventaId to the existing RutaDespacho
            await RutaDespacho.findByIdAndUpdate(
                rutaExistente._id,
                { $addToSet: { ventaIds: ventaId } } // Ensure ventaId is not duplicated
            );
            return NextResponse.json({ ok: true, message: "Venta added to existing RutaDespacho" });
        } else {
            // Find vehicles assigned to the chofer
            const vehiculosAsignados = await Vehiculo.find({ choferIds: choferId }).lean();

            let vehiculoId = null;
            if (vehiculosAsignados.length === 1) {
                // If there is exactly one vehicle assigned, use it
                vehiculoId = vehiculosAsignados[0]._id;
            }

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