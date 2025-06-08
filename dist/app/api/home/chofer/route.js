"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const rutaDespacho_1 = __importDefault(require("@/models/rutaDespacho"));
const constants_1 = require("@/app/utils/constants");
const authOptions_1 = require("@/app/utils/authOptions");
const next_auth_1 = require("next-auth");
async function GET() {
    try {
        console.log("Fetching server session...");
        const session = await (0, next_auth_1.getServerSession)(authOptions_1.authOptions);
        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return server_1.NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        await (0, mongodb_1.connectMongoDB)();
        const unaRuta = await rutaDespacho_1.default.findOne({
            estado: constants_1.TIPO_ESTADO_RUTA_DESPACHO.preparacion,
            choferId: session.user.id
        });
        return server_1.NextResponse.json({ ok: true, tienePedidos: unaRuta ? true : false });
    }
    catch (error) {
        return server_1.NextResponse.json({ error: error.message }, { status: 500 });
    }
}
