"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const CategoriaCatalogoSchema = new mongoose_1.default.Schema({
    nombre: { type: String, required: true },
    descripcion: { type: String, default: null },
    seguir: { type: Boolean, default: false },
    urlImagen: { type: String, required: true },
    tipo: { type: Number },
    gas: { type: String },
    elemento: { type: String },
    esIndustrial: { type: Boolean },
    esMedicinal: { type: Boolean },
}, { timestamps: true });
const CategoriaCatalogo = mongoose_1.default.models.CategoriaCatalogo || mongoose_1.default.model('CategoriaCatalogo', CategoriaCatalogoSchema);
exports.default = CategoriaCatalogo;
