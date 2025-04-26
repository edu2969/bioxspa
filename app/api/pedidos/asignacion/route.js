import { connectMongoDB } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import User from "@/models/user";
import Vehiculo from "@/models/vehiculo";
import Venta from "@/models/venta";
import Cliente from "@/models/cliente";
import CategoriaCatalogo from "@/models/categoriaCatalogo";
import Cargo from "@/models/cargo";
import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
import { TIPO_ESTADO_VENTA, TIPO_CARGO } from "@/app/utils/constants";
import DetalleVenta from "@/models/detalleVenta";
import RutaDespacho from "@/models/rutaDespacho";
import Direccion from "@/models/direccion";

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
            const rutaDespacho = await RutaDespacho.findOne({ choferId: user._id }).lean();

            let items = [];
            let nombreCliente = "";
            let rutCliente = "";

            if (rutaDespacho) {
                // Fetch related ventas
                const ventas = await Venta.find({ _id: { $in: rutaDespacho.ventaIds } }).lean();

                items = await Promise.all(
                    ventas.map(async (venta) => {
                        // Fetch cliente details
                        const cliente = await Cliente.findById(venta.clienteId).lean();
                        nombreCliente = cliente?.nombre || "Desconocido";
                        rutCliente = cliente?.rut || "Desconocido";

                        // Fetch items for the venta
                        const detalleItems = await DetalleVenta.find({ ventaId: venta._id }).lean();
                        return await Promise.all(
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
                    })
                );

                // Flatten the items array
                items = items.flat();
            }

            return {
                _id: user._id,
                name: user.name,
                nombreCliente,
                rutCliente,
                items,
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

        // Validate input
        if (!ventaId || !choferId) {
            return NextResponse.json({ ok: false, error: "ventaId and choferId are required" }, { status: 400 });
        }

        // Update the venta state to 'preparacion'
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

        // Create a new RutaDespacho
        const nuevaRutaDespacho = new RutaDespacho({
            vehiculoId: null, // Assuming no vehicle assigned initially
            choferId,
            horaInicio: new Date(),
            horaDestino: null, // Assuming no end time initially
            direccionInicioId: destinoId,
            direccionDestinoId: destinoId,
            estado: "preparacion",
            historialEstado: [{ estado: "preparacion", fecha: new Date() }],
            checklist: [],
            ventaIds: [ventaId],
        });

        await nuevaRutaDespacho.save();

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Error in POST /asignacion:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}