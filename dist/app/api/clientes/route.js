"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const cliente_1 = __importDefault(require("@/models/cliente"));
async function GET() {
    try {
        await (0, mongodb_1.connectMongoDB)();
        const clientes = await cliente_1.default.find();
        return server_1.NextResponse.json({ ok: true, clientes });
    }
    catch (error) {
        console.log("ERROR!", error);
        return server_1.NextResponse.json({ error: error.message }, { status: 500 });
    }
}
async function POST(req) {
    try {
        await (0, mongodb_1.connectMongoDB)();
        const entity = await req.json();
        const exists = await cliente_1.default.findOne({ id: entity.id });
        if (exists) {
            exists.set(entity);
            await exists.save();
            return server_1.NextResponse.json({ ok: true, cliente: exists });
        }
        else {
            const newCliente = await cliente_1.default.create(entity);
            return server_1.NextResponse.json({ ok: true, cliente: newCliente });
        }
    }
    catch (error) {
        console.log("ERROR!", error);
        return server_1.NextResponse.json({ error: error.message }, { status: 500 });
    }
}
