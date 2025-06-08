"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const user_1 = __importDefault(require("@/models/user"));
const vehiculo_1 = __importDefault(require("@/models/vehiculo"));
const cliente_1 = __importDefault(require("@/models/cliente"));
const categoriaCatalogo_1 = __importDefault(require("@/models/categoriaCatalogo"));
const cargo_1 = __importDefault(require("@/models/cargo"));
const subcategoriaCatalogo_1 = __importDefault(require("@/models/subcategoriaCatalogo"));
const constants_1 = require("@/app/utils/constants");
const detalleVenta_1 = __importDefault(require("@/models/detalleVenta"));
const direccion_1 = __importDefault(require("@/models/direccion"));
const itemCatalogo_1 = __importDefault(require("@/models/itemCatalogo"));
const venta_1 = __importDefault(require("@/models/venta"));
const rutaDespacho_1 = __importDefault(require("@/models/rutaDespacho"));
async function GET() {
    console.log("Connecting to MongoDB...");
    await (0, mongodb_1.connectMongoDB)();
    console.log("Connected to MongoDB");
    if (!mongoose_1.default.models.ItemCatalogo) {
        mongoose_1.default.model("ItemCatalogo", itemCatalogo_1.default.schema);
    }
    if (!mongoose_1.default.models.Direccion) {
        mongoose_1.default.model("Direccion", direccion_1.default.schema);
    }
    if (!mongoose_1.default.models.CategoriaCatalogo) {
        mongoose_1.default.model("CategoriaCatalogo", categoriaCatalogo_1.default.schema);
    }
    if (!mongoose_1.default.models.SubcategoriaCatalogo) {
        mongoose_1.default.model("SubcategoriaCatalogo", subcategoriaCatalogo_1.default.schema);
    }
    if (!mongoose_1.default.models.Vehiculo) {
        mongoose_1.default.model("Vehiculo", vehiculo_1.default.schema);
    }
    console.log("Fetching ventas in 'borrador' state...");
    const ventas = await venta_1.default.find({ estado: constants_1.TIPO_ESTADO_VENTA.borrador }).lean();
    console.log(`Fetched ${ventas.length} ventas in 'borrador' state`);
    const pedidos = await Promise.all(ventas.map(async (venta) => {
        // Fetch cliente details
        const cliente = await cliente_1.default.findById(venta.clienteId).lean();
        const clienteNombre = (cliente === null || cliente === void 0 ? void 0 : cliente.nombre) || "Desconocido";
        const clienteRut = (cliente === null || cliente === void 0 ? void 0 : cliente.rut) || "Desconocido";
        // Fetch items for the venta
        const items = await detalleVenta_1.default.find({ ventaId: venta._id }).lean();
        const itemsWithNames = await Promise.all(items.map(async (item) => {
            const subcategoria = await subcategoriaCatalogo_1.default.findById(item.subcategoriaCatalogoId).lean();
            const categoria = subcategoria
                ? await categoriaCatalogo_1.default.findById(subcategoria.categoriaCatalogoId).lean()
                : null;
            const categoriaNombre = (categoria === null || categoria === void 0 ? void 0 : categoria.nombre) || "Desconocido";
            const subcategoriaNombre = (subcategoria === null || subcategoria === void 0 ? void 0 : subcategoria.nombre) || "Desconocido";
            return Object.assign(Object.assign({}, item), { nombre: `${categoriaNombre} - ${subcategoriaNombre}` });
        }));
        return {
            _id: venta._id,
            clienteId: venta.clienteId,
            clienteNombre,
            clienteRut,
            fechaCreacion: venta.createdAt,
            items: itemsWithNames,
            createdAt: venta.createdAt,
        };
    }));
    const choferesEnRuta = await rutaDespacho_1.default.find({
        estado: {
            $gte: constants_1.TIPO_ESTADO_RUTA_DESPACHO.en_ruta,
            $lt: constants_1.TIPO_ESTADO_RUTA_DESPACHO.terminado
        }
    }).lean();
    const choferesIds = choferesEnRuta.map((ruta) => ruta.choferId);
    let qry = {
        tipo: constants_1.TIPO_CARGO.conductor
    };
    if (choferesIds.length > 0) {
        qry.userId = { $nin: choferesIds };
    }
    const cargosChoferes = await cargo_1.default.find(qry).lean();
    const choferes = await Promise.all(cargosChoferes.map(async (cargo) => {
        const user = await user_1.default.findById(cargo.userId).lean();
        // Find the rutaDespacho where the user is the chofer
        const rutaDespacho = await rutaDespacho_1.default.findOne({
            choferId: user._id,
            estado: {
                $gte: constants_1.TIPO_ESTADO_RUTA_DESPACHO.preparacion,
                $lt: constants_1.TIPO_ESTADO_RUTA_DESPACHO.en_ruta
            }
        }).lean();
        let pedidos = [];
        if (rutaDespacho) {
            const ventas = await venta_1.default.find({ _id: { $in: rutaDespacho.ventaIds } }).lean();
            pedidos = await Promise.all(ventas.map(async (venta) => {
                const cliente = await cliente_1.default.findById(venta.clienteId).lean();
                const nombreCliente = (cliente === null || cliente === void 0 ? void 0 : cliente.nombre) || "Desconocido";
                const rutCliente = (cliente === null || cliente === void 0 ? void 0 : cliente.rut) || "Desconocido";
                const detalleItems = await detalleVenta_1.default.find({ ventaId: venta._id }).lean();
                const items = await Promise.all(detalleItems.map(async (item) => {
                    const subcategoria = await subcategoriaCatalogo_1.default.findById(item.subcategoriaCatalogoId).lean();
                    const categoria = subcategoria
                        ? await categoriaCatalogo_1.default.findById(subcategoria.categoriaCatalogoId).lean()
                        : null;
                    const categoriaNombre = (categoria === null || categoria === void 0 ? void 0 : categoria.nombre) || "Desconocido";
                    const subcategoriaNombre = (subcategoria === null || subcategoria === void 0 ? void 0 : subcategoria.nombre) || "Desconocido";
                    return Object.assign(Object.assign({}, item), { nombre: `${categoriaNombre} - ${subcategoriaNombre}` });
                }));
                return {
                    _id: venta._id,
                    nombreCliente,
                    rutCliente,
                    items,
                };
            }));
        }
        return {
            _id: user._id,
            nombre: user.name,
            pedidos,
        };
    }));
    const flotaEnTransito = await rutaDespacho_1.default.find({
        estado: {
            $gte: constants_1.TIPO_ESTADO_RUTA_DESPACHO.en_ruta,
            $lt: constants_1.TIPO_ESTADO_RUTA_DESPACHO.terminado
        }
    })
        .select("ruta vehiculoId choferId cargaItemIds estado")
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
        .lean();
    return server_1.NextResponse.json({
        pedidos,
        choferes,
        flotaEnTransito
    });
}
async function POST(request) {
    try {
        const { ventaId, choferId } = await request.json();
        console.log(">>>>", ventaId, choferId);
        // Validate input
        if (!ventaId || !choferId) {
            return server_1.NextResponse.json({ ok: false, error: "ventaId and choferId are required" }, { status: 400 });
        }
        const venta = await venta_1.default.findByIdAndUpdate(ventaId, { estado: constants_1.TIPO_ESTADO_VENTA.preparacion }).lean();
        if (!venta) {
            return server_1.NextResponse.json({ ok: false, error: "Venta not found" }, { status: 404 });
        }
        // Find the chofer's cargo
        const cargo = await cargo_1.default.findOne({ userId: choferId }).lean();
        if (!cargo) {
            return server_1.NextResponse.json({ ok: false, error: "Cargo for chofer not found" }, { status: 404 });
        }
        // Determine the first destinoId
        const destinoId = cargo.sucursalId || cargo.dependenciaId;
        if (!destinoId) {
            return server_1.NextResponse.json({ ok: false, error: "No valid destinoId found for chofer" }, { status: 400 });
        }
        // Check if the chofer already has a RutaDespacho in 'preparacion' state
        const rutaExistente = await rutaDespacho_1.default.findOne({
            choferId,
            estado: { $gte: constants_1.TIPO_ESTADO_RUTA_DESPACHO.preparacion, $lt: constants_1.TIPO_ESTADO_RUTA_DESPACHO.en_ruta }
        }).lean();
        if (rutaExistente) {
            // Check if the ventaId is already in the existing RutaDespacho
            if (rutaExistente.ventaIds && rutaExistente.ventaIds.includes(ventaId)) {
                return server_1.NextResponse.json({ ok: false, error: "La venta ya fue previamente agregada a la ruta del chofer" }, { status: 400 });
            }
            // Add the ventaId to the existing RutaDespacho
            await rutaDespacho_1.default.findByIdAndUpdate(rutaExistente._id, { $addToSet: { ventaIds: ventaId } } // Ensure ventaId is not duplicated
            );
            return server_1.NextResponse.json({ ok: true, message: "Venta added to existing RutaDespacho" });
        }
        else {
            // Find vehicles assigned to the chofer
            const vehiculosAsignados = await vehiculo_1.default.find({ choferIds: choferId }).lean();
            let vehiculoId = null;
            if (vehiculosAsignados.length === 1) {
                // If there is exactly one vehicle assigned, use it
                vehiculoId = vehiculosAsignados[0]._id;
            }
            // Create a new RutaDespacho
            const nuevaRutaDespacho = new rutaDespacho_1.default({
                vehiculoId, // Assign the vehicle if found
                choferId,
                estado: constants_1.TIPO_ESTADO_RUTA_DESPACHO.preparacion,
                historialEstado: [{ estado: constants_1.TIPO_ESTADO_RUTA_DESPACHO.preparacion, fecha: new Date() }],
                checklist: [],
                ventaIds: [ventaId],
            });
            await nuevaRutaDespacho.save();
        }
        return server_1.NextResponse.json({ ok: true });
    }
    catch (error) {
        console.error("Error in POST /asignacion:", error);
        return server_1.NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
