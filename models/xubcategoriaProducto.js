import mongoose from 'mongoose';

const subcategoriaCatalogoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    categoriaId: { type: String, required: true },
    arriendo: { type: String, default: null },
    url: { type: String, required: true },
    deleted_at: { type: Date, default: null },
    created_at: { type: Date },
    updated_at: { type: Date }
});

const XubcategoriaProducto = mongoose.models.XubcategoriaProducto || mongoose.model('XubcategoriaProducto', subcategoriaProductoSchema);

export default XubcategoriaProducto;