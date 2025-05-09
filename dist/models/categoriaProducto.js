"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const CategoriaProductoSchema = new mongoose_1.default.Schema({
    id: { type: String, required: true },
    nombre: { type: String, required: true },
    seguir: { type: String },
    url: { type: String, required: true },
    deleted_at: { type: Date, default: null },
    created_at: { type: Date },
    updated_at: { type: Date }
});
const CategoriaProducto = mongoose_1.default.models.CategoriaProducto || mongoose_1.default.model('CategoriaProducto', CategoriaProductoSchema);
exports.default = CategoriaProducto;
