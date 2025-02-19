import mongoose from 'mongoose';

const DetalleVentaSchema = new mongoose.Schema({
    id: { type: String, required: true },
    codigo: { type: String },
    codigoproducto: { type: String },
    cod_cilindro: { type: String, default: null },
    producto: { type: String, required: true },
    producto_id: { type: String, default: null },
    producto_cliente_id: { type: String, default: null },
    tipo: { type: String, default: null },
    cantidad: { type: String, required: true },
    especifico: { type: String, required: true },
    neto: { type: String, required: true },
    iva: { type: String, required: true },
    total: { type: String, required: true },
    deleted_at: { type: Date, default: null },
    created_at: { type: Date },
    updated_at: { type: Date }
});

const DetalleVenta = mongoose.models.DetalleVenta || mongoose.model('DetalleVenta', DetalleVentaSchema);

export default DetalleVenta;