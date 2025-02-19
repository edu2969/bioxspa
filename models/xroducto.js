import mongoose from 'mongoose';

const XroductoSchema = new mongoose.Schema({
    id: { type: String },
    codigo: { type: String },
    codigo_proveedor: { type: String, default: null },
    estado: { type: String, default: null },
    propiedad: { type: String },
    rut: { type: String, default: null },
    fecha_mantencion: { type: Date, default: null },
    afecta_stock: { type: String, default: null },
    categoria_id: { type: String },
    subcategoria_id: { type: String },
    nombre: { type: String, default: null },
    descripcion: { type: String, default: null },
    breve: { type: String, default: null },
    valor_arriendo: { type: String, default: null },
    precio1: { type: String },
    precio2: { type: String, default: null },
    precio3: { type: String, default: null },
    registra: { type: String },
    costo: { type: String, default: null },
    nivel: { type: String, default: null },
    afecto: { type: String, default: null },
    fichatecnica: { type: String, default: null },
    garantia: { type: String, default: null },
    destacado: { type: String, default: null },
    stockminimo: { type: String, default: null },
    visible: { type: String },
    stock_producto: { type: String, default: null },
    url: { type: String },
    deleted_at: { type: Date, default: null },
    created_at: { type: Date },
    updated_at: { type: Date }
});

const Xroducto = mongoose.models.XroductoSchema || mongoose.model('Xroducto', XroductoSchema);

export default Xroducto;