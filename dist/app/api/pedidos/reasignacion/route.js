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
const venta_1 = __importDefault(require("@/models/venta"));
const rutaDespacho_1 = __importDefault(require("@/models/rutaDespacho"));
const constants_1 = require("@/app/utils/constants");
async function POST(request) {
    try {
        await (0, mongodb_1.connectMongoDB)();
        // Get ventaId from request
        const { ventaId } = await request.json();
        // Validate ventaId
        if (!ventaId) {
            return server_1.NextResponse.json({ ok: false, error: "ventaId is required" }, { status: 400 });
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
        // Verify user has the required role (manager or supervisor)
        if (user.role && !(constants_1.USER_ROLE.manager || constants_1.USER_ROLE.supervisor)) {
            return server_1.NextResponse.json({
                ok: false,
                error: "Insufficient permissions - requires manager or supervisor role"
            }, { status: 403 });
        }
        // Verify the user has a conductor cargo assigned
        const cargo = await cargo_1.default.findOne({
            userId: userId,
            tipo: constants_1.TIPO_CARGO.cobranza,
            hasta: null // Active cargo (not ended)
        });
        if (!cargo) {
            return server_1.NextResponse.json({ ok: false, error: "User is not an cobranza" }, { status: 403 });
        }
        // Find the rutaDespacho that contains this venta
        const rutaDespacho = await rutaDespacho_1.default.findOne({
            ventaIds: ventaId,
            estado: constants_1.TIPO_ESTADO_RUTA_DESPACHO.preparacion
        });
        if (!rutaDespacho) {
            return server_1.NextResponse.json({ ok: false, error: "Venta not found in any RutaDespacho" }, { status: 404 });
        }
        // Remove the ventaId from the rutaDespacho
        await rutaDespacho_1.default.findByIdAndUpdate(rutaDespacho._id, { $pull: { ventaIds: ventaId } });
        if (rutaDespacho.ventaIds.length === 1) {
            // Delete the route if it becomes empty
            await rutaDespacho_1.default.findByIdAndDelete(rutaDespacho._id);
        }
        // Update the venta status back to borrador
        await venta_1.default.findByIdAndUpdate(ventaId, { estado: constants_1.TIPO_ESTADO_VENTA.borrador });
        return server_1.NextResponse.json({
            ok: true,
            message: "Venta successfully unassigned and returned to draft status"
        });
    }
    catch (error) {
        console.error("Error in POST /desasignacion:", error);
        return server_1.NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
