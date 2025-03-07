import mongoose from 'mongoose';

const SubcategoriaCatalogoSchema = new mongoose.Schema({
    temporalId: { type: String },
    nombre: { type: String, required: true },
    categoriaCatalogoId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'CategoriaCatalogo', 
        required: true 
    },
    cantidad: { type: Number },
    unidad: { type: String },
    nombreGas: { type: String },
    sinSifon: { type: Boolean, default: false },    
    urlImagen: { type: String, default: null },
}, {
    timestamps: true
});

const SubcategoriaCatalogo = mongoose.models.SubcategoriaCatalogo || mongoose.model('SubcategoriaCatalogo', SubcategoriaCatalogoSchema);
export default SubcategoriaCatalogo;