import mongoose from 'mongoose';

const SubcategoriaCatalogoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    tipo: { type: Number, required: true }, // 1: Catalogo, 2: Servicio, 3: Mixto
    categoriaCatalogoId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'CategoriaCatalogo', 
        required: true 
    },
    urlImagen: { type: String, required: true }
}, {
    timestamps: true
});

const SubcategoriaCatalogo = mongoose.models.SubcategoriaCatalogo || mongoose.model('SubcategoriaCatalogo', SubcategoriaCatalogoSchema);
export default SubcategoriaCatalogo;