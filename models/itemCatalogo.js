import mongoose from 'mongoose';

const ItemCatalogoSchema = new mongoose.Schema({
    temporalId: { type: String },
    codigo: { type: String },    
    estado: { type: Number, default: 0 },
    subcategoriaCatalogoId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubcategoriaCatalogo', required: true },
    subcategoriaCatalogoIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'SubcategoriaCatalogo' },
    nombre: { type: String, default: null },
    descripcion: { type: String, default: null },
    descripcionCorta: { type: String, default: null },    
    fichaTecnica: { type: String, default: null },
    urlFichaTecnica: { type: String, default: null },
    urlImagen: { type: String, default: null },
    garantiaAnual: { type: Number, default: 0 },
    destacado: { type: Boolean, default: false },
    stockMinimo: { type: Number, default: 0 },
    stockActual: { type: Number, required: true },
    visible: { type: Boolean, default: true },
    url: { type: String },
    tipo: { type: Number, required: false },
    direccionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Direccion', required: false },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', required: false },
}, { timestamps: true });

const ItemCatalogo = mongoose.models.ItemCatalogo || mongoose.model('ItemCatalogo', ItemCatalogoSchema);

export default ItemCatalogo;