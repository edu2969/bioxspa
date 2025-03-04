import mongoose from 'mongoose';

const CategoriaCatalogoSchema = new mongoose.Schema({
    tipo: { type: Number, required: true },
    nombre: { type: String, required: true },
    descripcion: { type: String, default: null }
}, { timestamps: true });

const CategoriaCatalogo = mongoose.models.CategoriaCatalogo || mongoose.model('CategoriaCatalogo', CategoriaCatalogoSchema);

export default CategoriaCatalogo;