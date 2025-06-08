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
const user_1 = __importDefault(require("@/models/user"));
const cargo_1 = __importDefault(require("@/models/cargo"));
const constants_1 = require("@/app/utils/constants");
// filepath: d:/git/bioxspa/app/api/pedidos/terminarRuta/route.js
async function POST(req) {
    try {
        console.log("POST request received for terminarRuta.");
        await (0, mongodb_1.connectMongoDB)();
        console.log("MongoDB connected.");
        const session = await (0, next_auth_1.getServerSession)(authOptions_1.authOptions);
        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return server_1.NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;
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
            estado: constants_1.TIPO_ESTADO_RUTA_DESPACHO.regreso
        });
        if (!rutaDespacho) {
            console.warn(`RutaDespacho not found or not in 'regreso' state for ID: ${rutaId}`);
            return server_1.NextResponse.json({
                ok: false,
                error: "RutaDespacho not found or not in regreso state"
            }, { status: 404 });
        }
        // Verify the user is the driver assigned to this route
        if (rutaDespacho.choferId.toString() !== userId) {
            console.warn(`User ${userId} is not the assigned driver for route ${rutaId}`);
            return server_1.NextResponse.json({
                ok: false,
                error: "You are not authorized to complete this route"
            }, { status: 403 });
        }
        // Verify the user has the conductor role
        const user = await user_1.default.findById(userId);
        if (!user || !(user.role & constants_1.USER_ROLE.conductor)) {
            console.warn(`User ${userId} does not have the conductor role`);
            return server_1.NextResponse.json({
                ok: false,
                error: "You do not have permission to complete routes"
            }, { status: 403 });
        }
        // Additionally verify the user has a cargo of type conductor
        const cargo = await cargo_1.default.findOne({
            userId: userId,
            tipo: constants_1.TIPO_CARGO.conductor,
            hasta: null // Active assignment (not ended)
        });
        if (!cargo) {
            console.warn(`User ${userId} does not have an active conductor position`);
            return server_1.NextResponse.json({
                ok: false,
                error: "You do not have an active position as conductor"
            }, { status: 403 });
        }
        // Update estado to regreso_confirmado
        rutaDespacho.estado = constants_1.TIPO_ESTADO_RUTA_DESPACHO.regreso_confirmado;
        console.log(`Updating rutaDespacho ID: ${rutaId} to estado: ${constants_1.TIPO_ESTADO_RUTA_DESPACHO.regreso_confirmado}`);
        await rutaDespacho.save();
        console.log("RutaDespacho updated successfully.");
        return server_1.NextResponse.json({
            ok: true,
            message: "Ruta completada correctamente",
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
