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
const cargo_1 = __importDefault(require("@/models/cargo"));
const venta_1 = __importDefault(require("@/models/venta"));
async function GET() {
    try {
        console.log("Fetching server session...");
        const session = await (0, next_auth_1.getServerSession)(authOptions_1.authOptions);
        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return server_1.NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        await (0, mongodb_1.connectMongoDB)();
        const userId = session.user.id;
        // Find the user's cargo
        const userCargo = await cargo_1.default.findOne({
            userId,
            tipo: constants_1.TIPO_CARGO.despacho
        });
        if (!userCargo) {
            console.warn("User does not have a despacho cargo.");
            return server_1.NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
        }
        console.log("User cargo found:", userCargo);
        // Find all chofer cargos in the same dependencia
        const choferCargos = await cargo_1.default.find({
            dependenciaId: userCargo.dependenciaId,
            tipo: constants_1.TIPO_CARGO.conductor
        });
        const choferIds = choferCargos.map(cargo => cargo.userId);
        console.log("Chofer IDs found:", choferIds);
        // Find ventas in estado 'preparacion' for choferes in the dependencia
        const ventas = await venta_1.default.find({
            estado: constants_1.TIPO_ESTADO_VENTA.preparacion
        });
        const ventaIds = ventas.map(venta => venta._id);
        // Count rutasDespacho where the ventas are present
        const cantidadRutas = await rutaDespacho_1.default.countDocuments({
            ventaIds: { $in: ventaIds },
            choferId: { $in: choferIds }
        });
        return server_1.NextResponse.json({ ok: true, cantidadRutas });
    }
    catch (error) {
        console.error("ERROR!", error);
        return server_1.NextResponse.json({ error: error.message }, { status: 500 });
    }
}
