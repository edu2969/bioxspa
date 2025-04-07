import mongoose from 'mongoose';

const DetalleVentaSchema = new mongoose.Schema({
    temporalId: { type: String, required: true },
    ventaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venta', required: true },
    glosa: { type: String, required: true },
    codigo: { type: String },
    codigoProducto: { type: String },
    codigoCilindro: { type: String, default: null },
    subcategoriaCatalogoId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'SubcategoriaCatalogo', 
        default: null 
    },
    itemsCatalogoId: { 
        type: [mongoose.Schema.Types.ObjectId], 
        ref: 'ItemCatalogo', 
        default: null
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