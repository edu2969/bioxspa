"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const authOptions_1 = require("@/app/utils/authOptions");
const mongodb_1 = require("@/lib/mongodb");
const user_1 = __importDefault(require("@/models/user"));
const rutaDespacho_1 = __importDefault(require("@/models/rutaDespacho"));
const vehiculo_1 = __importDefault(require("@/models/vehiculo"));
const constants_1 = require("@/app/utils/constants");
const cliente_1 = __importDefault(require("@/models/cliente"));
const direccion_1 = __importDefault(require("@/models/direccion"));
const subcategoriaCatalogo_1 = __importDefault(require("@/models/subcategoriaCatalogo"));
const categoriaCatalogo_1 = __importDefault(require("@/models/categoriaCatalogo"));
const itemCatalogo_1 = __importDefault(require("@/models/itemCatalogo"));
const venta_1 = __importDefault(require("@/models/venta"));
async function GET() {
    try {
        console.log("Connecting to MongoDB...");
        await (0, mongodb_1.connectMongoDB)();
        console.log("MongoDB connected.");
        if (!mongoose_1.default.models.Cliente) {
            mongoose_1.default.model("Cliente", cliente_1.default.schema);
        }
        if (!mongoose_1.default.models.Direccion) {
            mongoose_1.default.model("Direccion", direccion_1.default.schema);
        }
        if (!mongoose_1.default.models.SubcategoriaCatalogo) {
            mongoose_1.default.model("SubcategoriaCatalogo", subcategoriaCatalogo_1.default.schema);
        }
        if (!mongoose_1.default.models.CategoriaCatalogo) {
            mongoose_1.default.model("CategoriaCatalogo", categoriaCatalogo_1.default.schema);
        }
        if (!mongoose_1.default.models.ItemCatalogo) {
            mongoose_1.default.model("ItemCatalogo", itemCatalogo_1.default.schema);
        }
        if (!mongoose_1.default.models.Venta) {
            mongoose_1.default.model("Venta", venta_1.default.schema);
        }
        console.log("Fetching server session...");
        const session = await (0, next_auth_1.getServerSession)(authOptions_1.authOptions);
        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return server_1.NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        const choferId = session.user.id;
        console.log(`Fetching chofer with ID: ${choferId}`);
        const chofer = await user_1.default.findById(choferId).lean();
        if (!chofer) {
            console.warn(`Chofer not found for ID: ${choferId}`);
            return server_1.NextResponse.json({ ok: false, error: "Chofer not found" }, { status: 404 });
        }
        console.log(`Fetching rutasDespacho for choferId: ${choferId}`);
        const rutaDespacho = await rutaDespacho_1.default.findOne({
            choferId: choferId,
            estado: { $gte: constants_1.TIPO_ESTADO_RUTA_DESPACHO.preparacion, $lt: constants_1.TIPO_ESTADO_RUTA_DESPACHO.terminado }
        }).populate({
            path: "cargaItemIds",
            model: "ItemCatalogo",
            select: "_id codigo subcategoriaCatalogoId",
            populate: {
                path: "subcategoriaCatalogoId",
                model: "SubcategoriaCatalogo",
                select: "cantidad unidad nombreGas sinSifon",
                populate: {
                    path: "categoriaCatalogoId",
                    model: "CategoriaCatalogo",
                    select: "elemento esIndustrial esMedicinal"
                }
            }
        }).populate({
            path: "ventaIds",
            model: "Venta",
            select: "_id clienteId",
            populate: {
                path: "clienteId",
                model: "Cliente",
                select: "_id nombre",
                populate: {
                    path: "direccionId",
                    model: "Direccion",
                    select: "_id nombre latitud longitud",
                }
            }
        })
            .lean();
        console.log(`Fetching vehiculos for choferId: ${choferId}`);
        const vehiculos = await vehiculo_1.default.find({
            choferIds: new mongoose_1.default.mongo.ObjectId(choferId)
        }).lean();
        console.log("Returning response with rutasDespacho, vehiculos");
        return server_1.NextResponse.json({ ok: true, rutaDespacho, vehiculos });
    }
    catch (error) {
        console.error("ERROR", error);
        return server_1.NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
async function POST(req) {
    try {
        console.log("POST request received for asignacion chofer.");
        console.log("Connecting to MongoDB...");
        await (0, mongodb_1.connectMongoDB)();
        console.log("MongoDB connected.");
        console.log("Fetching server session...");
        const session = await (0, next_auth_1.getServerSession)(authOptions_1.authOptions);
        if (!session || !session.user || !session.user.id) {
            console.warn("Unauthorized access attempt.");
            return server_1.NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        const choferId = session.user.id;
        const body = await req.json();
        const { vehiculoId } = body;
        if (!vehiculoId) {
            console.warn("vehiculoId is missing in the request body.");
            return server_1.NextResponse.json({ ok: false, error: "vehiculoId is required" }, { status: 400 });
        }
        console.log(`Fetching rutaDespacho for choferId: ${choferId}`);
        const rutaDespacho = await rutaDespacho_1.default.findOne({
            choferId: choferId,
            estado: { $in: [constants_1.TIPO_ESTADO_RUTA_DESPACHO.orden_confirmada] }
        });
        if (!rutaDespacho) {
            console.warn(`RutaDespacho not found or not in "orden_confirmada' state for choferId: ${choferId}`);
            return server_1.NextResponse.json({ ok: true, rutaDespacho: null });
        }
        console.log(`Assigning choferId: ${choferId} to rutaDespacho ID: ${rutaDespacho._id}`);
        rutaDespacho.vehiculoId = vehiculoId;
        await rutaDespacho.save();
        console.log("Returning updated rutaDespacho.");
        return server_1.NextResponse.json({ ok: true, rutaDespacho });
    }
    catch (error) {
        console.error("ERROR", error);
        return server_1.NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
