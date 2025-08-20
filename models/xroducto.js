import mongoose, { models } from "mongoose";

// filepath: d:/git/bioxspa/models/producto.js

const productoSchema = new mongoose.Schema({
    id: { type: String, required: true },
    codigo: { type: String },
    codigo_proveedor: { type: String, default: null },
    estado: { type: String, default: null },
    propiedad: { type: String },
    rut: { type: String, default: null },
    fecha_mantencion: { type: Date, default: null },
    afecta_stock: { type: Boolean, default: null },
    categoria_id: { type: String },
    subcategoria_id: { type: String },
    nombre: { type: String, default: null },
    descripcion: { type: String, default: null },
    breve: { type: String, default: null },
    valor_arriendo: { type: Number, default: null },
    precio1: { type: Number },
    precio2: { type: Number },
    precio3: { type: Number },
    registra: { type: String },
    costo: { type: Number, default: null },
    nivel: { type: String, default: null },
    afecto: { type: Boolean, default: null },
    fichatecnica: { type: String, default: null },
    garantia: { type: String, default: null },
    destacado: { type: Boolean, default: null },
    stockminimo: { type: Number, default: null },
    visible: { type: String },
    stock_producto: { type: Number, default: null },
    url: { type: String },
    deleted_at: { type: Date, default: null },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

const Xroducto = models.Xroducto || mongoose.model('Xroducto', productoSchema);
export default Xroducto;