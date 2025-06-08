"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const authOptions_1 = require("@/app/utils/authOptions");
const mongodb_1 = require("@/lib/mongodb");
const rutaDespacho_1 = __importDefault(require("@/models/rutaDespacho"));
const constants_1 = require("@/app/utils/constants");
async function POST(req) {
    try {
        console.log("POST request received for iniciarViaje.");
        await (0, mongodb_1.connectMongoDB)();
        console.log("MongoDB connected.");
        const session = await (0, next_auth_1.getServerSession)(authOptions_1.authOptions);
        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return server_1.NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        const choferId = session.user.id;
        const body = await req.json();
        const { rutaId, direccionId } = body;
        if (!rutaId || !direccionId) {
            console.warn("rutaId or direccionId is missing in the request body.");
            return server_1.NextResponse.json({
                ok: false,
                error: "rutaId and direccionId are required"
            }, { status: 400 });
        }
        // Find the rutaDespacho
        const rutaDespacho = await rutaDespacho_1.default.findOne({
            _id: rutaId,
            choferId: choferId,
            estado: constants_1.TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada
        });
        if (!rutaDespacho) {
            console.warn(`RutaDespacho not found or not in 'carga_confirmada' state for ID: ${rutaId}`);
            return server_1.NextResponse.json({
                ok: false,
                error: "RutaDespacho not found or not in correct state"
            }, { status: 404 });
        }
        // Add new route without date
        if (!rutaDespacho.ruta) {
            rutaDespacho.ruta = [];
        }
        rutaDespacho.ruta.push({
            direccionDestinoId: direccionId,
            fecha: null
        });
        // Update estado to en_ruta
        rutaDespacho.estado = constants_1.TIPO_ESTADO_RUTA_DESPACHO.en_ruta;
        console.log(`Updating rutaDespacho ID: ${rutaId} to estado: ${constants_1.TIPO_ESTADO_RUTA_DESPACHO.en_ruta}`);
        await rutaDespacho.save();
        console.log("RutaDespacho updated successfully.");
        return server_1.NextResponse.json({
            ok: true,
            message: "Viaje iniciado correctamente",
            rutaDespacho
        });
    }
    catch (error) {
        console.error("ERROR", error);
        return server_1.NextResponse.json({
            ok: false,
            error: "Internal Server Error"
        }, { status: 500 });
    }
}
