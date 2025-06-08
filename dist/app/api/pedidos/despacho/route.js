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
const constants_1 = require("@/app/utils/constants");
const nuConverter_1 = require("@/lib/nuConverter");
const next_auth_1 = require("next-auth");
const authOptions_1 = require("@/app/utils/authOptions");
const cargo_1 = __importDefault(require("@/models/cargo"));
const detalleVenta_1 = __importDefault(require("@/models/detalleVenta"));
const rutaDespacho_1 = __importDefault(require("@/models/rutaDespacho"));
const dependencia_1 = __importDefault(require("@/models/dependencia"));
const categoriaCatalogo_1 = __importDefault(require("@/models/categoriaCatalogo"));
const subcategoriaCatalogo_1 = __importDefault(require("@/models/subcategoriaCatalogo"));
const user_1 = __importDefault(require("@/models/user"));
const vehiculo_1 = __importDefault(require("@/models/vehiculo"));
const venta_1 = __importDefault(require("@/models/venta"));
const constants_2 = require("@/app/utils/constants");
async function GET() {
    try {
        console.log("Connecting to MongoDB...");
        await (0, mongodb_1.connectMongoDB)();
        console.log("MongoDB connected.");
        if (!mongoose_1.default.models.User) {
            mongoose_1.default.model("User", user_1.default.schema);
        }
        if (!mongoose_1.default.models.Dependencia) {
            mongoose_1.default.model("Dependencia", dependencia_1.default.schema);
        }
        if (!mongoose_1.default.models.SubcategoriaCatalogo) {
            mongoose_1.default.model("SubcategoriaCatalogo", subcategoriaCatalogo_1.default.schema);
        }
        if (!mongoose_1.default.models.CategoriaCatalogo) {
            mongoose_1.default.model("CategoriaCatalogo", categoriaCatalogo_1.default.schema);
        }
        if (!mongoose_1.default.models.Vehiculo) {
            mongoose_1.default.model("Vehiculo", vehiculo_1.default.schema);
        }
        if (!mongoose_1.default.models.Venta) {
            mongoose_1.default.model("Venta", venta_1.default.schema);
        }
        if (!mongoose_1.default.models.ItemCatalogo) {
            mongoose_1.default.model("ItemCatalogo", ItemCatalogo.schema);
        }
        console.log("Fetching server session...");
        const session = await (0, next_auth_1.getServerSession)(authOptions_1.authOptions);
        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return server_1.NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;
        console.log(`Fetching cargo for userId: ${userId}`);
        const cargo = await cargo_1.default.findOne({ userId, tipo: constants_1.TIPO_CARGO.despacho }).populate("dependenciaId").lean();
        if (!cargo || !cargo.dependenciaId) {
            console.warn(`No cargo or dependencia found for userId: ${userId}`);
            return server_1.NextResponse.json({ ok: false, error: "No cargo or dependencia found" }, { status: 404 });
        }
        const dependenciaId = cargo.dependenciaId._id;
        console.log(`Fetching choferes for dependenciaId: ${dependenciaId}`);
        const choferes = await cargo_1.default.find({ dependenciaId, tipo: constants_1.TIPO_CARGO.conductor }).populate("userId").lean();
        if (choferes.length === 0) {
            console.warn(`No choferes found for dependenciaId: ${dependenciaId}`);
            return server_1.NextResponse.json({ ok: true, cargamentos: [] });
        }
        const choferIds = choferes.map((chofer) => chofer.userId._id);
        console.log("Fetching rutasDespacho for choferes...");
        // Create a query that handles both cases
        const rutaQuery = {
            choferId: { $in: choferIds },
            $or: [
                // For routes in preparacion state, no additional conditions
                { estado: constants_2.TIPO_ESTADO_RUTA_DESPACHO.preparacion },
                // For routes in descarga state, check that direccionId matches dependenciaId
                {
                    estado: constants_2.TIPO_ESTADO_RUTA_DESPACHO.descarga,
                    direccionId: dependenciaId
                }
            ]
        };
        const rutasDespacho = await rutaDespacho_1.default.find(rutaQuery)
            .populate("choferId vehiculoId ventaIds")
            .lean();
        if (rutasDespacho.length === 0) {
            console.warn("No rutasDespacho found for choferes.");
            return server_1.NextResponse.json({ ok: true, cargamentos: [] });
        }
        console.log("Fetching detalleVentas...");
        const detalleVentas = await detalleVenta_1.default.find()
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
            .populate({
            path: "itemCatalogoIds",
            model: "ItemCatalogo",
            select: "codigo"
        })
            .lean();
        console.log("Mapping cargamentos...");
        const cargamentos = rutasDespacho.map((ruta) => {
            var _a;
            const items = [];
            let fechaVentaMasReciente = null;
            ruta.ventaIds.forEach((venta) => {
                const detalles = detalleVentas.filter((detalle) => detalle.ventaId.toString() === venta._id.toString());
                detalles.forEach((detalle) => {
                    var _a, _b, _c, _d;
                    const subcategoria = detalle.subcategoriaCatalogoId;
                    const itemCatalogoIds = detalle.itemCatalogoIds || [];
                    const nuCode = ((_a = subcategoria === null || subcategoria === void 0 ? void 0 : subcategoria.categoriaCatalogoId) === null || _a === void 0 ? void 0 : _a.elemento)
                        ? (0, nuConverter_1.getNUCode)(subcategoria.categoriaCatalogoId.elemento)
                        : null;
                    const existingItem = items.find((item) => item.subcategoriaId === (subcategoria === null || subcategoria === void 0 ? void 0 : subcategoria._id));
                    if (existingItem) {
                        existingItem.multiplicador += detalle.cantidad;
                        existingItem.restantes += detalle.cantidad - itemCatalogoIds.length;
                    }
                    else {
                        items.push({
                            nombre: (((_b = subcategoria === null || subcategoria === void 0 ? void 0 : subcategoria.categoriaCatalogoId) === null || _b === void 0 ? void 0 : _b.nombre) + (subcategoria === null || subcategoria === void 0 ? void 0 : subcategoria.nombre)) || null,
                            multiplicador: detalle.cantidad,
                            cantidad: (subcategoria === null || subcategoria === void 0 ? void 0 : subcategoria.cantidad) || "??",
                            unidad: (subcategoria === null || subcategoria === void 0 ? void 0 : subcategoria.unidad) || null,
                            restantes: detalle.cantidad - itemCatalogoIds.length,
                            elemento: (_c = subcategoria === null || subcategoria === void 0 ? void 0 : subcategoria.categoriaCatalogoId) === null || _c === void 0 ? void 0 : _c.elemento,
                            sinSifon: (subcategoria === null || subcategoria === void 0 ? void 0 : subcategoria.sinSifon) || false,
                            esIndustrial: ((_d = subcategoria === null || subcategoria === void 0 ? void 0 : subcategoria.categoriaCatalogoId) === null || _d === void 0 ? void 0 : _d.esIndustrial) || false,
                            nuCode: nuCode,
                            subcategoriaId: (subcategoria === null || subcategoria === void 0 ? void 0 : subcategoria._id) || null,
                            items: itemCatalogoIds.map((item) => ({
                                codigo: item.codigo,
                                _id: item._id
                            }))
                        });
                    }
                });
                if (!fechaVentaMasReciente || new Date(venta.createdAt) > new Date(fechaVentaMasReciente)) {
                    fechaVentaMasReciente = venta.createdAt;
                }
            });
            return {
                rutaId: ruta._id,
                nombreChofer: ruta.choferId.name,
                patenteVehiculo: ((_a = ruta.vehiculoId) === null || _a === void 0 ? void 0 : _a.patente) || null,
                fechaVentaMasReciente,
                items
            };
        });
        console.log("Returning response with cargamentos.");
        return server_1.NextResponse.json({ ok: true, cargamentos });
    }
    catch (error) {
        console.error("ERROR", error);
        return server_1.NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
async function POST(request) {
    try {
        await (0, mongodb_1.connectMongoDB)();
        const { rutaId, scanCodes } = await request.json();
        if (!Array.isArray(scanCodes) || scanCodes.length === 0 || !rutaId) {
            return server_1.NextResponse.json({ error: "Invalid payload format. {rutaId, scanCodes[]}" }, { status: 400 });
        }
        // Buscar la ruta de despacho por rutaId
        const ruta = await rutaDespacho_1.default.findById(rutaId);
        if (!ruta) {
            return server_1.NextResponse.json({ error: "RutaDespacho not found" }, { status: 404 });
        }
        // Agregar historial de carga
        ruta.hitorialCarga.push({
            esCarga: true,
            fecha: new Date(),
            itemMovidoIds: scanCodes
        });
        ruta.cargaItemIds.push(...scanCodes);
        // Cambiar estado y agregar historial de estado
        ruta.estado = constants_2.TIPO_ESTADO_RUTA_DESPACHO.orden_cargada;
        ruta.historialEstado.push({
            estado: constants_2.TIPO_ESTADO_RUTA_DESPACHO.orden_cargada,
            fecha: new Date()
        });
        console.log("Updating item states...", ruta);
        await ruta.save();
        return server_1.NextResponse.json({ ok: true });
    }
    catch (error) {
        console.error("Error updating item states:", error);
        return server_1.NextResponse.json({ error: "Error updating item states." }, { status: 500 });
    }
}
