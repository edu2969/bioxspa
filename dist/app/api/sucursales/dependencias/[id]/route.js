"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const dependencia_1 = __importDefault(require("@/models/dependencia"));
const direccion_1 = __importDefault(require("@/models/direccion"));
async function GET(req, props) {
    const params = await props.params;
    console.log("Dependencia getById...", params);
    await (0, mongodb_1.connectMongoDB)();
    const dependencia = await dependencia_1.default.findById(params.id);
    if (!dependencia) {
        return server_1.NextResponse.json({ error: "Dependencia not found" }, { status: 400 });
    }
    return server_1.NextResponse.json(dependencia);
}
async function POST(req, props) {
    const params = await props.params;
    const body = await req.json();
    console.log("DEPENDENCIA Update...", body, params);
    await (0, mongodb_1.connectMongoDB)();
    // Check if the address exists
    let direccion = await direccion_1.default.findOne({ apiId: body.place_id });
    if (!direccion) {
        // Create a new address if it doesn't exist
        direccion = new direccion_1.default({
            _id: new mongoose.Types.ObjectId().toString(),
            nombre: body.direccion.nombre,
            apiId: body.place_id,
            latitud: body.direccion.latitud,
            longitud: body.direccion.longitud,
            categoria: body.direccion.categoria
        });
        await direccion.save();
    }
    else {
        // Update the address if it exists
        direccion.nombre = body.direccion.nombre;
        direccion.latitud = body.direccion.latitud;
        direccion.longitud = body.direccion.longitud;
        direccion.categoria = body.direccion.categoria;
        await direccion.save();
    }
    const dependenciaData = {
        id: body.id,
        nombre: body.nombre,
        sucursalId: body.sucursalId,
        visible: body.visible,
        prioridad: body.prioridad,
        direccionId: direccion._id,
        clienteId: body.clientId,
        createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
        updatedAt: new Date()
    };
    const dependenciaUpdated = await dependencia_1.default.findByIdAndUpdate(params.id, dependenciaData, { new: true, upsert: true });
    return dependenciaUpdated ? server_1.NextResponse.json(dependenciaUpdated) : server_1.NextResponse.json({ error: "Error updating dependencia" }, { status: 404 });
}
