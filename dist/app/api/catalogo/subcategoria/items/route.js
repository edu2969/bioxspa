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
const categoriaCatalogo_1 = __importDefault(require("@/models/categoriaCatalogo"));
async function GET(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return server_1.NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }
    await (0, mongodb_1.connectMongoDB)();
    const itemsCatalogo = await itemCatalogo_1.default.find({ subcategoriaCatalogoIds: id }).lean();
    const subcategoria = await subcategoriaCatalogo_1.default.findById(id).lean();
    if (!subcategoria) {
        return server_1.NextResponse.json({ error: "Subcategoria not found" }, { status: 404 });
    }
    const categoria = await categoriaCatalogo_1.default.findById(subcategoria.categoriaCatalogoId).lean();
    if (!categoria) {
        return server_1.NextResponse.json({ error: "Categoria not found" }, { status: 404 });
    }
    const itemsWithNames = itemsCatalogo.map(item => (Object.assign(Object.assign({}, item), { nombreCategoria: categoria.nombre, nombreSubcategoria: subcategoria.nombre })));
    return server_1.NextResponse.json(itemsWithNames);
}
