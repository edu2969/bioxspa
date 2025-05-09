"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const cliente_1 = __importDefault(require("@/models/cliente"));
const precio_1 = __importDefault(require("@/models/precio"));
const categoriaCatalogo_1 = __importDefault(require("@/models/categoriaCatalogo"));
const subcategoriaCatalogo_1 = __importDefault(require("@/models/subcategoriaCatalogo"));
async function GET(req) {
    try {
        await (0, mongodb_1.connectMongoDB)();
        const { searchParams } = new URL(req.url);
        const clienteId = searchParams.get("clienteId");
        if (!clienteId) {
            const errorMessage = "Field 'clienteId' is required in the query parameters";
            console.error("Validation Error:", errorMessage);
            return server_1.NextResponse.json({ error: errorMessage }, { status: 400 });
        }
        const cliente = await cliente_1.default.findById(clienteId).select("nombre rut tipoPrecio");
        if (!cliente) {
            const errorMessage = "Cliente not found";
            console.error("Validation Error:", errorMessage);
            return server_1.NextResponse.json({ error: errorMessage }, { status: 404 });
        }
        // Obtener los precios asociados al clienteId
        const preciosList = await precio_1.default.find({ clienteId }).select("-__v -createdAt -updatedAt").lean();
        // Agregar el atributo 'nombre' a cada precio
        for (const precio of preciosList) {
            const subcategoria = await subcategoriaCatalogo_1.default.findById(precio.subcategoriaCatalogoId).select("nombre categoriaCatalogoId").lean();
            if (subcategoria) {
                const categoria = await categoriaCatalogo_1.default.findById(subcategoria.categoriaCatalogoId).select("nombre").lean();
                if (categoria) {
                    precio.nombre = `${categoria.nombre} - ${subcategoria.nombre}`;
                }
            }
        }
        const precios = {
            tipoPrecio: cliente.tipoPrecio,
            nombre: cliente.nombre,
            rut: cliente.rut,
            precios: preciosList, // Incluir el listado de precios con el atributo 'nombre'
        };
        return server_1.NextResponse.json({ ok: true, precios });
    }
    catch (error) {
        console.error("ERROR!", error);
        return server_1.NextResponse.json({ error: error.message }, { status: 500 });
    }
}
