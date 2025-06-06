import mongoose from 'mongoose';

const XetalleVentaSchema = new mongoose.Schema({
    id: { type: String, required: true },
    codigo: { type: String },
    codigoproducto: { type: String },
    cod_cilindro: { type: String, default: null },
    producto: { type: String, required: true },
    producto_id: { type: String, default: null },
    producto_cliente_id: { type: String, default: null },
    tipo: { 
        type: String, 
        enum: ['pedido', 'retiro', null], 
        default: null 
    },
    cantidad: { type: Number, required: true },
    especifico: { type: Number, required: true },
    neto: { type: Number, required: true },
    iva: { type: Number, required: true },
    total: { type: Number, required: true },
    deleted_at: { type: Date, default: null },
    created_at: { type: Date },
    updated_at: { type: Date }
});

const XetalleVenta = mongoose.models.XetalleVenta || mongoose.model('XetalleVenta', XetalleVentaSchema);

export default XetalleVenta;