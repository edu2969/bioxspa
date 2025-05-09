"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const ItemCatalogoSchema = new mongoose_1.default.Schema({
    temporalId: { type: String },
    codigo: { type: String },
    subcategoriaCatalogoId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'SubcategoriaCatalogo', required: true },
    subcategoriaCatalogoIds: { type: [mongoose_1.default.Schema.Types.ObjectId], ref: 'SubcategoriaCatalogo' },
    nombre: { type: String, default: null },
    descripcion: { type: String, default: null },
    descripcionCorta: { type: String, default: null },
    fichaTecnica: { type: String, default: null },
    urlFichaTecnica: { type: String, default: null },
    urlImagen: { type: String, default: null },
    garantiaAnual: { type: Number, default: 0 },
    destacado: { type: Boolean, default: false },
    stockMinimo: { type: Number, default: 0 },
    stockActual: { type: Number, required: true },
    visible: { type: Boolean, default: true },
    url: { type: String }
}, { timestamps: true });
const ItemCatalogo = mongoose_1.default.models.ItemCatalogo || mongoose_1.default.model('ItemCatalogo', ItemCatalogoSchema);
exports.default = ItemCatalogo;
