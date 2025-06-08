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
const subcategoriaCatalogo_1 = __importDefault(require("@/models/subcategoriaCatalogo"));
async function GET() {
    console.log("Connecting to MongoDB...");
    await (0, mongodb_1.connectMongoDB)();
    console.log("Connected to MongoDB");
    console.log("Fetching clients...");
    const clients = await cliente_1.default.find().lean();
    console.log(`Fetched ${clients.length} clients`);
    console.log("Mapping clients with precios...");
    const clientsWithPrecios = await Promise.all(clients.map(async (client) => {
        const precios = await precio_1.default.find({ clienteId: client._id }).sort({ createdAt: -1 }).lean();
        const preciosWithDetails = await Promise.all(precios.map(async (precio) => {
            // Asegúrate de importar el modelo SubcategoriaCatalogo arriba:
            // import SubcategoriaCatalogo from "@/models/subcategoriaCatalogo";
            const subcategoria = await subcategoriaCatalogo_1.default.findById(precio.subcategoriaCatalogoId).lean();
            return {
                valor: precio.valor,
                fechaDesde: precio.fechaDesde,
                subcategoriaCatalogoId: precio.subcategoriaCatalogoId,
                categoriaId: subcategoria ? subcategoria.categoriaCatalogoId : null
            };
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
    console.log("Connecting to MongoDB...");
    await (0, mongodb_1.connectMongoDB)();
    console.log("Connected to MongoDB");
    const body = await req.json();
    console.log("Received body:", body);
    // Extraer datos del payload
    const { precioId, subcategoriaCatalogoId, valor, clienteId } = body;
    // Validación básica
    if (!subcategoriaCatalogoId || !clienteId) {
        console.warn("Missing subcategoriaCatalogoId or clienteId");
        return server_1.NextResponse.json({ error: "subcategoriaCatalogoId y clienteId son requeridos" }, { status: 400 });
    }
    // Buscar si existe el precio (por _id si es update, o por clienteId+subcategoriaCatalogoId si es nuevo)
    let precio;
    if (precioId) {
        console.log(`Looking for Precio by precioId: ${precioId}`);
        precio = await precio_1.default.findById(precioId);
    }
    else {
        console.log(`Looking for Precio by clienteId: ${clienteId} and subcategoriaCatalogoId: ${subcategoriaCatalogoId}`);
        precio = await precio_1.default.findOne({ clienteId, subcategoriaCatalogoId });
        if (precio) {
            console.warn("Precio already exists for this clienteId and subcategoriaCatalogoId, updating instead of creating a new one");
            return server_1.NextResponse.json({ error: "Ya existe un precio para este cliente y subcategoría" });
        }
    }
    if (precio) {
        console.log("Precio found, updating historial and fields");
        // Actualizar historial
        if (!Array.isArray(precio.historial))
            precio.historial = [];
        const valorAnterior = precio.valor || 0;
        const varianza = valorAnterior !== 0 ? ((valor - valorAnterior) / valorAnterior) * 100 : 0;
        precio.historial.push({
            valor: valorAnterior,
            fecha: precio.fechaDesde,
            varianza
        });
        // Actualizar campos
        precio.categoriaId = categoriaId;
        precio.subcategoriaCatalogoId = subcategoriaCatalogoId;
        precio.valor = valor;
        precio.clienteId = clienteId;
        precio.fechaDesde = new Date();
        await precio.save();
        console.log("Precio updated:", precio);
        return server_1.NextResponse.json({ ok: true, precio });
    }
    else {
        console.log("Precio not found, creating new Precio");
        // Crear nuevo precio
        const nuevoPrecio = await precio_1.default.create({
            clienteId,
            subcategoriaCatalogoId,
            valor,
            fechaDesde: new Date(),
            historial: [],
        });
        console.log("Nuevo Precio created:", nuevoPrecio);
        return server_1.NextResponse.json({ ok: true, precio: nuevoPrecio });
    }
}
