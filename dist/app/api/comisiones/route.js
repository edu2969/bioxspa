"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const user_1 = __importDefault(require("@/models/user"));
const comision_1 = __importDefault(require("@/models/comision"));
const constants_1 = require("@/app/utils/constants");
const cliente_1 = __importDefault(require("@/models/cliente"));
async function GET() {
    console.log("Connecting to MongoDB...");
    await (0, mongodb_1.connectMongoDB)();
    console.log("Connected to MongoDB");
    console.log("Fetching users...");
    const users = await user_1.default.find({ role: { $ne: constants_1.USER_ROLE.neo } }).lean();
    console.log(`Fetched ${users.length} users`);
    console.log("Mapping users with comision...");
    const usersWithComision = await Promise.all(users.map(async (user) => {
        const now = new Date();
        const comisiones = await comision_1.default.find({
            userId: user._id,
            $or: [
                { fechaHasta: null },
                { fechaHasta: { $gte: now } }
            ],
        }).lean();
        const comisionesWithCliente = await Promise.all(comisiones.map(async (comision) => {
            if (comision.clienteId) {
                comision.cliente = await cliente_1.default.findOne({ _id: comision.clienteId }).lean();
            }
            return comision;
        }));
        return Object.assign(Object.assign({}, user), { comisiones: comisionesWithCliente });
    }));
    console.log("Returning users with comision");
    return server_1.NextResponse.json(usersWithComision);
}
async function POST(req) {
    const body = await req.json();
    await (0, mongodb_1.connectMongoDB)();
    const comisionData = {
        userId: body.userId,
        fechaDesde: body.fechaDesde ? new Date(body.fechaDesde) : new Date("2021-01-01"),
        fechaHasta: body.fechaHasta ? new Date(body.fechaHasta) : null,
        comisionGeneral: body.comisionGeneral || 0,
        comisionRetiro: body.comisionRetiro || 0,
        comisionEntrega: body.comisionEntrega || 0,
        comisionPtoVta: body.comisionPtoVta || 0,
    };
    const comisionUpdated = await comision_1.default.findOneAndUpdate({ userId: body.userId }, comisionData, { new: true, upsert: true });
    if (!comisionUpdated) {
        return server_1.NextResponse.json({ error: "Error updating comision" }, { status: 404 });
    }
    return server_1.NextResponse.json(comisionUpdated);
}
