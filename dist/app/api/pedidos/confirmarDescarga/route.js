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
// filepath: d:\git\bioxspa\app\api\pedidos\confirmarDescarga\route.js
async function POST(request) {
    console.log("Starting confirmarDescarga process");
    try {
        console.log("Connecting to MongoDB");
        await (0, mongodb_1.connectMongoDB)();
        // Get rutaId from request
        const { rutaId } = await request.json();
        console.log("Request received with rutaId:", rutaId);
        // Validate rutaId
        if (!rutaId) {
            console.log("Error: rutaId is missing");
            return server_1.NextResponse.json({ ok: false, error: "rutaId is required" }, { status: 400 });
        }
        // Get user from session
        console.log("Getting user session");
        const session = await (0, next_1.getServerSession)(authOptions_1.authOptions);
        if (!session || !session.user) {
            console.log("Error: Unauthorized - No valid session");
            return server_1.NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;
        console.log("Session validated for userId:", userId);
        // Verify the user is a driver (conductor)
        console.log("Finding user in database");
        const user = await user_1.default.findById(userId);
        if (!user) {
            console.log("Error: User not found with id:", userId);
            return server_1.NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
        }
        console.log("User found:", user.email);
        // Verify user has the conductor role
        if (user.role !== constants_1.USER_ROLE.conductor) {
            console.log("Error: User has insufficient permissions, role:", user.role);
            return server_1.NextResponse.json({
                ok: false,
                error: "Insufficient permissions - requires conductor role"
            }, { status: 403 });
        }
        console.log("User role validated as conductor");
        // Verify the user has a conductor cargo assigned
        console.log("Checking for active conductor cargo");
        const cargo = await cargo_1.default.findOne({
            userId: userId,
            tipo: constants_1.TIPO_CARGO.conductor,
            hasta: null // Active cargo (not ended)
        });
        if (!cargo) {
            console.log("Error: User is not an active conductor");
            return server_1.NextResponse.json({ ok: false, error: "User is not an active conductor" }, { status: 403 });
        }
        console.log("Active cargo found for conductor:", cargo._id);
        // Find the rutaDespacho
        console.log("Finding rutaDespacho with id:", rutaId);
        const rutaDespacho = await rutaDespacho_1.default.findById(rutaId);
        if (!rutaDespacho) {
            console.log("Error: RutaDespacho not found");
            return server_1.NextResponse.json({ ok: false, error: "RutaDespacho not found" }, { status: 404 });
        }
        console.log("RutaDespacho found");
        // Verify the user is the driver assigned to this route
        if (rutaDespacho.choferId.toString() !== userId) {
            console.log("Error: User is not the assigned driver. Expected:", rutaDespacho.choferId.toString(), "Got:", userId);
            return server_1.NextResponse.json({
                ok: false,
                error: "User is not the assigned driver for this route"
            }, { status: 403 });
        }
        console.log("User verified as the assigned driver for the route");
        // Get current date
        const now = new Date();
        console.log("Updating route status to descarga_confirmada at:", now);
        // Update the route: set estado to descarga_confirmada and update historialEstado
        await rutaDespacho_1.default.findByIdAndUpdate(rutaId, {
            estado: constants_1.TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada,
            $push: {
                historialEstado: {
                    estado: constants_1.TIPO_ESTADO_RUTA_DESPACHO.descarga_confirmada,
                    fecha: now
                }
            }
        });
        console.log("Route updated successfully");
        console.log("Confirmar descarga completed successfully for rutaId:", rutaId);
        return server_1.NextResponse.json({
            ok: true,
            message: "Unloading confirmation successful"
        });
    }
    catch (error) {
        console.error("Error in POST /confirmarDescarga:", error);
        return server_1.NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
