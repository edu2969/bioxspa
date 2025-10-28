import mongoose, { models } from "mongoose";

// filepath: d:/git/bioxspa/models/xubcategoriaProducto.js

const xubcategoriaProductoSchema = new mongoose.Schema({
    id: { type: String, required: true },
    nombre: { type: String, default: null },
    categoria_id: { type: String },
    arriendo: { type: Number, default: null },
    url: { type: String },
    deleted_at: { type: Date, default: null },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

const XubcategoriaProducto = models.XubcategoriaProducto || mongoose.model('XubcategoriaProducto', xubcategoriaProductoSchema);
export default XubcategoriaProducto;