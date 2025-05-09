"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const sucursal_1 = __importDefault(require("@/models/sucursal"));
const dependencia_1 = __importDefault(require("@/models/dependencia"));
const direccion_1 = __importDefault(require("@/models/direccion"));
const cliente_1 = __importDefault(require("@/models/cliente"));
const cargo_1 = __importDefault(require("@/models/cargo"));
const user_1 = __importDefault(require("@/models/user"));
async function GET(req, props) {
    const params = await props.params;
    await (0, mongodb_1.connectMongoDB)();
    const sucursal = await sucursal_1.default.findById(params.id).lean();
    if (!sucursal) {
        return server_1.NextResponse.json({ error: "Sucursal not found" }, { status: 400 });
    }
    const dependencias = await dependencia_1.default.find({ sucursalId: sucursal._id }).lean();
    // Fetch the direccion for the sucursal
    let direccion = null;
    if (sucursal.direccionId) {
        direccion = await direccion_1.default.findById(sucursal.direccionId).lean();
        sucursal.direccion = direccion;
    }
    // Fetch the direccion for each dependencia
    for (const dependencia of dependencias) {
        if (dependencia.direccionId) {
            const dependenciaDireccion = await direccion_1.default.findById(dependencia.direccionId).lean();
            dependencia.direccion = dependenciaDireccion;
        }
        if (dependencia.clienteId) {
            const cliente = await cliente_1.default.findById(dependencia.clienteId).lean();
            dependencia.cliente = cliente;
        }
        const cargos = await cargo_1.default.find({ dependenciaId: dependencia._id }).lean();
        for (const cargo of cargos) {
            const user = await user_1.default.findById(cargo.userId).lean();
            cargo.user = user;
        }
        dependencia.cargos = cargos;
    }
    const cargos = await cargo_1.default.find({ sucursalId: sucursal._id }).lean();
    for (const cargo of cargos) {
        const user = await user_1.default.findById(cargo.userId).lean();
        cargo.user = user;
    }
    sucursal.cargos = cargos;
    return server_1.NextResponse.json({ sucursal, dependencias });
}
async function POST(req, props) {
    const params = await props.params;
    const body = await req.json();
    console.log("SUCURSAL Update v2...", body, params);
    // Update or create Direccion for Sucursal
    let direccionId = body.direccionId;
    if (body.direccion) {
        const direccion = await direccion_1.default.findOne({ apiId: body.direccion.apiId });
        if (direccion) {
            if (direccion._id) {
                direccionId = direccion._id;
            }
        }
    }
    if (!direccionId) {
        console.log("NUEVA DIRECCION...", body.direccion);
        const newDireccion = new direccion_1.default(body.direccion);
        const savedDireccion = await newDireccion.save();
        direccionId = savedDireccion._id;
    }
    // Update or create Cargos for Sucursal
    for (const cargo of body.cargos) {
        const cargoData = {
            userId: cargo.userId,
            sucursalId: params.id,
            tipo: cargo.tipo,
            desde: new Date(cargo.desde),
            createdAt: cargo.createdAt ? new Date(cargo.createdAt) : new Date(),
            updatedAt: new Date()
        };
        if (cargo.hasta != '') {
            cargo.hasta = new Date(cargo.hasta);
        }
        if (cargo._id) {
            await cargo_1.default.findByIdAndUpdate(cargo._id, cargoData, { new: true, upsert: true });
        }
        else {
            const newCargo = new cargo_1.default(cargoData);
            await newCargo.save();
        }
    }
    // Update Dependencias and their Direcciones
    for (const dependencia of body.dependencias) {
        let direccionId = dependencia.direccionId;
        // Check if direccion exists
        if (dependencia.direccion && !direccionId) {
            const direccion = await direccion_1.default.findOne({ apiId: dependencia.direccion.apiId });
            if (direccion) {
                direccionId = direccion._id;
            }
            else {
                const newDireccion = new direccion_1.default(dependencia.direccion);
                const savedDireccion = await newDireccion.save();
                direccionId = savedDireccion._id;
            }
        }
        const dependenciaData = {
            sucursalId: params.id,
            nombre: dependencia.nombre,
            direccionId: direccionId,
            operativa: dependencia.operativa,
            tipo: dependencia.tipo,
            createdAt: dependencia.createdAt ? new Date(dependencia.createdAt) : new Date(),
            updatedAt: new Date()
        };
        if (dependencia.clienteId) {
            dependenciaData.clienteId = dependencia.clienteId;
        }
        console.log("DEPENDENCIA DATA...", dependenciaData);
        if (dependencia._id) {
            await dependencia_1.default.findByIdAndUpdate(dependencia._id, dependenciaData, { new: true, upsert: true });
        }
        else {
            const newDependencia = new dependencia_1.default(dependenciaData);
            await newDependencia.save();
        }
        // Update or create Cargos for Dependencia
        for (const cargo of dependencia.cargos) {
            const cargoData = {
                userId: cargo.userId,
                dependenciaId: dependencia._id,
                tipo: cargo.tipo,
                desde: new Date(cargo.desde),
                createdAt: cargo.createdAt ? new Date(cargo.createdAt) : new Date(),
                updatedAt: new Date()
            };
            if (cargo.hasta) {
                cargoData.hasta = new Date(cargo.hasta);
            }
            console.log("CARGO DATA...", cargoData);
            if (cargo._id) {
                await cargo_1.default.findByIdAndUpdate(cargo._id, cargoData, { new: true, upsert: true });
            }
            else {
                const newCargo = new cargo_1.default(cargoData);
                await newCargo.save();
            }
        }
    }
    // Update Sucursal
    const sucursalData = {
        id: body.id,
        nombre: body.nombre,
        visible: body.visible,
        prioridad: body.prioridad,
        direccionId: direccionId,
        createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
        updatedAt: new Date()
    };
    const sucursalUpdated = await sucursal_1.default.findByIdAndUpdate(params.id, sucursalData, { new: true, upsert: true });
    if (!sucursalUpdated) {
        return server_1.NextResponse.json({ error: "Error updating sucursal" }, { status: 404 });
    }
    return server_1.NextResponse.json(sucursalUpdated);
}
