"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const HistorialSchema = new mongoose_1.default.Schema({
    valor: { type: Number, required: true },
    fecha: { type: Date, required: true },
    varianza: { type: Number, required: true }
}, { _id: false });
const PrecioSchema = new mongoose_1.default.Schema({
    subcategoriaCatalogoId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'SubcategoriaCatalogo', required: true },
    clienteId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Cliente', required: true },
    dependenciaId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Dependencia', default: null },
    sucursalId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Sucursal', default: null },
    valorBruto: { type: Number, required: true },
    impuesto: { type: Number, required: true },
    moneda: { type: String, required: true },
    valor: { type: Number, required: true },
    historial: [HistorialSchema],
    fechaDesde: { type: Date, default: Date.now },
}, { timestamps: true });
const Precio = mongoose_1.default.models.Precio || mongoose_1.default.model('Precio', PrecioSchema);
exports.default = Precio;
