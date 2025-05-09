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
        await (0, mongodb_1.connectMongoDB)();
        const borradorCount = await venta_1.default.countDocuments({ estado: constants_1.TIPO_ESTADO_VENTA.borrador, porCobrar: true });
        const resultado = [
            { pedido: 0, flota: borradorCount, deudas: 0 }
        ];
        return server_1.NextResponse.json({ ok: true, resultado });
    }
    catch (error) {
        console.error("ERROR!", error);
        return server_1.NextResponse.json({ error: error.message }, { status: 500 });
    }
}
