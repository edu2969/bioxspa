"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const categoriaCatalogo_1 = __importDefault(require("@/models/categoriaCatalogo"));
const subcategoriaCatalogo_1 = __importDefault(require("@/models/subcategoriaCatalogo"));
async function GET() {
    await (0, mongodb_1.connectMongoDB)();
    const categorias = await categoriaCatalogo_1.default.find().lean();
    const categoriasConSubcategorias = await Promise.all(categorias.map(async (categoria) => {
        const cantidadSubcategorias = await subcategoriaCatalogo_1.default.countDocuments({ categoriaCatalogoId: categoria._id });
        return Object.assign(Object.assign({}, categoria), { cantidadSubcategorias });
    }));
    return server_1.NextResponse.json(categoriasConSubcategorias);
}
