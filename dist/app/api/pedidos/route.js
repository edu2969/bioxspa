"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const venta_1 = __importDefault(require("@/models/venta"));
const constants_1 = require("@/app/utils/constants");
async function GET() {
    try {
        console.log("Fetching Pedidos...");
        await (0, mongodb_1.connectMongoDB)();
        const ventas = await venta_1.default.find({
            estado: { $in: [constants_1.TIPO_ESTADO_VENTA.preparacion, constants_1.TIPO_ESTADO_VENTA.reparto] },
        })
            .populate("clienteId", "nombre rut direccion")
            .populate({
            path: "detalleVentas",
            populate: [
                {
                    path: "itemsCatalogoId",
                    select: "codigo createdAt",
                },
                {
                    path: "subcategoriaCatalogoId",
                    select: "nombre categoriaCatalogoId",
                    populate: {
                        path: "categoriaCatalogoId",
                        select: "nombre",
                    },
                },
            ],
        })
            .sort({ updatedAt: -1 });
        const result = ventas.map((venta) => {
            var _a, _b, _c;
            return ({
                cliente: {
                    nombre: (_a = venta.clienteId) === null || _a === void 0 ? void 0 : _a.nombre,
                    rut: (_b = venta.clienteId) === null || _b === void 0 ? void 0 : _b.rut,
                    direccion: (_c = venta.clienteId) === null || _c === void 0 ? void 0 : _c.direccion,
                },
                fechaPedido: venta.updatedAt,
                detalles: venta.detalleVentas.map((detalle) => {
                    var _a, _b, _c, _d, _e;
                    return ({
                        nombreCategoria: ((_b = (_a = detalle.subcategoriaCatalogoId) === null || _a === void 0 ? void 0 : _a.categoriaCatalogoId) === null || _b === void 0 ? void 0 : _b.nombre) +
                            " " +
                            ((_c = detalle.subcategoriaCatalogoId) === null || _c === void 0 ? void 0 : _c.nombre),
                        itemCatalogo: ((_d = detalle.itemsCatalogoId) === null || _d === void 0 ? void 0 : _d.codigo) +
                            " " +
                            ((_e = detalle.itemsCatalogoId) === null || _e === void 0 ? void 0 : _e.createdAt),
                    });
                }),
            });
        });
        return server_1.NextResponse.json(result);
    }
    catch (error) {
        console.error("Error fetching Pedidos:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
