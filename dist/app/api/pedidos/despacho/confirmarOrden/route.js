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
const cargo_1 = __importDefault(require("@/models/cargo"));
const constants_1 = require("@/app/utils/constants");
async function POST() {
    try {
        console.log("[CONFIRMAR ORDEN] Iniciando proceso de confirmación de orden");
        await (0, mongodb_1.connectMongoDB)();
        console.log("[CONFIRMAR ORDEN] Conexión a MongoDB establecida");
        const session = await (0, next_auth_1.getServerSession)(authOptions_1.authOptions);
        if (!session || !session.user || !session.user.id) {
            console.warn("[CONFIRMAR ORDEN] Sesión no válida o usuario no autenticado");
            return server_1.NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        const choferId = session.user.id;
        console.log(`[CONFIRMAR ORDEN] Usuario autenticado: ${choferId}`);
        // Verificar que el usuario tenga cargo de chofer activo
        const cargoChofer = await cargo_1.default.findOne({
            userId: choferId,
            tipo: constants_1.TIPO_CARGO.conductor,
            $or: [
                { hasta: null },
                { hasta: { $gte: new Date() } }
            ]
        });
        if (!cargoChofer) {
            console.warn(`[CONFIRMAR ORDEN] Usuario ${choferId} no tiene cargo de chofer activo`);
            return server_1.NextResponse.json({ ok: false, error: "No autorizado: no es chofer activo" }, { status: 403 });
        }
        console.log(`[CONFIRMAR ORDEN] Cargo de chofer activo verificado para usuario ${choferId}`);
        // Buscar la ruta asociada al chofer en estado orden_cargada
        const rutaDespacho = await rutaDespacho_1.default.findOne({
            choferId: choferId,
            estado: constants_1.TIPO_ESTADO_RUTA_DESPACHO.orden_cargada
        });
        if (!rutaDespacho) {
            console.warn(`[CONFIRMAR ORDEN] No se encontró ruta en estado 'orden_cargada' para chofer ${choferId}`);
            return server_1.NextResponse.json({ ok: false, error: "No hay ruta en estado 'orden_cargada' para este chofer" }, { status: 404 });
        }
        console.log(`[CONFIRMAR ORDEN] Ruta encontrada (ID: ${rutaDespacho._id}) en estado 'orden_cargada'`);
        // Cambiar estado a orden_confirmada y agregar al historial
        rutaDespacho.estado = constants_1.TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada;
        rutaDespacho.historialEstado.push({
            estado: constants_1.TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada,
            fecha: new Date()
        });
        await rutaDespacho.save();
        console.log(`[CONFIRMAR ORDEN] Estado de la ruta actualizado a 'orden_confirmada' y guardado en base de datos`);
        return server_1.NextResponse.json({ ok: true, message: "Orden confirmada correctamente" });
    }
    catch (error) {
        console.error("[CONFIRMAR ORDEN] Error interno:", error);
        return server_1.NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
