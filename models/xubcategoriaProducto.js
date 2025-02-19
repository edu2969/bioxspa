import mongoose from 'mongoose';

const XubcategoriaProductoSchema = new mongoose.Schema({
    id: { type: String, required: true },
    nombre: { type: String, required: true },
    categoria_id: { type: String, required: true },
    arriendo: { type: String, default: null },
    url: { type: String, required: true },
    deleted_at: { type: Date, default: null },
    created_at: { type: Date },
    updated_at: { type: Date }
});

const XubcategoriaProducto = mongoose.models.XubcategoriaProducto || mongoose.model('XubcategoriaProducto', XubcategoriaProductoSchema);

export default XubcategoriaProducto;