"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const SubcategoriaCatalogoSchema = new mongoose_1.default.Schema({
    temporalId: { type: String },
    nombre: { type: String, required: true },
    categoriaCatalogoId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'CategoriaCatalogo',
        required: true
    },
    cantidad: { type: Number },
    unidad: { type: String },
    nombreGas: { type: String },
    sinSifon: { type: Boolean, default: false },
    urlImagen: { type: String, default: null },
}, {
    timestamps: true
});
const SubcategoriaCatalogo = mongoose_1.default.models.SubcategoriaCatalogo || mongoose_1.default.model('SubcategoriaCatalogo', SubcategoriaCatalogoSchema);
exports.default = SubcategoriaCatalogo;
