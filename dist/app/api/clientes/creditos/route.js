"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const cliente_1 = __importDefault(require("@/models/cliente"));
async function GET(req) {
    const params = await req.nextUrl;
    console.log("CLIENTE getById...", params);
    await (0, mongodb_1.connectMongoDB)();
    const cliente = await cliente_1.default.findById(params.id).lean();
    if (!cliente) {
        return server_1.NextResponse.json({ error: "Cliente not found" }, { status: 400 });
    }
    // Add credito information
    cliente.credito = {
        actual: 1000000,
        maximo: 2500000
    };
    console.log("SALDRÁ", { cliente });
    return server_1.NextResponse.json({ cliente });
}
