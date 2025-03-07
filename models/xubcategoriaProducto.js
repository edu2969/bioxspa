import mongoose from 'mongoose';

const subcategoriaProductoSchema = new mongoose.Schema({
    id: { type: String, required: true },
    nombre: { type: String, required: true },
    categoria_id: { type: String, required: true },
    arriendo: { type: String, default: null },
    url: { type: String },
    deleted_at: { type: Date, default: null },
    created_at: { type: Date },
    updated_at: { type: Date }
});

const XubcategoriaProducto = mongoose.models.XubcategoriaProducto || mongoose.model('XubcategoriaProducto', subcategoriaProductoSchema);

export default XubcategoriaProducto;