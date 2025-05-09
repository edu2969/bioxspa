"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const mongodb_1 = require("@/lib/mongodb");
const sucursal_1 = __importDefault(require("@/models/sucursal"));
const server_1 = require("next/server");
// GET all sucursales
async function GET() {
    try {
        await (0, mongodb_1.connectMongoDB)();
        const sucursales = await sucursal_1.default.find({ visible: true }).sort({ prioridad: 1 });
        return server_1.NextResponse.json({ sucursales });
    }
    catch (error) {
        console.log(error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
