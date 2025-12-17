import mongoose from 'mongoose';

const DetalleVentaSchema = new mongoose.Schema({
    temporalId: { type: String },
    ventaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venta', required: true },
    glosa: { type: String },
    codigo: { type: String },
    codigoProducto: { type: String },
    codigoCilindro: { type: String, default: null },
    subcategoriaCatalogoId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'SubcategoriaCatalogo', 
        default: null 
    },
    itemCatalogoIds: { 
        type: [mongoose.Schema.Types.ObjectId], 
        ref: 'ItemCatalogo', 
        default: []
    },
    tipo: { type: Number }, // 1: pedido, 2: retiro
    cantidad: { type: Number, required: true },
    especifico: { type: Number },
    neto: { type: Number, required: true },
    iva: { type: Number, required: true },
    total: { type: Number, required: true }
}, { timestamps: true });

const DetalleVenta = mongoose.models.DetalleVenta || mongoose.model('DetalleVenta', DetalleVentaSchema);

export default DetalleVenta;