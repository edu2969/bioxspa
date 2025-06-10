"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const venta_1 = __importDefault(require("@/models/venta"));
const cliente_1 = __importDefault(require("@/models/cliente"));
const detalleVenta_1 = __importDefault(require("@/models/detalleVenta"));
const constants_1 = require("@/app/utils/constants");
const next_auth_1 = require("next-auth");
const authOptions_1 = require("@/app/utils/authOptions");
async function POST(req) {
    try {
        await (0, mongodb_1.connectMongoDB)();
        const body = await req.json();
        console.log("BODY 2", body);
        const requiredFields = [
            "clienteId",
            "usuarioId",
            "documentoTributarioId",
            "items"
        ];
        for (const field of requiredFields) {
            if (!body[field] || (Array.isArray(body[field]) && body[field].length === 0)) {
                const errorMessage = `Field '${field}' is required and cannot be empty`;
                console.error("Validation Error:", errorMessage);
                return server_1.NextResponse.json({ error: errorMessage }, { status: 400 });
            }
        }
        for (const item of body.items) {
            if (!item.cantidad || item.precio == undefined || !item.subcategoriaId) {
                const errorMessage = "Each item must have 'cantidad', 'precio', and 'subcategoriaId'";
                console.error("Validation Error:", errorMessage);
                return server_1.NextResponse.json({ error: errorMessage }, { status: 400 });
            }
        }
        const session = await (0, next_auth_1.getServerSession)(authOptions_1.authOptions);
        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return server_1.NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        const valorNeto = body.items.reduce((total, item) => {
            return total + (item.cantidad * item.precio);
        }, 0);
        const cliente = await cliente_1.default.findById(body.clienteId);
        if (!cliente) {
            const errorMessage = "Cliente not found";
            console.error("Validation Error:", errorMessage);
            return server_1.NextResponse.json({ error: errorMessage }, { status: 404 });
        }
        const tieneArriendo = cliente.arriendo;
        const nuevaVenta = new venta_1.default({
            clienteId: body.clienteId,
            vendedorId: body.usuarioId,
            fecha: new Date(),
            estado: session.role == constants_1.USER_ROLE.manager ? constants_1.TIPO_ESTADO_VENTA.por_asignar : constants_1.TIPO_ESTADO_VENTA.borrador,
            valorNeto,
            valorIva: valorNeto * 0.19,
            valorBruto: valorNeto * (1 - 0.19),
            valorTotal: valorNeto * 1.19,
            documentoTributarioId: body.documentoTributarioId,
            porCobrar: true,
            tieneArriendo
        });
        const savedVenta = await nuevaVenta.save();
        for (const item of body.items) {
            const detalleVenta = new detalleVenta_1.default({
                ventaId: savedVenta._id,
                subcategoriaCatalogoId: item.subcategoriaId || null,
                itemsCatalogoId: item.itemCategoriaId || null,
                cantidad: item.cantidad,
                neto: item.cantidad * item.precio,
                iva: item.cantidad * item.precio * 0.19,
                total: item.cantidad * item.precio * 1.19
            });
            await detalleVenta.save();
        }
        return server_1.NextResponse.json({ ok: true, venta: savedVenta });
    }
    catch (error) {
        console.error("ERROR!", error);
        return server_1.NextResponse.json({ error: error.message }, { status: 500 });
    }
}
