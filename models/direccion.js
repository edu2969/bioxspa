import mongoose from 'mongoose';

const DireccionSchema = new mongoose.Schema({
    nombre: { type: String },
    apiId: { type: String },
    latitud: { type: Number },
    longitud: { type: Number },    
    categoria: { type: String }
});

const Direccion = mongoose.models.Direccion || mongoose.model('Direccion', DireccionSchema);

export default Direccion;