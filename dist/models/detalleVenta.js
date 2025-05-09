"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const DetalleVentaSchema = new mongoose_1.default.Schema({
    temporalId: { type: String },
    ventaId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Venta', required: true },
    glosa: { type: String },
    codigo: { type: String },
    codigoProducto: { type: String },
    codigoCilindro: { type: String, default: null },
    subcategoriaCatalogoId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'SubcategoriaCatalogo',
        default: null
    },
    itemCatalogoIds: {
        type: [mongoose_1.default.Schema.Types.ObjectId],
        ref: 'ItemCatalogo',
        default: null
    },
    tipo: { type: Number }, // 1: pedido, 2: retiro
    cantidad: { type: Number, required: true },
    especifico: { type: Number },
    neto: { type: Number, required: true },
    iva: { type: Number, required: true },
    total: { type: Number, required: true }
}, { timestamps: true });
const DetalleVenta = mongoose_1.default.models.DetalleVenta || mongoose_1.default.model('DetalleVenta', DetalleVentaSchema);
exports.default = DetalleVenta;
