"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const precio_1 = __importDefault(require("@/models/precio"));
const cliente_1 = __importDefault(require("@/models/cliente"));
async function GET() {
    console.log("Connecting to MongoDB...");
    await (0, mongodb_1.connectMongoDB)();
    console.log("Connected to MongoDB");
    console.log("Fetching clients...");
    const clients = await cliente_1.default.find().lean();
    console.log(`Fetched ${clients.length} clients`);
    console.log("Mapping clients with precios...");
    const clientsWithPrecios = await Promise.all(clients.map(async (client) => {
        const precios = await precio_1.default.find({ clienteId: client._id }).sort({ fechaDesde: -1 }).lean();
        const preciosWithDetails = precios.map(precio => ({
            valor: precio.valor,
            moneda: precio.moneda,
            fechaDesde: precio.fechaDesde,
            fechaHasta: precio.fechaHasta,
            valorBruto: precio.valorBruto,
            impuesto: precio.impuesto,
            historial: precio.historial,
            subcategoriaCatalogoId: precio.subcategoriaCatalogoId,
            dependenciaId: precio.dependenciaId,
            sucursalId: precio.sucursalId
        }));
        return {
            cliente: {
                nombre: client.nombre,
                _id: client._id,
                rut: client.rut
            },
            precios: preciosWithDetails
        };
    }));
    console.log("Returning clients with precios");
    return server_1.NextResponse.json(clientsWithPrecios);
}
async function POST(req) {
    const body = await req.json();
    await (0, mongodb_1.connectMongoDB)();
    const precioData = {
        itemCatalogoId: body.itemCatalogoId,
        usuarioId: body.usuarioId,
        dependenciaId: body.dependenciaId || null,
        sucursalId: body.sucursalId || null,
        valorBruto: body.valorBruto,
        impuesto: body.impuesto,
        moneda: body.moneda,
        valor: body.valor,
        fechaDesde: new Date(body.fechaDesde),
        fechaHasta: body.fechaHasta ? new Date(body.fechaHasta) : null,
        historial: body.historial || []
    };
    const precioUpdated = await precio_1.default.findOneAndUpdate({ usuarioId: body.usuarioId, itemCatalogoId: body.itemCatalogoId }, precioData, { new: true, upsert: true });
    if (!precioUpdated) {
        return server_1.NextResponse.json({ error: "Error updating precio" }, { status: 404 });
    }
    return server_1.NextResponse.json(precioUpdated);
}
