import mongoose from 'mongoose';

const RegioneSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    codigo: { type: String },    
}, { timestamps: true });

const Regione = mongoose.models.Regione || mongoose.model('Regione', RegioneSchema);

export default Regione;