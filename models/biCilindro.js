import mongoose, { Schema, models } from "mongoose";

const subcategoriaSchema = new mongoose.Schema({
    subcategoriaCatalogoId: { type: mongoose.Types.ObjectId, ref: "SubcategoriaCatalogo", required: true },
    vacios: { type: Number, default: 0 },
    llenos: { type: Number, default: 0 },
}, { _id: false });

const categoriaSchema = new mongoose.Schema({
    categoriaCatalogoId: { type: mongoose.Types.ObjectId, ref: "CategoriaCatalogo", required: true },
    vacios: { type: Number, default: 0 },
    llenos: { type: Number, default: 0 },
    subcategorias: [subcategoriaSchema],
}, { _id: false });

const biCilindroSchema = new Schema({    
    clienteId: { type: mongoose.Types.ObjectId, ref: "Cliente", required: true },
    direccionId: { type: mongoose.Types.ObjectId, ref: "Direccion", required: true },
    vacios: { type: Number, default: 0 },
    llenos: { type: Number, default: 0 },
    categorias: [categoriaSchema]
});

const BICilindro = models.BICilindro || mongoose.model("BICilindro", biCilindroSchema);
export default BICilindro;