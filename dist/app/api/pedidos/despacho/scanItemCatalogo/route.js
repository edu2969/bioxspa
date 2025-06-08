"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const itemCatalogo_1 = __importDefault(require("@/models/itemCatalogo"));
const categoriaCatalogo_1 = __importDefault(require("@/models/categoriaCatalogo"));
const subcategoriaCatalogo_1 = __importDefault(require("@/models/subcategoriaCatalogo"));
// filepath: d:/git/bioxspa/app/api/pedidos/despacho/scanItemCatalogo/route.js
async function GET(request) {
    try {
        console.log("Connecting to MongoDB...");
        await (0, mongodb_1.connectMongoDB)();
        console.log("MongoDB connected.");
        const { searchParams } = new URL(request.url);
        const codigo = searchParams.get("codigo");
        if (!codigo) {
            console.warn("No 'codigo' provided in query.");
            return server_1.NextResponse.json({ ok: false, error: "Codigo is required" }, { status: 400 });
        }
        console.log(`Searching for ItemCatalogo with codigo: ${codigo}`);
        const item = await itemCatalogo_1.default.findOne({ codigo }).lean();
        if (!item) {
            console.warn(`ItemCatalogo not found for codigo: ${codigo}`);
            return server_1.NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
        }
        console.log("Fetching related SubcategoriaCatalogo...");
        const subcategoria = await subcategoriaCatalogo_1.default.findById(item.subcategoriaCatalogoId).lean();
        let categoria = null;
        if (subcategoria) {
            console.log("Fetching related CategoriaCatalogo...");
            categoria = await categoriaCatalogo_1.default.findById(subcategoria.categoriaCatalogoId).lean();
        }
        console.log("ItemCatalogo found, returning response.");
        return server_1.NextResponse.json({
            ok: true,
            item,
            categoria: categoria || null,
            subcategoria: subcategoria || null,
        });
    }
    catch (_a) {
        return server_1.NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
