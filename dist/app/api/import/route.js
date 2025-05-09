"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const mongodb_1 = require("@/lib/mongodb");
const server_1 = require("next/server");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const user_1 = __importDefault(require("@/models/user"));
const sucursal_1 = __importDefault(require("@/models/sucursal"));
const vehiculo_1 = __importDefault(require("@/models/vehiculo"));
const venta_1 = __importDefault(require("@/models/venta"));
const informacionEmpresa_1 = __importDefault(require("@/models/informacionEmpresa"));
const cliente_1 = __importDefault(require("@/models/cliente"));
const detalleVenta_1 = __importDefault(require("@/models/detalleVenta"));
const documentoTributario_1 = __importDefault(require("@/models/documentoTributario"));
const cuotaPagada_1 = __importDefault(require("@/models/cuotaPagada"));
const cuotaCobrada_1 = __importDefault(require("@/models/cuotaCobrada"));
const categoriaProducto_1 = __importDefault(require("@/models/categoriaProducto"));
const parseDateString = (dateString) => {
    if (!dateString) {
        return null;
    }
    const parts = dateString.split('-');
    if (parts[0].length === 4) {
        // Assuming format is YYYY-MM-DD
        const [year, month, day] = parts;
        console.log("PARSING DATE", year, month, day);
        return new Date(`${year}-${month}-${day}`);
    }
    else {
        // Assuming format is DD-MM-YYYY
        const [day, month, year] = parts;
        console.log("PARSING DATE", year, month, day);
        return new Date(`${year}-${month}-${day}`);
    }
};
async function POST(req) {
    try {
        await (0, mongodb_1.connectMongoDB)();
        const { filename, entities } = await req.json();
        console.log("IMPORTING DATA", filename, entities.length, "records");
        const batchSize = 1000;
        const processedEntities = [];
        const totalBatches = Math.ceil(entities.length / batchSize);
        for (let i = 0; i < entities.length; i += batchSize) {
            const batch = entities.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(async (entity) => {
                let Model;
                if (filename.includes("user")) {
                    Model = user_1.default;
                }
                else if (filename.includes("sucursal")) {
                    Model = sucursal_1.default;
                }
                else if (filename.includes("vehiculo")) {
                    Model = vehiculo_1.default;
                }
                else if (filename.includes("informacion_empresa")) {
                    Model = informacionEmpresa_1.default;
                }
                else if (filename.includes("cliente")) {
                    Model = cliente_1.default;
                }
                else if (filename.includes("detalle_venta")) {
                    Model = detalleVenta_1.default;
                }
                else if (filename.includes("documentotributario")) {
                    Model = documentoTributario_1.default;
                }
                else if (filename.includes("cuotaPagada")) {
                    Model = cuotaPagada_1.default;
                }
                else if (filename.includes("cuotaCobrada")) {
                    Model = cuotaCobrada_1.default;
                }
                else if (filename.includes("venta")) {
                    Model = venta_1.default;
                }
                else if (filename.includes("categoria_productos")) {
                    Model = categoriaProducto_1.default;
                }
                else {
                    return null;
                }
                if (entity.FchResol) {
                    entity.FchResol = parseDateString(entity.FchResol);
                }
                const exists = await Model.findOne({ id: entity.id });
                if (exists) {
                    exists.set(entity);
                    await exists.save();
                    return exists;
                }
                else {
                    if (Model === user_1.default && entity.password) {
                        entity.password = await bcryptjs_1.default.hash(entity.password, 10);
                    }
                    return await Model.create(entity);
                }
            }));
            processedEntities.push(...batchResults);
            const currentBatch = Math.ceil((i + batchSize) / batchSize);
            const percentage = ((currentBatch / totalBatches) * 100).toFixed(2);
            console.log(`Processing batch ${currentBatch} of ${totalBatches} (${percentage}%)`);
        }
        if (processedEntities.includes(null)) {
            return server_1.NextResponse.json({
                ok: false,
                message: "Filename does not contain valid entities"
            }, { status: 400 });
        }
        console.log("IMPORTED DATA", processedEntities.length, "records OK! 🚀");
        return server_1.NextResponse.json({
            ok: true,
            processedEntities: processedEntities
        });
    }
    catch (error) {
        console.log("ERROR!", error);
        return server_1.NextResponse.json({ error: error.message }, { status: 500 });
    }
}
