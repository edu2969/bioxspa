import mongoose from 'mongoose';

const DireccionSchema = new mongoose.Schema({
    nombre: { type: String },
    direccionOriginal: { type: String },
    apiId: { type: String },
    latitud: { type: Number },
    longitud: { type: Number },
    comuna: { type: String },
    ciudad: { type: String },
    region: { type: String },
    isoPais: { type: String, default: 'CL' },
    codigoPostal: { type: String },
    categoria: { type: String },
    comentario: { type: String },
});

const Direccion = mongoose.models.Direccion || mongoose.model('Direccion', DireccionSchema);

export default Direccion;