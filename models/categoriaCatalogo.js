import mongoose from 'mongoose';

const CategoriaCatalogoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    descripcion: { type: String, default: null },
    seguir: { type: Boolean, default: false },
    urlImagen: { type: String, required: true },
    tipo: { type: Number },
    gas: { type: String },
    elemento: { type: String },
    esIndustrial: { type: Boolean },
    esMedicinal: { type: Boolean },
}, { timestamps: true });

const CategoriaCatalogo = mongoose.models.CategoriaCatalogo || mongoose.model('CategoriaCatalogo', CategoriaCatalogoSchema);

export default CategoriaCatalogo;