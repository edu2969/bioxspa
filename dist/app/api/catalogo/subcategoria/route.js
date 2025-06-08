"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const itemCatalogo_1 = __importDefault(require("@/models/itemCatalogo"));
const subcategoriaCatalogo_1 = __importDefault(require("@/models/subcategoriaCatalogo"));
async function GET(request) {
    const { searchParams } = new URL(request.url);
    const categoriaCatalogoId = searchParams.get('id');
    await (0, mongodb_1.connectMongoDB)();
    const subcategorias = await subcategoriaCatalogo_1.default.find(categoriaCatalogoId ? { categoriaCatalogoId } : {}).lean();
    const subcategoriasConItems = await Promise.all(subcategorias.map(async (subcategoria) => {
        const cantidadItemsCatalogo = await itemCatalogo_1.default.countDocuments({ subcategoriaCatalogoId: subcategoria._id });
        return Object.assign(Object.assign({}, subcategoria), { cantidadItemsCatalogo });
    }));
    return server_1.NextResponse.json(subcategoriasConItems);
}
