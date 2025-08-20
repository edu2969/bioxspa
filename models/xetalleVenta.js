import mongoose, { Schema, models } from "mongoose";

// filepath: d:/git/bioxspa/models/xetalleVenta.js

const xetalleVentaSchema = new Schema({
    id: { type: String, required: true }, // obligatorio
    codigo: { type: String },
    codigoproducto: { type: String },
    cod_cilindro: { type: String, default: null },
    producto: { type: String },
    producto_id: { type: String, default: null },
    producto_cliente_id: { type: String, default: null },
    tipo: { type: String, default: null },
    cantidad: { type: String },
    especifico: { type: String },
    neto: { type: String },
    iva: { type: String },
    total: { type: String },
    deleted_at: { type: Date, default: null },
    created_at: { type: Date },
    updated_at: { type: Date }
}, {
    timestamps: false
});

const XetalleVenta = models.XetalleVenta || mongoose.model("XetalleVenta", xetalleVentaSchema);
export default XetalleVenta;
