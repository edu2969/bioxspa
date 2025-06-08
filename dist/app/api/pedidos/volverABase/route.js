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
const cargo_1 = __importDefault(require("@/models/cargo"));
const dependencia_1 = __importDefault(require("@/models/dependencia"));
const constants_2 = require("@/app/utils/constants");
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
        const { rutaId } = body;
        if (!rutaId) {
            console.warn("rutaId is missing in the request body.");
            return server_1.NextResponse.json({
                ok: false,
                error: "rutaId is required"
            }, { status: 400 });
        }
        // Find the rutaDespacho
        const rutaDespacho = await rutaDespacho_1.default.findOne({
            _id: rutaId,
            choferId: choferId
        });
        if (!rutaDespacho) {
            console.warn(`RutaDespacho not found or not in 'carga_confirmada' state for ID: ${rutaId}`);
            return server_1.NextResponse.json({
                ok: false,
                error: "RutaDespacho not found or not in correct state"
            }, { status: 404 });
        }
        // Import necessary models and constants
        // Find the driver's cargo (position) that corresponds to conductor (driver) type
        const cargo = await cargo_1.default.findOne({
            userId: choferId,
            tipo: constants_2.TIPO_CARGO.conductor
        });
        if (!cargo) {
            console.warn(`No conductor cargo found for user ID: ${choferId}`);
            return server_1.NextResponse.json({
                ok: false,
                error: "No conductor cargo found for user"
            }, { status: 404 });
        }
        // Get the dependencia associated with the cargo
        const dependencia = await dependencia_1.default.findById(cargo.dependenciaId);
        if (!dependencia) {
            console.warn(`Dependencia not found for ID: ${cargo.dependenciaId}`);
            return server_1.NextResponse.json({
                ok: false,
                error: "Dependencia not found"
            }, { status: 404 });
        }
        // Get the direccion ID from the dependencia
        const direccionId = dependencia.direccionId;
        if (!direccionId) {
            console.warn(`DireccionId not found in dependencia ID: ${dependencia._id}`);
            return server_1.NextResponse.json({
                ok: false,
                error: "DireccionId not found in dependencia"
            }, { status: 404 });
        }
        rutaDespacho.ruta.push({
            direccionDestinoId: direccionId,
            fecha: null
        });
        // Update estado to en_ruta
        rutaDespacho.estado = constants_1.TIPO_ESTADO_RUTA_DESPACHO.regreso;
        console.log(`Updating rutaDespacho ID: ${rutaId} to estado: ${constants_1.TIPO_ESTADO_RUTA_DESPACHO.regreso}`);
        await rutaDespacho.save();
        console.log("RutaDespacho updated successfully.");
        return server_1.NextResponse.json({
            ok: true,
            message: "Viaje iniciado correctamente"
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
