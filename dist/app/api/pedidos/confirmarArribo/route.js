"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const next_1 = require("next-auth/next");
const authOptions_1 = require("@/app/utils/authOptions");
const user_1 = __importDefault(require("@/models/user"));
const cargo_1 = __importDefault(require("@/models/cargo"));
const rutaDespacho_1 = __importDefault(require("@/models/rutaDespacho"));
const constants_1 = require("@/app/utils/constants");
async function POST(request) {
    try {
        await (0, mongodb_1.connectMongoDB)();
        // Get rutaId from request
        const { rutaId } = await request.json();
        // Validate rutaId
        if (!rutaId) {
            return server_1.NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });
        }
        // Get user from session
        const session = await (0, next_1.getServerSession)(authOptions_1.authOptions);
        if (!session || !session.user) {
            return server_1.NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;
        // Verify the user is a driver (conductor)
        const user = await user_1.default.findById(userId);
        if (!user) {
            return server_1.NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
        }
        // Verify user has the conductor role
        if (user.role !== constants_1.USER_ROLE.conductor) {
            return server_1.NextResponse.json({
                ok: false,
                error: "Insufficient permissions - requires conductor role"
            }, { status: 403 });
        }
        // Verify the user has a conductor cargo assigned
        const cargo = await cargo_1.default.findOne({
            userId: userId,
            tipo: constants_1.TIPO_CARGO.conductor,
            hasta: null // Active cargo (not ended)
        });
        if (!cargo) {
            return server_1.NextResponse.json({ ok: false, error: "User is not an active conductor" }, { status: 403 });
        }
        // Find the rutaDespacho
        const rutaDespacho = await rutaDespacho_1.default.findById(rutaId);
        if (!rutaDespacho) {
            return server_1.NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });
        }
        // Verify the user is the driver assigned to this route
        if (rutaDespacho.choferId.toString() !== userId) {
            return server_1.NextResponse.json({
                ok: false,
                error: "User is not the assigned driver for this route"
            }, { status: 403 });
        }
        // Get current date
        const now = new Date();
        // Update the route: set estado to descarga and update fechaArribo for the first null element
        await rutaDespacho_1.default.findByIdAndUpdate(rutaId, {
            estado: constants_1.TIPO_ESTADO_RUTA_DESPACHO.descarga,
            $push: {
                historialEstado: {
                    estado: constants_1.TIPO_ESTADO_RUTA_DESPACHO.descarga,
                    fecha: now
                }
            }
        });
        // Find the index of the first element in ruta array where fechaArribo is null
        const rutaIndex = rutaDespacho.ruta.findIndex(r => r.fechaArribo === null);
        if (rutaIndex >= 0) {
            // Update the fechaArribo of that specific element
            rutaDespacho.ruta[rutaIndex].fechaArribo = now;
            await rutaDespacho.save();
        }
        return server_1.NextResponse.json({
            ok: true,
            message: "Route arrival confirmed successfully"
        });
    }
    catch (error) {
        console.error("Error in POST /confirmarArribo:", error);
        return server_1.NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
