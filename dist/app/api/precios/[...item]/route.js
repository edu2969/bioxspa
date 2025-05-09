"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const precio_1 = __importDefault(require("@/models/precio"));
const cliente_1 = __importDefault(require("@/models/cliente"));
async function GET(req, props) {
    const params = await props.params;
    const { item } = params;
    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get("clienteId");
    const usuarioId = searchParams.get("usuarioId");
    console.log("PARAMS", params);
    console.log("SEARCH PARAMS", searchParams);
    console.log("Connecting to MongoDB...");
    await (0, mongodb_1.connectMongoDB)();
    console.log("Connected to MongoDB");
    const query = { subcategoriaCatalogoId: item[0] };
    if (clienteId) {
        console.log(`Filtering by clienteId: ${clienteId}`);
        query.clienteId = clienteId;
    }
    if (usuarioId) {
        console.log(`Filtering by usuarioId: ${usuarioId}`);
        query.userId = usuarioId;
    }
    console.log("Fetching price...");
    const precio = await precio_1.default.findOne(query).populate('subcategoriaCatalogoId').lean();
    console.log("PRECIO", query, precio);
    if (!precio) {
        const cliente = clienteId ? await cliente_1.default.findById(clienteId).select('tipoPrecio').lean() : null;
        if (cliente) {
            console.log(`Searching for clients with the same price type: ${cliente.tipoPrecio}`);
            const similarClients = await cliente_1.default.find({ tipoPrecio: cliente.tipoPrecio }).select('_id').lean();
            const similarClientIds = similarClients.map(c => c._id);
            console.log(`Found ${similarClientIds.length} clients with the same price type`);
            const similarPrice = await precio_1.default.findOne({
                'subcategoriaCatalogoId': item[0],
                'clienteId': { $in: similarClientIds },
            }).sort({ createdAt: -1 }).populate('subcategoriaCatalogoId').populate('clienteId').lean();
            if (similarPrice) {
                console.log("Returning the most recent similar price");
                return server_1.NextResponse.json(Object.assign(Object.assign({}, similarPrice), { sugerido: true }));
            }
        }
        return server_1.NextResponse.json({ error: "Price not found" }, { status: 404 });
    }
    console.log("Returning price");
    return server_1.NextResponse.json(precio);
}
