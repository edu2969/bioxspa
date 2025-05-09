"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const DireccionSchema = new mongoose_1.default.Schema({
    nombre: { type: String },
    direccionOriginal: { type: String },
    apiId: { type: String },
    latitud: { type: Number },
    longitud: { type: Number },
    comuna: { type: String },
    ciudad: { type: String },
    region: { type: String },
    isoPais: { type: String, default: 'CL' },
    codigoPostal: { type: String },
    categoria: { type: String }
});
const Direccion = mongoose_1.default.models.Direccion || mongoose_1.default.model('Direccion', DireccionSchema);
exports.default = Direccion;
