"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const itemCatalogo_1 = __importDefault(require("@/models/itemCatalogo"));
const constants_1 = require("@/app/utils/constants");
async function POST(request) {
    try {
        await (0, mongodb_1.connectMongoDB)();
        const { items } = await request.json();
        if (!Array.isArray(items)) {
            return server_1.NextResponse.json({ error: "Invalid payload format. 'items' should be an array." }, { status: 400 });
        }
        const updatePromises = items.map(async ({ codigo, nuevoEstado }) => {
            if (!codigo || nuevoEstado === undefined || !(nuevoEstado in constants_1.TIPO_ESTADO_VENTA)) {
                throw new Error(`Invalid item data: { codigo: ${codigo}, nuevoEstado: ${nuevoEstado} }`);
            }
            return itemCatalogo_1.default.updateOne({ codigo }, { $set: { estado: nuevoEstado } });
        });
        await Promise.all(updatePromises);
        return server_1.NextResponse.json({ message: "Estados actualizados correctamente." });
    }
    catch (error) {
        console.error("Error updating item states:", error);
        return server_1.NextResponse.json({ error: "Error updating item states." }, { status: 500 });
    }
}
