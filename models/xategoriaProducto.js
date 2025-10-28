import mongoose from 'mongoose';

const XategoriaProductoSchema = new mongoose.Schema({
    id: { type: String, required: true },
    nombre: { type: String, required: true },
    seguir: { type: String },
    url: { type: String, required: true },
    deleted_at: { type: Date, default: null },
    created_at: { type: Date },
    updated_at: { type: Date }
});

const XategoriaProducto = mongoose.models.XategoriaProducto || mongoose.model('XategoriaProducto', XategoriaProductoSchema);

export default XategoriaProducto;